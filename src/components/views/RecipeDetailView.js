/**
 * Recipe Detail View
 * Handles rendering and interactions for a single recipe
 */

import { RecipeDisplayComponent } from '../RecipeDisplayComponent.js';

export class RecipeDetailView {
  constructor(container, { serviceRegistry }) {
    this.container = container;
    this.serviceRegistry = serviceRegistry;
    this.apiService = serviceRegistry.get('api');
  }

  async render(suggestion) {
    this.showLoading();

    try {
      const recipeSuggestionService = this.serviceRegistry.get('recipeSuggestion');
      const fullRecipe = await recipeSuggestionService.generateFullRecipe(suggestion.id);

      // Use RecipeDisplayComponent for consistent display
      const customActions = `
        <button class="japandi-btn japandi-btn-subtle save-favorite-btn" type="button">⭐ Save</button>
        <button class="japandi-btn japandi-btn-primary back-to-suggestions-btn" type="button">🔄 Back to Suggestions</button>
      `;
      
      RecipeDisplayComponent.render(
        this.container, 
        fullRecipe, 
        { title: fullRecipe.title, customActions }
      );
      
      this.setupActions(fullRecipe);
    } catch (error) {
      console.error('Failed to generate full recipe:', error);
      this.showError('Failed to generate recipe');
    }
  }

  showLoading() {
    this.container.innerHTML = `
      <div class="suggestions-loading">
        <div class="loading-spinner"></div>
        <p>Generating full recipe...</p>
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


  setupActions(fullRecipe) {
    const saveBtn = this.container.querySelector('.save-favorite-btn');
    const backBtn = this.container.querySelector('.back-to-suggestions-btn');

    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        try {
          saveBtn.disabled = true;
          saveBtn.textContent = 'Saving...';

          await this.apiService.saveFavorite({
            recipeText: fullRecipe.recipeText,
            title: fullRecipe.title || 'Untitled Recipe',
            rating: null,
            note: null
          });

          saveBtn.textContent = '✅ Saved';

          setTimeout(() => {
            saveBtn.textContent = '⭐ Save';
            saveBtn.disabled = false;
          }, 2000);

        } catch (error) {
          console.error('Failed to save favorite:', error);
          saveBtn.textContent = '⭐ Save';
          saveBtn.disabled = false;
        }
      });
    }

    if (backBtn) {
      backBtn.addEventListener('click', () => {
        // Emit event to go back to suggestions
        this.container.dispatchEvent(new CustomEvent('backToSuggestions'));
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
      this.container.innerHTML = '';
    }
  }
}
