import { Card } from './Card.js';
import { RecipeFormatter } from '../../shared/RecipeFormatter.js';

// Recipe display card component
export class RecipeCard extends Card {
  constructor(container, props = {}) {
    super(container, {
      className: 'recipe-card',
      recipeText: '',
      hideTitle: false,
      showToggle: true,
      ...props
    });
    
    this.formattedRecipe = null;
    this.currentSection = 'ingredients';
  }
  
  render() {
    const { recipeText, hideTitle, showToggle } = this.props;
    
    if (!recipeText) {
      return `
        <div class="card recipe-card empty" data-component-id="${this.id}">
          <div class="recipe-empty">
            <p>No recipe content available</p>
          </div>
        </div>
      `;
    }
    
    // Format recipe
    this.formattedRecipe = RecipeFormatter.format(recipeText, { hideTitle });
    
    if (typeof this.formattedRecipe === 'string') {
      // Fallback for string format
      return `
        <div class="card recipe-card" data-component-id="${this.id}">
          <div class="recipe-content">
            ${this.formattedRecipe}
          </div>
        </div>
      `;
    }
    
    const { html, hasIngredients, hasInstructions } = this.formattedRecipe;
    const shouldShowToggle = showToggle && hasIngredients && hasInstructions;
    
    return `
      <div class="card recipe-card" data-component-id="${this.id}">
        ${shouldShowToggle ? `
          <div class="recipe-toggle" role="tablist" aria-label="Recipe sections">
            <button type="button" 
                    class="recipe-toggle-btn ${this.currentSection === 'ingredients' ? 'active' : ''}" 
                    data-target="ingredients">
              🥘 Ingredients
            </button>
            <button type="button" 
                    class="recipe-toggle-btn ${this.currentSection === 'instructions' ? 'active' : ''}" 
                    data-target="instructions">
              👨‍🍳 Instructions
            </button>
          </div>
        ` : ''}
        <div class="recipe-content">
          ${html}
        </div>
      </div>
    `;
  }
  
  onMount() {
    super.onMount();
    
    // Set up toggle functionality
    this.setupToggleButtons();
    
    // Show initial section
    this.showSection(this.currentSection);
  }
  
  setupToggleButtons() {
    const toggleButtons = this.findAll('.recipe-toggle-btn');
    if (toggleButtons.length === 0) return;
    
    toggleButtons.forEach(button => {
      this.addEventListener(button, 'click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const target = button.dataset.target;
        this.showSection(target);
      });
    });
  }
  
  showSection(sectionName) {
    if (!this.formattedRecipe || typeof this.formattedRecipe === 'string') return;
    
    const content = this.find('.recipe-content');
    if (!content) return;
    
    // Hide all sections
    content.querySelectorAll('[data-recipe-section]').forEach(section => {
      section.style.display = 'none';
    });
    
    // Show target section
    const targetSection = content.querySelector(`[data-recipe-section="${sectionName}"]`);
    if (targetSection) {
      targetSection.style.display = '';
    }
    
    // Update button states
    const toggleButtons = this.findAll('.recipe-toggle-btn');
    toggleButtons.forEach(button => {
      button.classList.toggle('active', button.dataset.target === sectionName);
    });
    
    this.currentSection = sectionName;
  }
  
  // Get recipe title
  getRecipeTitle() {
    if (!this.formattedRecipe) return '';
    return this.formattedRecipe.title || RecipeFormatter.extractTitle(this.props.recipeText);
  }
  
  // Get formatted recipe data
  getFormattedRecipe() {
    return this.formattedRecipe;
  }
  
  // Update recipe content
  updateRecipe(newRecipeText, options = {}) {
    this.props.recipeText = newRecipeText;
    this.props.hideTitle = options.hideTitle || this.props.hideTitle;
    this.props.showToggle = options.showToggle !== undefined ? options.showToggle : this.props.showToggle;
    
    this.forceUpdate();
  }
  
  // Check if recipe is complete
  isCompleteRecipe() {
    if (!this.formattedRecipe || typeof this.formattedRecipe === 'string') {
      return false;
    }
    return this.formattedRecipe.hasIngredients && this.formattedRecipe.hasInstructions;
  }
  
  // Get ingredients list
  getIngredients() {
    if (!this.formattedRecipe || typeof this.formattedRecipe === 'string') {
      return [];
    }
    return this.formattedRecipe.ingredientLines || [];
  }
  
  // Get instructions list
  getInstructions() {
    if (!this.formattedRecipe || typeof this.formattedRecipe === 'string') {
      return [];
    }
    return this.formattedRecipe.instructionLines || [];
  }
}
