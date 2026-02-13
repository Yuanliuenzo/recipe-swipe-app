// Recipe text formatting and processing
export class RecipeFormatter {
  // Main formatting function
  static format(rawText = '') {
    if (!rawText || typeof rawText !== 'string') {
      return {
        html: '<p>No recipe available</p>',
        title: 'Untitled Recipe',
        hasIngredients: false,
        hasInstructions: false
      };
    }

    const lines = rawText.split('\n').map(l => l.trim());

    let title = 'Untitled Recipe';
    let ingredients = [];
    let instructions = [];
    let currentSection = null;

    lines.forEach(line => {
      if (!line) return;

      const lower = line.toLowerCase();

      // Check for section headers FIRST
      if (lower.includes('ingredients')) {
        currentSection = 'ingredients';
        return;
      }

      if (lower.includes('instructions') || lower.includes('directions')) {
        currentSection = 'instructions';
        return;
      }

      // Set title if not set yet
      if (!title || title === 'Untitled Recipe') {
        // Clean up the title - remove asterisks, bold markers, and extra formatting
        title = line
          .replace(/\*\*/g, '') // Remove asterisks
          .replace(/\*\*/g, '') // Remove double asterisks (bold)
          .replace(/__+/g, '') // Remove underscores (underline)
          .replace(/^#+\s*/, '') // Remove markdown headers
          .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold markdown but keep text
          .replace(/_([^_]+)_/g, '$1') // Remove italic markdown but keep text
          .replace(/^Recipe\s+Name:\s*/i, '') // Remove "Recipe Name:" prefix
          .replace(/^Recipe:\s*/i, '') // Remove "Recipe:" prefix
          .replace(/^Name:\s*/i, '') // Remove "Name:" prefix
          .trim();
        return;
      }

      // Only add to sections if we're in a valid section
      if (currentSection === 'ingredients') {
        // Don't add numbered items to ingredients (they're likely instructions)
        if (!/^\d+[\.\)]/.test(line)) {
          ingredients.push(line.replace(/^[-•\d.]+\s*/, ''));
        }
      }

      if (currentSection === 'instructions') {
        instructions.push(line.replace(/^\d+[\).\s]*/, ''));
      }
    });

    const hasIngredients = ingredients.length > 0;
    const hasInstructions = instructions.length > 0;

    const html = `
    <div class="recipe-wrapper">
      ${hasIngredients ? `
        <div class="recipe-section" data-recipe-section="ingredients">
          <h3>🥘 Ingredients</h3>
          <ul class="ingredients-list">
            ${ingredients.map(i => `<li>${i}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${hasInstructions ? `
        <div class="recipe-section" data-recipe-section="instructions">
          <h3>👨‍🍳 Instructions</h3>
          <ol class="instructions-list">
            ${instructions.map(i => `<li>${i}</li>`).join('')}
          </ol>
        </div>
      ` : ''}
    </div>
  `;

    return {
      html,
      title,
      hasIngredients,
      hasInstructions
    };
  }


  // Format ingredients section
  static _formatIngredients(ingredientLines, applyInlineFormatting) {
    const cleanedIngredients = ingredientLines
      .map(item => item.replace(/^[-•]\s*/, ''))
      .map(item => `<li>${applyInlineFormatting(item)}</li>`)
      .join('');
    
    return `
      <div class="recipe-section recipe-section-ingredients" data-recipe-section="ingredients">
        <h3>🥘 Ingredients</h3>
        <ul class="ingredients-list">
          ${cleanedIngredients}
        </ul>
      </div>
    `;
  }
  
  // Format instructions section
  static _formatInstructions(instructionLines, applyInlineFormatting) {
    const cleanedInstructions = instructionLines
      .map(item => item.replace(/^\d+\.|^\d+\)|^[-•]\s*/g, '').trim())
      .map(item => `<li>${applyInlineFormatting(item)}</li>`)
      .join('');
    
    return `
      <div class="recipe-section recipe-section-instructions" data-recipe-section="instructions">
        <h3>👨‍🍳 Instructions</h3>
        <ol class="instructions-list">
          ${cleanedInstructions}
        </ol>
      </div>
    `;
  }
  
  // Extract just the title
  static extractTitle(recipeText) {
    if (!recipeText || typeof recipeText !== 'string') {
      return 'Untitled Recipe';
    }
    
    const lines = recipeText.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.toLowerCase().includes('ingredients') && !trimmed.toLowerCase().includes('instructions')) {
        return trimmed.replace(/^(Recipe Name:|Recipe:)\s*/i, '').trim();
      }
    }
    
    return 'Untitled Recipe';
  }
  
  // Extract ingredients only
  static extractIngredients(recipeText) {
    const formatted = this.format(recipeText);
    return formatted.ingredientLines || [];
  }
  
  // Extract instructions only
  static extractInstructions(recipeText) {
    const formatted = this.format(recipeText);
    return formatted.instructionLines || [];
  }
  
  // Check if recipe has both ingredients and instructions
  static isCompleteRecipe(recipeText) {
    const formatted = this.format(recipeText);
    return formatted.hasIngredients && formatted.hasInstructions;
  }
}
