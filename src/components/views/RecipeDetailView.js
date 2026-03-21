/**
 * Recipe Detail View
 * Handles rendering and interactions for a single recipe
 */

import { RecipeDisplayComponent } from "../RecipeDisplayComponent.js";

export class RecipeDetailView {
  constructor(container, { serviceRegistry }) {
    this.container = container;
    this.serviceRegistry = serviceRegistry;
    this.apiService = serviceRegistry.get("api");
  }

  async render(suggestion) {
    const streamEl = this.showStreaming(suggestion.title);
    const recipeSuggestionService =
      this.serviceRegistry.get("recipeSuggestion");

    try {
      const fullRecipe = await recipeSuggestionService.generateFullRecipe(
        suggestion.id,
        (_token, fullText) => {
          // Update the live preview with each token
          streamEl.textContent = fullText;
        }
      );

      const customActions = `
        <button class="japandi-btn japandi-btn-subtle save-favorite-btn" type="button">⭐ Save</button>
        <button class="japandi-btn japandi-btn-primary back-to-suggestions-btn" type="button">← Back</button>
      `;

      RecipeDisplayComponent.render(this.container, fullRecipe, {
        title: fullRecipe.title,
        customActions
      });

      this.setupActions(fullRecipe);
    } catch (error) {
      console.error("Failed to generate full recipe:", error);
      this.showError(suggestion);
    }
  }

  showStreaming(title) {
    this.container.innerHTML = `
      <div class="recipe-stream-container">
        <div class="recipe-stream-header">
          <span class="recipe-stream-title">${title}</span>
          <span class="recipe-stream-cursor"></span>
        </div>
        <pre class="recipe-stream-body"></pre>
      </div>
    `;
    return this.container.querySelector(".recipe-stream-body");
  }

  showError(suggestion) {
    this.container.innerHTML = `
      <div class="suggestions-loading">
        <p style="margin-bottom: 16px;">Something went wrong generating this recipe.</p>
        <button class="japandi-btn japandi-btn-primary retry-btn" type="button" style="margin-bottom: 10px;">Try Again</button>
        <button class="japandi-btn japandi-btn-subtle back-to-suggestions-btn" type="button">← Back to Suggestions</button>
      </div>
    `;

    const retryBtn = this.container.querySelector(".retry-btn");
    if (retryBtn && suggestion) {
      retryBtn.addEventListener("click", () => this.render(suggestion));
    }

    const backBtn = this.container.querySelector(".back-to-suggestions-btn");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        this.container.dispatchEvent(new CustomEvent("backToSuggestions"));
      });
    }
  }

  setupActions(fullRecipe) {
    const saveBtn = this.container.querySelector(".save-favorite-btn");
    const backBtn = this.container.querySelector(".back-to-suggestions-btn");

    if (saveBtn) {
      saveBtn.addEventListener("click", async () => {
        try {
          saveBtn.disabled = true;
          saveBtn.textContent = "Saving...";

          await this.apiService.saveFavorite({
            recipeText: fullRecipe.recipeText,
            title: fullRecipe.title || "Untitled Recipe",
            rating: null,
            note: null
          });

          saveBtn.textContent = "✅ Saved";

          setTimeout(() => {
            saveBtn.textContent = "⭐ Save";
            saveBtn.disabled = false;
          }, 2000);
        } catch (error) {
          console.error("Failed to save favorite:", error);
          saveBtn.textContent = "⭐ Save";
          saveBtn.disabled = false;
        }
      });
    }

    if (backBtn) {
      backBtn.addEventListener("click", () => {
        // Emit event to go back to suggestions
        this.container.dispatchEvent(new CustomEvent("backToSuggestions"));
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
    // Cleanup event listeners and DOM
    if (this.container) {
      this.container.innerHTML = "";
    }
  }
}
