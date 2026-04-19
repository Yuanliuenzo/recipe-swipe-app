/**
 * Recipe Suggestions View
 * Handles rendering and interactions for recipe suggestions grid
 */

export class RecipeSuggestionsView {
  constructor(container, { serviceRegistry }) {
    this.container = container;
    this.serviceRegistry = serviceRegistry;
    this.recipeSuggestionService = serviceRegistry.get("recipeSuggestion");
  }

  async render() {
    const existingSuggestions =
      this.recipeSuggestionService.stateManager.get("currentSuggestions") || [];

    if (existingSuggestions.length > 0) {
      this.container.innerHTML =
        this.recipeSuggestionService.createSuggestionsGrid(existingSuggestions);
      this.container.classList.add("suggestions-mode");
      this.setupInteractions();
    } else {
      this.showLoading();

      try {
        const suggestions =
          await this.recipeSuggestionService.generateSuggestions();
        this.container.innerHTML =
          this.recipeSuggestionService.createSuggestionsGrid(suggestions);
        this.container.classList.add("suggestions-mode");
        this.setupInteractions();

        // Pre-fetch all full recipes in the background (non-blocking).
        // Deduplication in generateFullRecipe ensures no duplicate Ollama calls
        // if the user clicks a recipe while pre-fetch is still in progress.
        this.recipeSuggestionService.preFetchAllRecipes();
      } catch (error) {
        console.error("Failed to generate suggestions:", error);
        this.showError("Failed to generate suggestions");
      }
    }
  }

  showLoading(message = "Getting suggestions...") {
    this.container.innerHTML = `
      <div class="suggestions-loading">
        <div class="loading-spinner"></div>
        <p>${message}</p>
        <p class="loading-subtitle">This may take 30+ seconds</p>
      </div>
    `;
  }

  showError(message) {
    this.container.innerHTML = `
      <div class="suggestions-loading">
        <p>❌ ${message}</p>
        <button class="japandi-btn japandi-btn-primary" onclick="location.reload()">Try Again</button>
      </div>
    `;
  }

  setupInteractions() {
    // Setup suggestion selection buttons
    this.container.querySelectorAll(".select-recipe-btn").forEach(btn => {
      btn.addEventListener("click", async e => {
        e.stopPropagation();

        if (navigator.vibrate) {
          navigator.vibrate([10, 50, 10]);
        }

        const originalText = btn.textContent;
        btn.innerHTML =
          '<span class="mobile-loading-spinner"></span> Generating...';
        btn.disabled = true;

        const suggestionId = btn.dataset.suggestionId;
        const suggestion =
          this.recipeSuggestionService.selectSuggestion(suggestionId);

        if (suggestion) {
          // Emit event to show recipe detail
          this.container.dispatchEvent(
            new CustomEvent("recipeSelected", {
              detail: { suggestion }
            })
          );
        }

        setTimeout(() => {
          btn.textContent = originalText;
          btn.disabled = false;
        }, 1000);
      });
    });

    // Setup "find restaurants" shortcut
    const eatOutBtn = this.container.querySelector(".eat-out-btn");
    if (eatOutBtn) {
      eatOutBtn.addEventListener("click", () => {
        if (window.nav) {
          window.nav.go("restaurants");
        }
      });
    }

    // Setup start-fresh button
    const startFreshBtn = this.container.querySelector(".start-fresh-btn");
    if (startFreshBtn) {
      startFreshBtn.addEventListener("click", () => {
        this.container.dispatchEvent(new CustomEvent("startFresh"));
      });
    }

    // Setup regenerate button
    const regenerateBtn = this.container.querySelector(".regenerate-btn");
    if (regenerateBtn) {
      regenerateBtn.addEventListener("click", async () => {
        if (navigator.vibrate) {
          navigator.vibrate([10, 30, 10]);
        }

        this.showLoading("Finding fresh recipe ideas for you...");

        // Clear cache so generateSuggestions fetches fresh results
        this.recipeSuggestionService.stateManager.setState({
          currentSuggestions: []
        });

        try {
          const suggestions =
            await this.recipeSuggestionService.generateSuggestions();
          this.container.innerHTML =
            this.recipeSuggestionService.createSuggestionsGrid(suggestions);
          this.container.classList.add("suggestions-mode");
          this.setupInteractions();
          this.recipeSuggestionService.preFetchAllRecipes();
        } catch (error) {
          console.error("Failed to regenerate suggestions:", error);
          this.showError("Failed to generate suggestions");
        }
      });
    }
  }

  on(eventType, callback) {
    this.container.addEventListener(eventType, callback);
  }

  off(eventType, callback) {
    this.container.removeEventListener(eventType, callback);
  }

  destroy() {
    if (this.container) {
      this.container.innerHTML = "";
    }
  }
}
