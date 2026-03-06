// RecipeSuggestionService.js
// Handles two-stage recipe generation: title suggestions first, full recipe later

import { apiService } from "../core/ApiService.js";
import { RecipeFormatter } from "../shared/RecipeFormatter.js";

export class RecipeSuggestionService {
  constructor(stateManager) {
    this.stateManager = stateManager;
  }

  // Generate a unique ID (collision-safe)
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Stage 1: Generate recipe suggestions (titles + brief descriptions)
  // --------------------------
  async generateSuggestions(promptModifiers = [], maxRetries = 3) {
    const basePrompt = this.buildTitleSuggestionPrompt();

    // 🆕 Incorporate question-based modifiers into the prompt
    const enhancedPrompt = this.enhancePromptWithModifiers(
      basePrompt,
      promptModifiers
    );

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `🔄 Generating recipe suggestions (attempt ${attempt}/${maxRetries})...`
        );
        console.log("🎯 Using modifiers:", promptModifiers);

        // Increase timeout for subsequent attempts
        const timeoutMs = 60000 + (attempt - 1) * 30000; // 60s, 90s, 120s

        const response = await apiService.generateRecipeSuggestions(
          enhancedPrompt,
          5,
          timeoutMs
        );

        if (!response) {
          console.warn(
            "⚠️ Empty response from API, using fallback suggestions."
          );
          const fallback = this.fallbackSuggestions();
          this.stateManager.setState({ currentSuggestions: fallback });
          return fallback;
        }

        let parsedSuggestions = [];

        // Case 1: Response contains suggestions array
        if (Array.isArray(response.suggestions)) {
          parsedSuggestions = response.suggestions;

          // Case 2: Response contains single recipe (server sent full recipe)
        } else if (response.recipe) {
          parsedSuggestions = this.parseRecipeResponse(response.recipe);

          // Case 3: Response contains a title
        } else if (response.title) {
          parsedSuggestions = [
            {
              title: response.title,
              description:
                response.description ||
                "Personalized recipe based on your preferences"
            }
          ];

          // Case 4: Response is a string
        } else if (typeof response === "string") {
          parsedSuggestions = [
            {
              title: response,
              description: "Personalized recipe based on your preferences"
            }
          ];
        }

        // Map suggestions to internal format
        const suggestions = (
          parsedSuggestions || this.fallbackSuggestions()
        ).map((s, idx) => ({
          id: this.generateId(),
          index: idx + 1,
          title: s.title || `Recipe ${idx + 1}`,
          description:
            s.description || "Personalized recipe based on your preferences",
          fullRecipe: s.fullRecipe || null
        }));

        // Store in state manager
        this.stateManager.setState({ currentSuggestions: suggestions });

        console.log(
          `✅ Successfully generated ${suggestions.length} suggestions on attempt ${attempt}`
        );

        // 🚀 NEW: Pre-fetch all full recipes in parallel for instant UX
        this.preFetchAllRecipes();

