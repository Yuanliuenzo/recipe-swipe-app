// Personalized prompt generation
export class PromptBuilder {
  // Generate personalized recipe prompt based on user preferences
  static generatePersonalizedPrompt(vibeProfile = [], preferences = {}, ingredientsAtHome = '') {
    let basePrompt = '';
    
    // Build base prompt from vibe profile
    if (vibeProfile.length === 0) {
      basePrompt = "Write me a delicious recipe that would be perfect for any occasion.";
    } else {
      const vibeDescriptions = vibeProfile.map(vibe => vibe.prompt);
      const combinedVibes = vibeDescriptions.join(", ");
      basePrompt = `Can you make a recipe for someone that has this vibe:

${combinedVibes}`;
    }
    
    // Add dietary preferences
    if (preferences.diet && preferences.diet !== 'None') {
      basePrompt += ` Please make this recipe ${preferences.diet.toLowerCase()}.`;
    }
    
    // Add budget preference
    if (preferences.budget === 'Yes') {
      basePrompt += ' Focus on affordable, budget-friendly ingredients.';
    }
    
    // Add seasonal preference
    if (preferences.seasonalKing === 'Yes') {
      basePrompt += ' Prioritize seasonal, fresh ingredients that are currently in their peak season.';
    }
    
    // Add ingredients preference
    if (ingredientsAtHome) {
      basePrompt += ` Try to incorporate these ingredients they already have: ${ingredientsAtHome}. `;
    }
    
    // Add formatting instructions
    const fullPrompt = `${basePrompt}
    
Please write me a clear, well-formatted recipe that matches these preferences. 

Structure it exactly like this (follow the formatting rules strictly):

Recipe Name
===

Ingredients:
• [ingredient 1]
• [ingredient 2]
• [ingredient 3]

Instructions:
1. [step 1]
2. [step 2]
3. [step 3]

Formatting rules:
- Use the exact header text "Ingredients:" on its own line.
- Use the exact header text "Instructions:" on its own line.
- Put each ingredient on its own line (prefer starting with "• ").
- Put each instruction on its own line starting with "1.", "2.", etc.
- Do not merge ingredients and instructions into the same paragraph.
- Do not omit the Instructions header.

Keep it concise but complete.`;

    return fullPrompt;
  }
  
  // Generate simple prompt for testing
  static generateSimplePrompt() {
    return "Write me a simple, delicious recipe with clear ingredients and instructions.";
  }
  
  // Generate prompt with specific cuisine type
  static generateCuisinePrompt(cuisineType, dietaryRestrictions = '') {
    let prompt = `Write me a delicious ${cuisineType} recipe with authentic flavors.`;
    
    if (dietaryRestrictions) {
      prompt += ` Please make it ${dietaryRestrictions.toLowerCase()}.`;
    }
    
    prompt += `

Structure it exactly like this:

Recipe Name
===

Ingredients:
• [ingredient 1]
• [ingredient 2]

Instructions:
1. [step 1]
2. [step 2]

Keep it clear and well-formatted.`;

    return prompt;
  }
  
  // Generate prompt based on available ingredients
  static generateIngredientsPrompt(ingredients, preferences = {}) {
    let prompt = `Write me a recipe using these ingredients: ${ingredients.join(', ')}.`;
    
    if (preferences.diet && preferences.diet !== 'None') {
      prompt += ` Make it ${preferences.diet.toLowerCase()}.`;
    }
    
    if (preferences.budget === 'Yes') {
      prompt += ' Focus on simple preparation.';
    }
    
    prompt += `

Structure it exactly like this:

Recipe Name
===

Ingredients:
• [ingredient 1]
• [ingredient 2]

Instructions:
1. [step 1]
2. [step 2]

Make sure the recipe is practical and delicious.`;

    return prompt;
  }
  
  // Validate prompt quality
  static validatePrompt(prompt) {
    if (!prompt || typeof prompt !== 'string') {
      return { valid: false, error: 'Prompt must be a non-empty string' };
    }
    
    if (prompt.length < 10) {
      return { valid: false, error: 'Prompt is too short' };
    }
    
    if (prompt.length > 2000) {
      return { valid: false, error: 'Prompt is too long' };
    }
    
    return { valid: true };
  }
  
  // Extract key information from prompt
  static extractPromptInfo(prompt) {
    const info = {
      hasVibes: false,
      hasDietaryRestrictions: false,
      hasIngredients: false,
      hasBudgetConstraint: false,
      hasSeasonalConstraint: false
    };
    
    if (!prompt) return info;
    
    const lowerPrompt = prompt.toLowerCase();
    
    info.hasVibes = lowerPrompt.includes('vibe') || lowerPrompt.includes('comforting') || lowerPrompt.includes('spicy');
    info.hasDietaryRestrictions = lowerPrompt.includes('vegan') || lowerPrompt.includes('vegetarian');
    info.hasIngredients = lowerPrompt.includes('ingredients they already have');
    info.hasBudgetConstraint = lowerPrompt.includes('budget-friendly') || lowerPrompt.includes('affordable');
    info.hasSeasonalConstraint = lowerPrompt.includes('seasonal');
    
    return info;
  }
}
