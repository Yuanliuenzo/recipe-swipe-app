// Recipe text formatting and processing
export class RecipeFormatter {
  // Main formatting function
  static format(recipeText, options = {}) {
    const { hideTitle = false } = options;
    
    if (!recipeText || typeof recipeText !== 'string') {
      return {
        html: '<p>No recipe content available</p>',
        hasIngredients: false,
        hasInstructions: false,
        title: 'Untitled Recipe'
      };
    }
    
    const applyInlineFormatting = (text) => {
      return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    };
    
    const introLines = [];
    const ingredientLines = [];
    const instructionLines = [];
    let recipeTitle = '';
    
    let mode = 'intro';
    const lines = recipeText.split('\n');
    
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      
      // Detect section headers
      if (line.toLowerCase() === 'ingredients:' || line.toLowerCase().startsWith('ingredients:')) {
        mode = 'ingredients';
        continue;
      }
      if (line.toLowerCase() === 'instructions:' || line.toLowerCase().startsWith('instructions:')) {
        mode = 'instructions';
        continue;
      }
      
      // Skip separator lines
      if (line === '===') continue;
      
      // Handle numbered ingredients (switch to instructions mode)
      if (mode === 'ingredients' && /^\d+(\.|\))\s+/.test(line)) {
        mode = 'instructions';
      }
      
      // Parse content based on current mode
      if (mode === 'intro') {
        if (!recipeTitle) {
          // Extract title from first line
          let cleanLine = line.replace(/^(Recipe Name:|Recipe:)\s*/i, '').trim();
          if (cleanLine && !cleanLine.toLowerCase().includes('ingredients') && !cleanLine.toLowerCase().includes('instructions')) {
            recipeTitle = cleanLine;
          } else {
            introLines.push(line);
          }
        } else {
          introLines.push(line);
        }
      } else if (mode === 'ingredients') {
        ingredientLines.push(line);
      } else if (mode === 'instructions') {
        instructionLines.push(line);
      }
    }
    
    const hasIngredients = ingredientLines.length > 0;
    const hasInstructions = instructionLines.length > 0;
    
    // Build HTML
    let html = '';
    
    if (recipeTitle && !hideTitle) {
      html += `<h2 class="recipe-title">${applyInlineFormatting(recipeTitle)}</h2>`;
    }
    
    if (introLines.length) {
      html += `<div class="recipe-intro">${applyInlineFormatting(introLines.join('\n'))}</div>`;
    }
    
    if (hasIngredients) {
      html += this._formatIngredients(ingredientLines, applyInlineFormatting);
    }
    
    if (hasInstructions) {
      html += this._formatInstructions(instructionLines, applyInlineFormatting);
    }
    
    // Fallback if no structured content found
    if (!html) {
      html = `<p>${applyInlineFormatting(recipeText)}</p>`;
    }
    
    return {
      html,
      hasIngredients,
      hasInstructions,
      title: recipeTitle || 'Untitled Recipe',
      introLines,
      ingredientLines,
      instructionLines
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