        return suggestions;
      } catch (error) {
        console.error(`❌ Attempt ${attempt} failed:`, error.message);

        if (attempt === maxRetries) {
          console.error(
            "❌ All retry attempts failed, using fallback suggestions"
          );
          const fallback = this.fallbackSuggestions();
          this.stateManager.setState({ currentSuggestions: fallback });
          return fallback;
        }

        // Wait before retry (exponential backoff)
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // 1s, 2s, 4s max
        console.log(`⏳ Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  // 🚀 NEW: Pre-fetch all recipes in parallel for instant UX
  async preFetchAllRecipes() {
    const currentSuggestions =
      this.stateManager.get("currentSuggestions") || [];
    console.log("🚀 Pre-fetching all recipes in parallel...");

    const fetchPromises = currentSuggestions.map(async suggestion => {
      try {
        const fullRecipe = await this.generateFullRecipe(suggestion.id, 90000);
        console.log(`✅ Pre-fetched recipe: ${suggestion.title}`);
        return { id: suggestion.id, success: true, recipe: fullRecipe };
      } catch (error) {
        console.error(
          `❌ Failed to pre-fetch ${suggestion.title}:`,
          error.message
        );
        return { id: suggestion.id, success: false, error };
      }
    });

    // Wait for all parallel requests to complete
    const results = await Promise.allSettled(fetchPromises);

    const successful = results.filter(r => r.value?.success).length;
    console.log(
      `🎯 Pre-fetch complete: ${successful}/${currentSuggestions.length} recipes cached`
    );
  }

  // Stage 2: Generate full recipe for a selected suggestion (now instant if pre-fetched)
  async generateFullRecipe(suggestionId, timeoutMs = 60000) {
    const currentSuggestions =
      this.stateManager.get("currentSuggestions") || [];
    const suggestion = currentSuggestions.find(s => s.id === suggestionId);
    if (!suggestion) {
      throw new Error("Suggestion not found");
    }

    // Return cached version if available
    if (suggestion.fullRecipe) {
      return suggestion.fullRecipe;
    }

    // 🚀 NEW: Check if this recipe is already being fetched (race condition prevention)
    const pendingFetches = this.stateManager.get("pendingFetches") || new Map();
    if (pendingFetches.has(suggestionId)) {
      console.log(
        `⏳ Recipe ${suggestion.title} already being fetched, waiting...`
      );
      return pendingFetches.get(suggestionId);
    }

    // Create and store the fetch promise
    const fetchPromise = this._fetchAndCacheRecipe(suggestion, timeoutMs);
    const newPendingFetches = new Map(pendingFetches);
    newPendingFetches.set(suggestionId, fetchPromise);
    this.stateManager.setState({ pendingFetches: newPendingFetches });

    try {
      const result = fetchPromise;
      return result;
    } finally {
      // Clean up the pending fetch regardless of success/failure
      const updatedPendingFetches =
        this.stateManager.get("pendingFetches") || new Map();
      updatedPendingFetches.delete(suggestionId);
      this.stateManager.setState({ pendingFetches: updatedPendingFetches });
    }
  }

  // Helper method to actually fetch and cache the recipe
  async _fetchAndCacheRecipe(suggestion, timeoutMs) {
    try {
      const prompt = this.buildFullRecipePrompt(suggestion.title);

      const response = await apiService.generateRecipe(prompt, {
        timeout: timeoutMs
      });

      // Extract recipe text correctly from LLM response
      let recipeText;

      // LLM service returns { recipe: "text" } for single recipes
      if (response.recipe) {
        recipeText = response.recipe; // Original working format
      } else if (response.text) {
        recipeText = response.text; // Fallback
      } else if (typeof response === "string") {
        recipeText = response; // Direct string response
      } else {
        throw new Error("Invalid response format from LLM service");
      }

      // Pass the correct text to formatter
      const formatted = RecipeFormatter.format(recipeText);

      suggestion.fullRecipe = {
        recipeText,
        title: suggestion.title, // Use our own title for consistency
        formatted
      };

      // Update the suggestion in state manager
      const currentSuggestions =
        this.stateManager.get("currentSuggestions") || [];
      const updatedSuggestions = currentSuggestions.map(s =>
        s.id === suggestion.id ? suggestion : s
      );
      this.stateManager.setState({ currentSuggestions: updatedSuggestions });

      return suggestion.fullRecipe;
    } catch (error) {
      console.error("❌ Failed to generate full recipe:", error);
      throw error;
    }
  }

  // --------------------------
  // Prompt builders
  // --------------------------
  buildTitleSuggestionPrompt() {
    const vibes = this.stateManager.get("vibeProfile") || [];
    const preferences = this.stateManager.get("preferences") || {};
    const ingredients = this.stateManager.get("ingredientsAtHome") || "";

    let prompt =
      "Based on user preferences, suggest exactly 5 recipe titles with brief descriptions:\n\n";

    if (vibes.length) {
      prompt += `Selected Vibes: ${vibes.map(v => `${v.emoji} ${v.name}`).join(", ")}\n`;
    }
    prompt += `Dietary Preferences: ${preferences.diet || "None"}\n`;
    prompt += `Budget Conscious: ${preferences.budget || "No"}\n`;
    prompt += `Seasonal King: ${preferences.seasonalKing || "No"}\n`;

    if (ingredients.trim()) {
      prompt += `Preferably try to include one or more of these ingredients: ${ingredients}\n`;
    }

    prompt += `
Please respond with exactly 5 suggestions in JSON format:
{
  "suggestions": [
    { "title": "Recipe Title 1", "description": "Brief explanation" },
    { "title": "Recipe Title 2", "description": "Brief explanation" },
    ...
  ]
}

Keep titles appealing, descriptions concise (≤50 words), and match preferences.
`;

    return prompt;
  }

  // 🆕 Enhance prompt with question-based modifiers
  enhancePromptWithModifiers(basePrompt, modifiers) {
    if (!modifiers || modifiers.length === 0) {
      return basePrompt;
    }

    const modifierText = modifiers.filter(m => m).join(", ");

    return `${basePrompt}

IMPORTANT: The user has provided specific preferences: ${modifierText}.
Please ensure all suggestions match these requirements exactly.`;
  }

  buildFullRecipePrompt(selectedTitle) {
    const vibes = this.stateManager.get("vibeProfile") || [];
    const preferences = this.stateManager.get("preferences") || {};
    const ingredients = this.stateManager.get("ingredientsAtHome") || "";

    let prompt = `Generate a complete recipe for "${selectedTitle}"\n\n`;

    if (vibes.length) {
      prompt += `User Vibes: ${vibes.map(v => `${v.emoji} ${v.name}`).join(", ")}\n`;
    }

    prompt += `Dietary Preferences: ${preferences.diet || "None"}\n`;
    prompt += `Budget Conscious: ${preferences.budget || "No"}\n`;
    prompt += `Seasonal King: ${preferences.seasonalKing || "No"}\n`;

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
      if (typeof recipeData === "string") {
        const parsed = JSON.parse(recipeData);
        if (Array.isArray(parsed.suggestions)) {
          return parsed.suggestions;
        }
      } else if (recipeData.suggestions) {
        return recipeData.suggestions;
      }
      console.warn(
        "⚠️ Could not parse recipe response, using fallback suggestions"
      );
    } catch (error) {
      console.error("Failed parsing recipe response:", error);
    }
    return this.fallbackSuggestions();
  }

  fallbackSuggestions() {
    return [
      {
        title: "Fresh Garden Salad",
        description: "Light, healthy salad with seasonal vegetables"
      },
      {
        title: "Comforting Vegetable Soup",
        description: "Warm, hearty soup for cozy nights"
      }
    ];
  }

  selectSuggestion(suggestionId) {
    const currentSuggestions =
      this.stateManager.get("currentSuggestions") || [];
    return currentSuggestions.find(s => s.id === suggestionId);
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
          ${suggestions.map(s => this.createSuggestionCard(s)).join("")}
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
