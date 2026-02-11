export class UserPreferencesService {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.initialized = false;
    this.loadingPromise = null; // prevents race conditions
  }

  /* ===============================
     INITIALIZATION
  =============================== */

  async initialize() {
    if (this.initialized) return;

    await this.ensureLoaded();
    this.initialized = true;
  }

  async ensureLoaded() {
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = this.loadUserPreferences()
        .finally(() => {
          this.loadingPromise = null;
        });

    return this.loadingPromise;
  }

  /* ===============================
     LOAD
  =============================== */

  async loadUserPreferences() {
    try {
      const response = await fetch('/api/preferences', {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          return this.setDefaults();
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data || typeof data.preferences !== 'object') {
        throw new Error('Invalid preferences response shape');
      }

      const preferences = this.normalize(data.preferences);

      this.stateManager.setState({ preferences });

      console.log('✅ Preferences loaded:', preferences);

      return preferences;

    } catch (error) {
      console.error('❌ Failed to load preferences:', error);
      return this.setDefaults();
    }
  }

  /* ===============================
     SAVE
  =============================== */

  async saveUserPreferences(preferences) {
    const normalized = this.normalize(preferences);

    try {
      const response = await fetch('/api/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(normalized)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      const updated = this.normalize(data.preferences);

      this.stateManager.setState({ preferences: updated });

      console.log('💾 Preferences saved:', updated);

      return updated;

    } catch (error) {
      console.error('❌ Save failed:', error);
      throw error;
    }
  }

  /* ===============================
     STATE HELPERS
  =============================== */

  normalize(prefs = {}) {
    return {
      diet: prefs.diet || 'None',
      budget: prefs.budget || 'No',
      seasonalKing: prefs.seasonalKing || 'No'
    };
  }

  setDefaults() {
    const defaults = this.normalize();
    this.stateManager.setState({ preferences: defaults });
    return defaults;
  }

  getPreferences() {
    return this.stateManager.get('preferences');
  }

  async updatePreference(key, value) {
    await this.ensureLoaded();
    const current = this.getPreferences();
    const updated = { ...current, [key]: value };
    return this.saveUserPreferences(updated);
  }

  /* ===============================
     UI
  =============================== */

  async showPreferences() {
    await this.ensureLoaded();

    const preferences = this.getPreferences();

    // Prevent duplicate screen
    if (document.querySelector('.mobile-preferences-fullscreen')) return;

    const container = document.querySelector('.mobile-container');
    if (container) container.style.display = 'none';

    const screen = document.createElement('div');
    screen.className = 'mobile-preferences-fullscreen';

    screen.innerHTML = this.renderPreferencesHTML(preferences);

    document.body.appendChild(screen);

    this.attachEvents(screen);
  }

  renderPreferencesHTML(preferences) {
    return `
      <button class="mobile-floating-back-btn">
        <span>←</span> Back
      </button>

      <div class="mobile-preferences-header">
        <h2>Preferences</h2>
      </div>

      <div class="mobile-preferences-content">

        ${this.renderRadioGroup(
        'Dietary Restrictions',
        'diet',
        ['None', 'Vegetarian', 'Vegan', 'Gluten-Free'],
        preferences.diet
    )}

        ${this.renderRadioGroup(
        'Budget',
        'budget',
        ['No', 'Yes'],
        preferences.budget
    )}

        ${this.renderRadioGroup(
        'Seasonal King',
        'seasonalKing',
        ['No', 'Yes'],
        preferences.seasonalKing
    )}

        <div class="mobile-preference-actions">
          <button class="mobile-save-btn">Save Preferences</button>
        </div>

      </div>
    `;
  }

  renderRadioGroup(title, name, options, selected) {
    return `
      <div class="mobile-preference-group">
        <h3>${title}</h3>
        <div class="mobile-preference-options">
          ${options.map(opt => `
            <label class="mobile-preference-option">
              <input type="radio" name="${name}" value="${opt}"
                ${selected === opt ? 'checked' : ''}>
              <span>${opt}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;
  }

  attachEvents(screen) {
    screen.querySelector('.mobile-floating-back-btn')
        .addEventListener('click', () => this.closePreferences());

    screen.querySelector('.mobile-save-btn')
        .addEventListener('click', () => this.saveFromModal(screen));
  }

  closePreferences() {
    const screen = document.querySelector('.mobile-preferences-fullscreen');
    if (screen) screen.remove();

    const container = document.querySelector('.mobile-container');
    if (container) container.style.display = '';
  }

  async saveFromModal(screen) {
    const diet = screen.querySelector('input[name="diet"]:checked')?.value;
    const budget = screen.querySelector('input[name="budget"]:checked')?.value;
    const seasonalKing = screen.querySelector('input[name="seasonalKing"]:checked')?.value;

    const preferences = this.normalize({ diet, budget, seasonalKing });

    try {
      await this.saveUserPreferences(preferences);
      this.closePreferences();
      this.showToast('Preferences saved successfully!');
    } catch {
      this.showToast('Failed to save preferences');
    }
  }

  /* ===============================
     UX
  =============================== */

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  }
}