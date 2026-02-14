// RecipeSuggestionService.js
// Handles two-stage recipe generation: title suggestions first, full recipe later

import { apiService } from '../core/ApiService.js';
import { RecipeFormatter } from '../shared/RecipeFormatter.js';

export class RecipeSuggestionService {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.currentSuggestions = [];
  }

  // Generate a unique ID (collision-safe)
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // --------------------------
  // Stage 1: Generate recipe suggestions (titles + brief descriptions)
  // --------------------------
  async generateSuggestions() {
    const prompt = this.buildTitleSuggestionPrompt();

    try {
      const response = await apiService.generateRecipeSuggestions(prompt, 5);

      if (!response) {
        console.warn('⚠️ Empty response from API, using fallback suggestions.');
        this.currentSuggestions = this.fallbackSuggestions();
        return this.currentSuggestions;
      }

      let suggestions = [];

      // Case 1: Response contains suggestions array
      if (Array.isArray(response.suggestions)) {
        suggestions = response.suggestions;

        // Case 2: Response contains single recipe (server sent full recipe)
      } else if (response.recipe) {
        suggestions = this.parseRecipeResponse(response.recipe);

        // Case 3: Response contains a title
      } else if (response.title) {
        suggestions = [{ title: response.title, description: response.description || 'Personalized recipe based on your preferences' }];

        // Case 4: Response is a string
      } else if (typeof response === 'string') {
        suggestions = [{ title: response, description: 'Personalized recipe based on your preferences' }];
      }

      // Map suggestions to internal format
      this.currentSuggestions = (suggestions || this.fallbackSuggestions()).map((s, idx) => ({
        id: this.generateId(),
        index: idx + 1,
        title: s.title || `Recipe ${idx + 1}`,
        description: s.description || 'Personalized recipe based on your preferences',
        fullRecipe: s.fullRecipe || null
      }));

      return this.currentSuggestions;

    } catch (error) {
      console.error('❌ Failed to generate recipe suggestions:', error);
      this.currentSuggestions = this.fallbackSuggestions();
      return this.currentSuggestions;
    }
  }

  // Stage 2: Generate full recipe for a selected suggestion
  async generateFullRecipe(suggestionId, timeoutMs = 60000) {
    const suggestion = this.currentSuggestions.find(s => s.id === suggestionId);
    if (!suggestion) throw new Error('Suggestion not found');

    // Return cached version if available
    if (suggestion.fullRecipe) return suggestion.fullRecipe;

    try {
      const prompt = this.buildFullRecipePrompt(suggestion.title);
      const response = await apiService.generateRecipe(prompt, { timeout: timeoutMs });

      // Parse and format recipe
      const recipeText = response.recipeText || response.text || response;
      const formatted = RecipeFormatter.format(recipeText);

      suggestion.fullRecipe = {
        recipeText,
        title: response.title || suggestion.title,
        formatted
      };

      return suggestion.fullRecipe;

    } catch (error) {
      console.error('❌ Failed to generate full recipe:', error);
      throw error;
    }
  }

  // --------------------------
  // Prompt builders
  // --------------------------
  buildTitleSuggestionPrompt() {
    const vibes = this.stateManager.get('vibeProfile') || [];
    const preferences = this.stateManager.get('preferences') || {};
    const ingredients = this.stateManager.get('ingredientsAtHome') || '';

    let prompt = `Based on user preferences, suggest exactly 5 recipe titles with brief descriptions:\n\n`;

    if (vibes.length) {
      prompt += `Selected Vibes: ${vibes.map(v => `${v.emoji} ${v.name}`).join(', ')}\n`;
    }
    prompt += `Dietary Preferences: ${preferences.diet || 'None'}\n`;
    prompt += `Budget Conscious: ${preferences.budget || 'No'}\n`;
    prompt += `Seasonal King: ${preferences.seasonalKing || 'No'}\n`;

    if (ingredients.trim()) {
      prompt += `Available Ingredients: ${ingredients}\n`;
    }

    prompt += `
Please respond with exactly 5 suggestions in JSON format:
{
  "suggestions": [
    { "title": "Recipe Title 1", "description": "Brief explanation" },
    { "title": "Recipe Title 2", "description": "Brief explanation" }
  ]
}

Keep titles appealing, descriptions concise (≤50 words), and match preferences.
`;

    return prompt;
  }

  buildFullRecipePrompt(selectedTitle) {
    const vibes = this.stateManager.get('vibeProfile') || [];
    const preferences = this.stateManager.get('preferences') || {};
    const ingredients = this.stateManager.get('ingredientsAtHome') || '';

    let prompt = `Generate a complete recipe for "${selectedTitle}"\n\n`;

    if (vibes.length) {
      prompt += `User Vibes: ${vibes.map(v => `${v.emoji} ${v.name}`).join(', ')}\n`;
    }

    prompt += `Dietary Preferences: ${preferences.diet || 'None'}\n`;
    prompt += `Budget Conscious: ${preferences.budget || 'No'}\n`;
    prompt += `Seasonal King: ${preferences.seasonalKing || 'No'}\n`;

    if (ingredients.trim()) {
      prompt += `Available Ingredients: ${ingredients}\n`;
    }

    prompt += `
Structure exactly like this:

Recipe Name
===

Ingredients:
• [ingredient 1]
• [ingredient 2]

Instructions:
1. [step 1]
2. [step 2]

Do not omit headers. Keep concise but complete.
`;

    return prompt;
  }

  // --------------------------
  // Helpers
  // --------------------------
  parseRecipeResponse(recipeData) {
    try {
      if (typeof recipeData === 'string') {
        const parsed = JSON.parse(recipeData);
        if (Array.isArray(parsed.suggestions)) return parsed.suggestions;
      } else if (recipeData.suggestions) {
        return recipeData.suggestions;
      }
      console.warn('⚠️ Could not parse recipe response, using fallback suggestions');
    } catch (error) {
      console.error('Failed parsing recipe response:', error);
    }
    return this.fallbackSuggestions();
  }

  fallbackSuggestions() {
    return [
      { title: 'Fresh Garden Salad', description: 'Light, healthy salad with seasonal vegetables' },
      { title: 'Comforting Vegetable Soup', description: 'Warm, hearty soup for cozy nights' }
    ];
  }

  getCurrentSuggestions() {
    return this.currentSuggestions;
  }

  clearSuggestions() {
    this.currentSuggestions = [];
  }

  selectSuggestion(suggestionId) {
    return this.currentSuggestions.find(s => s.id === suggestionId);
  }

  createSuggestionCard(suggestion) {
    return `
      <div class="recipe-suggestion-card" data-suggestion-id="${suggestion.id}">
        <div class="suggestion-header">
          <div class="suggestion-number">${suggestion.index}</div>
          <h3 class="suggestion-title">${suggestion.title}</h3>
        </div>
        <div class="suggestion-description">
          <p>${suggestion.description}</p>
        </div>
        <div class="suggestion-actions">
          <button class="japandi-btn japandi-btn-primary select-recipe-btn" data-suggestion-id="${suggestion.id}">
            Choose This Recipe
          </button>
        </div>
      </div>
    `;
  }

  createSuggestionsGrid(suggestions) {
    return `
      <div class="recipe-suggestions-container">
        <div class="suggestions-header">
          <h2>🍳 Recipe Ideas For You</h2>
          <p>Based on your preferences, here are 5 recipe suggestions. Click one to see the full recipe!</p>
        </div>
        <div class="suggestions-grid">
          ${suggestions.map(s => this.createSuggestionCard(s)).join('')}
        </div>
        <div class="suggestions-footer">
          <button class="japandi-btn japandi-btn-subtle regenerate-btn">
            🔄 Get New Ideas
          </button>
        </div>
      </div>
    `;
  }
}
