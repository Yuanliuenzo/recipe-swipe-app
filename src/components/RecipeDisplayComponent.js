/**
 * Recipe Display Component
 * Reusable component for displaying recipes with mobile toggle functionality
 */

import { RecipeFormatter } from '../shared/RecipeFormatter.js';

export class RecipeDisplayComponent {
  /**
   * Generate complete HTML for recipe display with toggle functionality
   * @param {Object} recipe - Recipe object with recipeText property
   * @param {Object} options - Additional options
   * @returns {Object} - { html, formatted, setupToggleLogic }
   */
  static generateRecipeHTML(recipe, options = {}) {
    const { title, showTitle = true, customActions = '' } = options;
    
    // Format the recipe
    const formatted = RecipeFormatter.format(recipe.recipeText.recipe);
    
    // Generate HTML
    const html = `
      ${showTitle ? `
        <div class="recipe-detail-header">
          <h2>${title || formatted.title}</h2>
        </div>
      ` : ''}
      
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
      
      ${customActions ? `
        <div class="recipe-actions">
          ${customActions}
        </div>
      ` : ''}
    `;

    return {
      html,
      formatted,
      setupToggleLogic: (container) => this.setupToggleLogic(container, formatted)
    };
  }

  /**
   * Setup toggle logic for mobile recipe display
   * @param {Element} container - Container element
   * @param {Object} formatted - Formatted recipe object
   */
  static setupToggleLogic(container, formatted) {
    if (!formatted.hasIngredients || !formatted.hasInstructions) {
      return;
    }

    const content = container.querySelector('.mobile-recipe-content');
    const buttons = container.querySelectorAll('.mobile-recipe-toggle-btn');

    if (!content || !buttons.length) {
      return;
    }

    // Initially hide instructions, show ingredients
    content.querySelectorAll('[data-recipe-section]').forEach(section => {
      const isActive = section.dataset.recipeSection === 'ingredients';
      section.classList.toggle('is-active', isActive);
    });

    // Setup click handlers
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.target;

        // Update button states
        buttons.forEach(b =>
          b.classList.toggle('active', b.dataset.target === target)
        );

        // Update section visibility
        content.querySelectorAll('[data-recipe-section]').forEach(section => {
          const isActive = section.dataset.recipeSection === target;
          section.classList.toggle('is-active', isActive);
        });

        // Scroll to top when toggling
        content.scrollTop = 0;
      });
    });
  }

  /**
   * Create and render recipe display in a container
   * @param {Element} container - Container element to render into
   * @param {Object} recipe - Recipe object
   * @param {Object} options - Additional options
   */
  static render(container, recipe, options = {}) {
    const { html, setupToggleLogic } = this.generateRecipeHTML(recipe, options);
    
    container.innerHTML = html;
    
    // Setup toggle logic after DOM is ready
    setTimeout(() => {
      setupToggleLogic(container);
    }, 0);
  }

  /**
   * Generate modal-style HTML for recipe display (for favorites modal)
   * @param {Object} recipe - Recipe object
   * @param {Object} options - Additional options
   * @returns {Object} - { html, setupToggleLogic }
   */
  static generateModalHTML(recipe, options = {}) {
    const { customFooter = '' } = options;
    
    const { html, formatted, setupToggleLogic } = this.generateRecipeHTML(
      recipe, 
      { showTitle: false, customActions: '' }
    );

    const modalHTML = `
      <div class="favorite-sheet-container">
        <div class="favorite-sheet-header">
          <h2>${formatted.title}</h2>
          <button class="favorite-sheet-close">×</button>
        </div>

        ${html}

        ${customFooter ? `
          <div class="favorite-sheet-footer">
            ${customFooter}
          </div>
        ` : ''}
      </div>
    `;

    return {
      html: modalHTML,
      formatted,
      setupToggleLogic: (container) => this.setupToggleLogic(container, formatted)
    };
  }
}
