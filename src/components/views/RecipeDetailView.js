/**
 * Recipe Detail View
 * Handles rendering and interactions for a single recipe
 */

import { RecipeFormatter } from '../../shared/RecipeFormatter.js';

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

      // Use RecipeFormatter like FavoritesService does
      const formatted = RecipeFormatter.format(fullRecipe.recipeText.recipe);

      this.container.innerHTML = `
        <div class="recipe-detail-header">
          <h2>${fullRecipe.title}</h2>
        </div>
        
        ${formatted.hasIngredients && formatted.hasInstructions ? `
          <div class="mobile-recipe-toggle">
            <button class="mobile-recipe-toggle-btn active" data-target="ingredients">
              Ingredients
            </button>
            <button class="mobile-recipe-toggle-btn" data-target="instructions">
              Instructions
            </button>
          </div>
        ` : ''}

        <div class="mobile-recipe-content">
          ${formatted.html}
        </div>
        
        <div class="recipe-actions">
          <button class="japandi-btn japandi-btn-subtle save-favorite-btn" type="button">⭐ Save</button>
          <button class="japandi-btn japandi-btn-primary back-to-suggestions-btn" type="button">🔄 Back to Suggestions</button>
        </div>
      `;
      
      this.setupActions(fullRecipe);
      this.setupToggleLogic(formatted);
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

  setupToggleLogic(formatted) {
    // Toggle logic (same as FavoritesService)
    if (formatted.hasIngredients && formatted.hasInstructions) {
      const content = this.container.querySelector('.mobile-recipe-content');
      const buttons = this.container.querySelectorAll('.mobile-recipe-toggle-btn');

      // Initially hide instructions, show ingredients
      content.querySelectorAll('[data-recipe-section]').forEach(section => {
        const isActive = section.dataset.recipeSection === 'ingredients';
        section.classList.toggle('is-active', isActive);
      });

      buttons.forEach(btn => {
        btn.addEventListener('click', () => {
          const target = btn.dataset.target;

          buttons.forEach(b =>
            b.classList.toggle('active', b.dataset.target === target)
          );

          content.querySelectorAll('[data-recipe-section]').forEach(section => {
            const isActive = section.dataset.recipeSection === target;
            section.classList.toggle('is-active', isActive);
          });

          // Scroll to top when toggling
          content.scrollTop = 0;
        });
      });
    }
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
