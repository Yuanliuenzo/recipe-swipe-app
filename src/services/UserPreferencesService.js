export class UserPreferencesService {
  constructor(stateManager, apiService, navigationService = null) {
    this.stateManager = stateManager;
    this.api = apiService;
    this.navigationService = navigationService;
    this.initialized = false;
    this.loadingPromise = null; // prevents race conditions
  }

  /* ===============================
     INITIALIZATION
  =============================== */

  async initialize() {
    if (this.initialized) {
      return;
    }

    await this.ensureLoaded();
    this.initialized = true;
  }

  async ensureLoaded() {
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = this.loadUserPreferences().finally(() => {
      this.loadingPromise = null;
    });

    return this.loadingPromise;
  }

  /* ===============================
     LOAD
  =============================== */

  async loadUserPreferences() {
    try {
      const response = await fetch("/api/preferences", {
        credentials: "include"
      });

      if (!response.ok) {
        if (response.status === 401) {
          return this.setDefaults();
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data || typeof data.preferences !== "object") {
        throw new Error("Invalid preferences response shape");
      }

      const preferences = this.normalize(data.preferences);

      this.stateManager.setState({ preferences });

      console.log("✅ Preferences loaded:", preferences);

      return preferences;
    } catch (error) {
      console.error("❌ Failed to load preferences:", error);
      return this.setDefaults();
    }
  }

  /* ===============================
     SAVE
  =============================== */

  async saveUserPreferences(preferences) {
    const normalized = this.normalize(preferences);

    try {
      const response = await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(normalized)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      const updated = this.normalize(data.preferences);

      this.stateManager.setState({ preferences: updated });

      console.log("💾 Preferences saved:", updated);

      return updated;
    } catch (error) {
      console.error("❌ Save failed:", error);
      throw error;
    }
  }

  /* ===============================
     STATE HELPERS
  =============================== */

  normalize(prefs = {}) {
    return {
      diet: prefs.diet || "None",
      budget: prefs.budget || "No",
      seasonalKing: prefs.seasonalKing || "No",
      healthGoal: prefs.healthGoal || "balanced",
      cookingSkill: prefs.cookingSkill || "moderate"
    };
  }

  setDefaults() {
    const defaults = this.normalize();
    this.stateManager.setState({ preferences: defaults });
    return defaults;
  }

  getPreferences() {
    return this.stateManager.get("preferences");
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
    console.log("🔧 showPreferences() called");

    await this.ensureLoaded();
    const preferences = this.getPreferences();

    const screen = document.createElement("div");
    screen.className = "mobile-preferences-screen";
    screen.innerHTML = this.renderPreferencesHTML(preferences);

    // Close button
    screen
      .querySelector(".mobile-preferences-close")
      .addEventListener("click", () => {
        if (this.navigationService) {
          this.navigationService.go("main");
        }
      });

    // Wire chip interactions
    screen.querySelectorAll(".pref-chip[data-pref]").forEach(chip => {
      chip.addEventListener("click", () => this._handleChipClick(chip, screen));
    });

    // Wire toggle interactions
    screen.querySelectorAll(".toggle-switch[data-pref]").forEach(toggle => {
      toggle.addEventListener("click", () =>
        this._handleToggleClick(toggle, screen)
      );
    });

    if (this.navigationService) {
      this.navigationService.renderPreferences(screen);
    } else {
      console.error(
        "❌ UserPreferencesService: navigationService not set — preferences cannot be rendered"
      );
    }
    console.log("✅ Preferences screen rendered");
  }

  _handleChipClick(chip, screen) {
    const prefKey = chip.dataset.pref;
    const value = chip.dataset.value;
    const isMulti = chip.dataset.multi === "true";

    if (isMulti) {
      // Diet multi-select
      if (value === "None") {
        // Clear all, select only None
        screen
          .querySelectorAll(`.pref-chip[data-pref="${prefKey}"]`)
          .forEach(c => {
            c.classList.toggle("selected", c.dataset.value === "None");
          });
        this._autoSave("diet", "None", screen);
      } else {
        // Deselect None, toggle this chip
        screen
          .querySelectorAll(
            `.pref-chip[data-pref="${prefKey}"][data-value="None"]`
          )
          .forEach(c => {
            c.classList.remove("selected");
          });
        chip.classList.toggle("selected");

        // Collect selected values
        const selected = [
          ...screen.querySelectorAll(
            `.pref-chip[data-pref="${prefKey}"].selected`
          )
        ]
          .map(c => c.dataset.value)
          .filter(v => v !== "None");

        // If nothing selected, fall back to None
        if (selected.length === 0) {
          screen
            .querySelectorAll(
              `.pref-chip[data-pref="${prefKey}"][data-value="None"]`
            )
            .forEach(c => {
              c.classList.add("selected");
            });
          this._autoSave("diet", "None", screen);
        } else {
          this._autoSave("diet", selected.join(","), screen);
        }
      }
    } else {
      // Single-select: deselect siblings, select this one
      screen
        .querySelectorAll(`.pref-chip[data-pref="${prefKey}"]`)
        .forEach(c => {
          c.classList.remove("selected");
        });
      chip.classList.add("selected");
      this._autoSave(prefKey, value, screen);
    }
  }

  _handleToggleClick(toggle, screen) {
    const isActive = toggle.classList.toggle("active");
    this._autoSave(toggle.dataset.pref, isActive ? "Yes" : "No", screen);
  }

  async _autoSave(key, value, screen) {
    try {
      await this.updatePreference(key, value);
      const savedEl = screen.querySelector(".pref-saved");
      if (savedEl) {
        savedEl.classList.add("show");
        clearTimeout(this._savedTimeout);
        this._savedTimeout = setTimeout(
          () => savedEl.classList.remove("show"),
          1500
        );
      }
    } catch {
      // silent — user can try again
    }
  }

  renderPreferencesHTML(preferences) {
    // Parse diet multi-select (stored as comma-separated)
    const selectedDiets = (preferences.diet || "None")
      .split(",")
      .map(d => d.trim())
      .filter(Boolean);

    const dietChips = [
      { value: "None", label: "None" },
      { value: "Vegetarian", label: "Vegetarian" },
      { value: "Vegan", label: "Vegan" },
      { value: "Gluten-Free", label: "Gluten-Free" },
      { value: "Dairy-Free", label: "Dairy-Free" },
      { value: "Nut-Free", label: "Nut-Free" }
    ]
      .map(({ value, label }) => {
        const sel = selectedDiets.includes(value) ? " selected" : "";
        return `<button class="pref-chip${sel}" data-pref="diet" data-value="${value}" data-multi="true">${label}</button>`;
      })
      .join("");

    const healthChips = ["indulgent", "balanced", "light"]
      .map(v => {
        const labels = {
          indulgent: "🍖 Indulgent",
          balanced: "⚖️ Balanced",
          light: "🥗 Light"
        };
        const sel = preferences.healthGoal === v ? " selected" : "";
        return `<button class="pref-chip${sel}" data-pref="healthGoal" data-value="${v}">${labels[v]}</button>`;
      })
      .join("");

    const skillChips = ["easy", "moderate", "involved"]
      .map(v => {
        const labels = {
          easy: "🌱 Easy",
          moderate: "👨‍🍳 Moderate",
          involved: "🔪 Involved"
        };
        const sel = preferences.cookingSkill === v ? " selected" : "";
        return `<button class="pref-chip${sel}" data-pref="cookingSkill" data-value="${v}">${labels[v]}</button>`;
      })
      .join("");

    const budgetActive = preferences.budget === "Yes" ? " active" : "";
    const seasonalActive = preferences.seasonalKing === "Yes" ? " active" : "";

    return `
      <div class="mobile-preferences-header">
        <button class="mobile-preferences-close">←</button>
        <h2>Preferences</h2>
        <span class="pref-saved">Saved ✓</span>
      </div>

      <div class="pref-body">

        <p class="pref-section-label">Eating</p>
        <div class="pref-card">
          <div class="pref-chip-row">
            <span class="pref-chip-row-label">🥗 Dietary needs</span>
            <div class="pref-chip-group">${dietChips}</div>
          </div>
          <div class="pref-chip-row">
            <span class="pref-chip-row-label">🍽️ Calorie focus</span>
            <div class="pref-chip-group">${healthChips}</div>
          </div>
        </div>

        <p class="pref-section-label">Cooking</p>
        <div class="pref-card">
          <div class="pref-chip-row">
            <span class="pref-chip-row-label">👨‍🍳 Skill level</span>
            <div class="pref-chip-group">${skillChips}</div>
          </div>
        </div>

        <p class="pref-section-label">Priorities</p>
        <div class="pref-card">
          <div class="pref-toggle-row">
            <div class="pref-toggle-info">
              <div class="pref-toggle-title">💰 Budget-friendly</div>
              <div class="pref-toggle-desc">Prefer everyday ingredients</div>
            </div>
            <div class="toggle-switch${budgetActive}" data-pref="budget"></div>
          </div>
          <div class="pref-toggle-row">
            <div class="pref-toggle-info">
              <div class="pref-toggle-title">🌿 Seasonal cooking</div>
              <div class="pref-toggle-desc">Lean toward what's in season</div>
            </div>
            <div class="toggle-switch${seasonalActive}" data-pref="seasonalKing"></div>
          </div>
        </div>

      </div>
    `;
  }

  /* ===============================
     UX
  =============================== */

  showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  }
}
