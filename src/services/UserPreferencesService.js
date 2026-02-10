// User Preferences Service
// Manages user preferences with state management and API integration

export class UserPreferencesService {
  constructor(stateManager, apiService) {
    this.stateManager = stateManager;
    this.api = apiService;
  }
  
  async initialize() {
    try {
      console.log('🔧 Initializing User Preferences Service...');
      
      // Load preferences from state or API
      const state = this.stateManager.getState();
      if (!state.preferences) {
        await this.loadUserPreferences();
      }
      
      console.log('✅ User Preferences Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize User Preferences Service:', error);
      throw error;
    }
  }
  
  async loadUserPreferences() {
    try {
      const data = await this.api.getUserData();
      const preferences = data.preferences || {
        diet: 'None',
        budget: 'No',
        seasonalKing: 'No'
      };
      
      this.stateManager.setState({ preferences });
      console.log('📋 Preferences loaded:', preferences);
      return preferences;
    } catch (error) {
      console.error('❌ Failed to load preferences:', error);
      throw error;
    }
  }
  
  async saveUserPreferences(preferences) {
    try {
      await this.api.updatePreferences(preferences);
      this.stateManager.setState({ preferences });
      console.log('💾 Preferences saved:', preferences);
      return preferences;
    } catch (error) {
      console.error('❌ Failed to save preferences:', error);
      throw error;
    }
  }
  
  getPreferences() {
    return this.stateManager.get('preferences');
  }
  
  updatePreference(key, value) {
    const current = this.getPreferences();
    const updated = { ...current, [key]: value };
    return this.saveUserPreferences(updated);
  }
  
  // Show preferences modal
  showPreferences() {
    try {
      const preferences = this.getPreferences();
      
      // Create preferences modal
      const modal = document.createElement('div');
      modal.className = 'preferences-modal';
      modal.innerHTML = `
        <div class="modal-content">
          <h2>Preferences</h2>
          <div class="preference-group">
            <label>Dietary Restrictions:</label>
            <select id="diet-select">
              <option value="None" ${preferences.diet === 'None' ? 'selected' : ''}>None</option>
              <option value="Vegetarian" ${preferences.diet === 'Vegetarian' ? 'selected' : ''}>Vegetarian</option>
              <option value="Vegan" ${preferences.diet === 'Vegan' ? 'selected' : ''}>Vegan</option>
              <option value="Gluten-Free" ${preferences.diet === 'Gluten-Free' ? 'selected' : ''}>Gluten-Free</option>
            </select>
          </div>
          <div class="preference-group">
            <label>Budget:</label>
            <select id="budget-select">
              <option value="No" ${preferences.budget === 'No' ? 'selected' : ''}>No</option>
              <option value="Yes" ${preferences.budget === 'Yes' ? 'selected' : ''}>Yes</option>
            </select>
          </div>
          <div class="preference-group">
            <label>Seasonal King:</label>
            <select id="seasonal-select">
              <option value="No" ${preferences.seasonalKing === 'No' ? 'selected' : ''}>No</option>
              <option value="Yes" ${preferences.seasonalKing === 'Yes' ? 'selected' : ''}>Yes</option>
            </select>
          </div>
          <div class="modal-actions">
            <button onclick="window.recipeApp.services.userPreferences.saveFromModal()">Save</button>
            <button onclick="this.closest('.preferences-modal').remove()">Cancel</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
    } catch (error) {
      console.error('❌ Failed to show preferences:', error);
      throw error;
    }
  }
  
  // Save preferences from modal
  async saveFromModal() {
    try {
      const diet = document.getElementById('diet-select').value;
      const budget = document.getElementById('budget-select').value;
      const seasonalKing = document.getElementById('seasonal-select').value;
      
      const preferences = { diet, budget, seasonalKing };
      await this.saveUserPreferences(preferences);
      
      // Remove modal
      document.querySelector('.preferences-modal')?.remove();
      
      // Show success message
      this.showAlert('Preferences saved successfully!');
      
    } catch (error) {
      console.error('❌ Failed to save preferences from modal:', error);
      this.showAlert('Failed to save preferences');
    }
  }
  
  // Show alert message
  showAlert(message) {
    try {
      const modal = document.createElement('div');
      modal.className = 'alert-modal';
      modal.innerHTML = `
        <div class="modal-content">
          <p>${message}</p>
          <button onclick="this.closest('.alert-modal').remove()">OK</button>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Auto-remove after 3 seconds
      setTimeout(() => {
        modal.remove();
      }, 3000);
      
    } catch (error) {
      console.error('❌ Failed to show alert:', error);
      alert(message); // Fallback
    }
  }
}
