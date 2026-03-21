// RecipeSuggestionService.js
// Handles two-stage recipe generation: title suggestions first, full recipe later

import { apiService } from "../core/ApiService.js";
import { RecipeFormatter } from "../shared/RecipeFormatter.js";
import { getCurrentSeason } from "../utils/LLMUtils.js";

export class RecipeSuggestionService {
  constructor(stateManager) {
    this.stateManager = stateManager;
  }

  // Generate a unique ID (collision-safe)
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // --------------------------
  // Stage 1: Generate recipe suggestions (titles + brief descriptions)
  // --------------------------
  async generateSuggestions(maxRetries = 3) {
    const prompt = this.buildTitleSuggestionPrompt();

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `🔄 Generating recipe suggestions (attempt ${attempt}/${maxRetries})...`
        );

        // Increase timeout for subsequent attempts
        const timeoutMs = 60000 + (attempt - 1) * 30000; // 60s, 90s, 120s

        const response = await apiService.generateRecipeSuggestions(
          prompt,
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

  // Pre-fetch recipes sequentially — Ollama handles one request at a time,
  // so parallel requests just queue up and each one times out waiting.
  async preFetchAllRecipes() {
    const suggestions = this.stateManager.get("currentSuggestions") || [];
    console.log(
      `🚀 Pre-fetching ${suggestions.length} recipes sequentially...`
    );

    let fetched = 0;
    for (const suggestion of suggestions) {
      try {
        await this.generateFullRecipe(suggestion.id, 90000);
        fetched++;
        console.log(
          `✅ Pre-fetched (${fetched}/${suggestions.length}): ${suggestion.title}`
        );
      } catch (error) {
        console.warn(
          `⚠️ Pre-fetch skipped for "${suggestion.title}": ${error.message}`
        );
      }
    }

    console.log(
      `🎯 Pre-fetch complete: ${fetched}/${suggestions.length} cached`
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
      return await fetchPromise;
    } finally {
      // Clean up after the fetch completes (or fails)
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

  _getSeason() {
    return getCurrentSeason();
  }

  buildTitleSuggestionPrompt() {
    const vibes = this.stateManager.get("vibeProfile") || [];
    const negativeVibes = this.stateManager.get("negativeVibes") || [];
    const preferences = this.stateManager.get("preferences") || {};
    const sessionContext = this.stateManager.get("sessionContext") || {};
    const ingredients = this.stateManager.get("ingredientsAtHome") || "";
    const season = this._getSeason();

    const mealLabels = {
      breakfast: "Breakfast",
      brunch: "Brunch",
      lunch: "Lunch",
      dinner: "Dinner",
      snack: "Snack"
    };
    const servingLabels = {
      solo: "1 person",
      couple: "2–3 people",
      group: "4 or more people"
    };
    const timeLabels = {
      quick: "under 20 minutes",
      normal: "30–45 minutes",
      leisurely: "an hour or more"
    };

    let prompt =
      "Suggest exactly 5 recipe titles that match the following user context:\n\n";

    // --- Factual constraints (hard requirements) ---
    if (sessionContext.mealType) {
      prompt += `Meal type: ${mealLabels[sessionContext.mealType]} — all 5 suggestions MUST be appropriate for this meal\n`;
    }
    if (sessionContext.servingSize) {
      prompt += `Serving size: ${servingLabels[sessionContext.servingSize]}\n`;
    }
    if (sessionContext.timeAvailable) {
      prompt += `Time available: ${timeLabels[sessionContext.timeAvailable]} — recipes must fit within this time\n`;
    }
    if (preferences.diet && preferences.diet !== "None") {
      prompt += `Dietary restriction: ${preferences.diet} — strictly required\n`;
    }
    if (preferences.budget === "Yes") {
      prompt += `Budget: affordable, everyday ingredients preferred\n`;
    }

    // --- Emotional vibes (stylistic guidance) ---
    if (vibes.length) {
      prompt += `\nMood/Vibes the user is feeling:\n`;
      vibes.forEach(v => (prompt += `  • ${v.emoji} ${v.name}: ${v.prompt}\n`));
    }
    if (negativeVibes.length) {
      prompt += `\nNOT in the mood for: ${negativeVibes.map(v => `${v.emoji} ${v.name}`).join(", ")} — avoid suggestions that feel like these\n`;
    }

    // --- Seasonal context (automatic, soft guidance) ---
    prompt += `\nCurrent season: ${season} in the northern hemisphere — lean toward seasonal ingredients where it genuinely improves the dish\n`;

    // --- Ingredients (soft preference) ---
    if (ingredients.trim()) {
      prompt += `\nIngredients available at home: ${ingredients}\n`;
      prompt += `Use whichever of these make a natural fit for the dish — do not force all of them in\n`;
    }

    prompt += `
Please respond with exactly 5 suggestions in this JSON format:
{
  "suggestions": [
    { "title": "Recipe Title 1", "description": "Brief explanation (max 40 words)" },
    { "title": "Recipe Title 2", "description": "Brief explanation (max 40 words)" },
    { "title": "Recipe Title 3", "description": "Brief explanation (max 40 words)" },
    { "title": "Recipe Title 4", "description": "Brief explanation (max 40 words)" },
    { "title": "Recipe Title 5", "description": "Brief explanation (max 40 words)" }
  ]
}

Keep titles appealing and accurate. Descriptions should hint at why each matches the mood.
`;

    return prompt;
  }

  buildFullRecipePrompt(selectedTitle) {
    const vibes = this.stateManager.get("vibeProfile") || [];
    const negativeVibes = this.stateManager.get("negativeVibes") || [];
    const preferences = this.stateManager.get("preferences") || {};
    const sessionContext = this.stateManager.get("sessionContext") || {};
    const ingredients = this.stateManager.get("ingredientsAtHome") || "";
    const season = this._getSeason();

    const servingLabels = {
      solo: "1 person",
      couple: "2–3 people",
      group: "4 or more people"
    };
    const timeLabels = {
      quick: "under 20 minutes",
      normal: "30–45 minutes",
      leisurely: "an hour or more"
    };

    let prompt = `Generate a complete recipe for "${selectedTitle}"\n\n`;

    if (sessionContext.servingSize) {
      prompt += `Servings: ${servingLabels[sessionContext.servingSize]}\n`;
    }
    if (sessionContext.timeAvailable) {
      prompt += `Time constraint: ${timeLabels[sessionContext.timeAvailable]}\n`;
    }
    if (preferences.diet && preferences.diet !== "None") {
      prompt += `Dietary restriction: ${preferences.diet} — strictly required\n`;
    }
    if (preferences.budget === "Yes") {
      prompt += `Budget: affordable ingredients\n`;
    }

    if (vibes.length) {
      prompt += `\nMood: ${vibes.map(v => `${v.emoji} ${v.name}`).join(", ")}\n`;
    }
    if (negativeVibes.length) {
      prompt += `Avoid: ${negativeVibes.map(v => v.name).join(", ")}\n`;
    }

    prompt += `Season: ${season} — use seasonal ingredients where appropriate\n`;

    if (ingredients.trim()) {
      prompt += `\nIngredients available: ${ingredients}\n`;
      prompt += `(Use whichever make a natural fit — no need to force all of them in)\n`;
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
