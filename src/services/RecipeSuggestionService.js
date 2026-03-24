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
    // Return cached suggestions if available (prevents double-generation)
    const existing = this.stateManager.get("currentSuggestions") || [];
    if (existing.length > 0) {
      console.log("✅ Returning cached suggestions");
      return existing;
    }

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

        // Map suggestions to internal format — handles both single and harmonized shapes
        const suggestions = (
          parsedSuggestions || this.fallbackSuggestions()
        ).map((s, idx) => {
          if (s.mainTitle) {
            // Harmonized meal set
            return {
              id: this.generateId(),
              index: idx + 1,
              isHarmonized: true,
              mainTitle: s.mainTitle,
              sideTitle: s.sideTitle || "",
              title: `${s.mainTitle} + ${s.sideTitle || ""}`,
              description: s.description || "A harmonized meal pairing",
              fullRecipe: null
            };
          }
          return {
            id: this.generateId(),
            index: idx + 1,
            isHarmonized: false,
            title: s.title || `Recipe ${idx + 1}`,
            description:
              s.description || "Personalized recipe based on your preferences",
            fullRecipe: null
          };
        });

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
        await this.generateFullRecipe(suggestion.id);
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

  // Stage 2: Generate full recipe for a selected suggestion
  // onToken(token, fullText) is called on each streamed token for live rendering
  async generateFullRecipe(suggestionId, onToken = null) {
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

    // Race condition prevention — if already fetching, await the same promise
    const pendingFetches = this.stateManager.get("pendingFetches") || new Map();
    if (pendingFetches.has(suggestionId)) {
      console.log(`⏳ Already fetching: ${suggestion.title}`);
      return pendingFetches.get(suggestionId);
    }

    const fetchPromise = this._fetchAndCacheRecipe(suggestion, onToken);
    const newPendingFetches = new Map(pendingFetches);
    newPendingFetches.set(suggestionId, fetchPromise);
    this.stateManager.setState({ pendingFetches: newPendingFetches });

    try {
      return await fetchPromise;
    } finally {
      const updatedPendingFetches =
        this.stateManager.get("pendingFetches") || new Map();
      updatedPendingFetches.delete(suggestionId);
      this.stateManager.setState({ pendingFetches: updatedPendingFetches });
    }
  }

  async _fetchAndCacheRecipe(suggestion, onToken = null) {
    try {
      // Pass structured title object for harmonized suggestions
      const titleArg = suggestion.isHarmonized
        ? { mainTitle: suggestion.mainTitle, sideTitle: suggestion.sideTitle }
        : suggestion.title;
      const prompt = this.buildFullRecipePrompt(titleArg);

      // Use streaming — tokens appear in real time, full text assembled as they arrive
      const recipeText = await apiService.streamRecipe(prompt, onToken);

      if (!recipeText) {
        throw new Error("Empty response from LLM");
      }

      const formatted = RecipeFormatter.format(recipeText);
      suggestion.fullRecipe = {
        recipeText,
        title: suggestion.title,
        formatted
      };

      const currentSuggestions =
        this.stateManager.get("currentSuggestions") || [];
      this.stateManager.setState({
        currentSuggestions: currentSuggestions.map(s =>
          s.id === suggestion.id ? suggestion : s
        )
      });

      return suggestion.fullRecipe;
    } catch (error) {
      console.error("❌ Failed to fetch recipe:", error);
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
    const isHarmonized = Boolean(
      sessionContext.dishFormat && sessionContext.dishFormat2
    );

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

    // Shared context block
    let contextBlock = "";
    if (sessionContext.mealType) {
      contextBlock += `Meal type: ${mealLabels[sessionContext.mealType]}\n`;
    }
    if (sessionContext.servingSize) {
      contextBlock += `Serving size: ${servingLabels[sessionContext.servingSize]}\n`;
    }
    if (sessionContext.timeAvailable) {
      contextBlock += `Time available: ${timeLabels[sessionContext.timeAvailable]} — recipes must fit within this time\n`;
    }
    if (preferences.diet && preferences.diet !== "None") {
      contextBlock += `Dietary restriction: ${preferences.diet} — strictly required\n`;
    }
    if (preferences.budget === "Yes") {
      contextBlock += `Budget: affordable, everyday ingredients preferred\n`;
    }

    // Shared vibe block
    let vibeBlock = "";
    if (vibes.length) {
      const moodTags = [...new Set(vibes.flatMap(c => c.tags?.mood || []))];
      const flavorTags = [...new Set(vibes.flatMap(c => c.tags?.flavor || []))];
      const styleTags = [...new Set(vibes.flatMap(c => c.tags?.style || []))];
      vibeBlock += `\nMood inferred from the user's image selections:\n`;
      if (moodTags.length) {
        vibeBlock += `  • Feeling: ${moodTags.join(", ")}\n`;
      }
      if (flavorTags.length) {
        vibeBlock += `  • Craving: ${flavorTags.join(", ")}\n`;
      }
      if (styleTags.length) {
        vibeBlock += `  • Style: ${styleTags.join(", ")}\n`;
      }
    }
    if (negativeVibes.length) {
      const avoidTags = [
        ...new Set(negativeVibes.flatMap(c => c.tags?.mood || []))
      ];
      vibeBlock += `\nNOT in the mood for: ${avoidTags.join(", ")} — avoid suggestions that feel like these\n`;
    }

    const seasonLine = `\nCurrent season: ${season} in the northern hemisphere — lean toward seasonal ingredients where it genuinely improves the dish\n`;
    const ingredientsBlock = ingredients.trim()
      ? `\nIngredients available at home: ${ingredients}\nUse whichever of these make a natural fit for the dish — do not force all of them in\n`
      : "";

    let prompt;

    if (isHarmonized) {
      prompt = `Suggest exactly 3 harmonized meal combinations, each pairing a ${sessionContext.dishFormat} with a ${sessionContext.dishFormat2} that complement each other.\n\n`;
      prompt += contextBlock;
      prompt += vibeBlock;
      prompt += seasonLine;
      prompt += ingredientsBlock;
      prompt += `
Each combination should feel like a cohesive meal — the two dishes should share a flavour thread, contrast textures, or balance richness and freshness.

Please respond with exactly 3 suggestions in this JSON format:
{
  "suggestions": [
    { "mainTitle": "Main dish name", "sideTitle": "Side dish name", "description": "One sentence on why they work together (max 35 words)" },
    { "mainTitle": "Main dish name", "sideTitle": "Side dish name", "description": "One sentence on why they work together (max 35 words)" },
    { "mainTitle": "Main dish name", "sideTitle": "Side dish name", "description": "One sentence on why they work together (max 35 words)" }
  ]
}

Keep dish names specific and appetising. The description explains the harmony, not just what each dish is.
`;
    } else {
      prompt =
        "Suggest exactly 5 recipe titles that match the following user context:\n\n";
      prompt += contextBlock;
      if (sessionContext.dishFormat) {
        prompt += `Dish format: ${sessionContext.dishFormat} — all 5 suggestions MUST be this specific style of dish\n`;
      }
      prompt += vibeBlock;
      prompt += seasonLine;
      prompt += ingredientsBlock;
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
    }

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

    const isHarmonized = Boolean(
      sessionContext.dishFormat && sessionContext.dishFormat2
    );

    // For harmonized mode, selectedTitle is "mainTitle || sideTitle" combined string;
    // we extract both from the suggestion's stored titles (passed in as array or string).
    // selectedTitle is either a plain string (single) or "[main] + [side]" (harmonized).
    let prompt;

    if (
      isHarmonized &&
      typeof selectedTitle === "object" &&
      selectedTitle.mainTitle
    ) {
      // Harmonized: generate both recipes in one response
      prompt = `Generate two complete complementary recipes that form a harmonized meal:\n`;
      prompt += `Main: "${selectedTitle.mainTitle}"\n`;
      prompt += `Side: "${selectedTitle.sideTitle}"\n\n`;
    } else {
      prompt = `Generate a complete recipe for "${selectedTitle}"\n\n`;
    }

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
    if (!isHarmonized && sessionContext.dishFormat) {
      prompt += `Dish format: ${sessionContext.dishFormat} — the recipe MUST be this style of dish\n`;
    }

    if (vibes.length) {
      const moodTags = [...new Set(vibes.flatMap(c => c.tags?.mood || []))];
      const flavorTags = [...new Set(vibes.flatMap(c => c.tags?.flavor || []))];
      const styleTags = [...new Set(vibes.flatMap(c => c.tags?.style || []))];
      prompt += `\nMood: ${moodTags.join(", ")}\n`;
      if (flavorTags.length) {
        prompt += `Flavor cues: ${flavorTags.join(", ")}\n`;
      }
      if (styleTags.length) {
        prompt += `Style: ${styleTags.join(", ")}\n`;
      }
    }
    if (negativeVibes.length) {
      const avoidTags = [
        ...new Set(negativeVibes.flatMap(c => c.tags?.mood || []))
      ];
      prompt += `Avoid: ${avoidTags.join(", ")}\n`;
    }

    prompt += `Season: ${season} — use seasonal ingredients where appropriate\n`;

    if (ingredients.trim()) {
      prompt += `\nIngredients available: ${ingredients}\n`;
      prompt += `(Use whichever make a natural fit — no need to force all of them in)\n`;
    }

    if (
      isHarmonized &&
      typeof selectedTitle === "object" &&
      selectedTitle.mainTitle
    ) {
      prompt += `
Structure exactly like this (two separate recipes, separated by ---):

[Main Recipe Name]
===

Ingredients:
• [ingredient 1]
• [ingredient 2]

Instructions:
1. [step 1]
2. [step 2]

---

[Side Recipe Name]
===

Ingredients:
• [ingredient 1]
• [ingredient 2]

Instructions:
1. [step 1]
2. [step 2]

Do not omit headers. Keep each recipe concise but complete.
`;
    } else {
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
    }

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
    if (suggestion.isHarmonized) {
      return `
        <div class="recipe-suggestion-card recipe-suggestion-card--harmonized" data-suggestion-id="${suggestion.id}">
          <div class="suggestion-header">
            <div class="suggestion-number">${suggestion.index}</div>
            <div class="suggestion-meal-set">
              <div class="suggestion-meal-component suggestion-meal-main">
                <span class="suggestion-meal-tag">Main</span>
                <h3 class="suggestion-title">${suggestion.mainTitle}</h3>
              </div>
              <div class="suggestion-meal-divider">＋</div>
              <div class="suggestion-meal-component suggestion-meal-side">
                <span class="suggestion-meal-tag">Side</span>
                <h3 class="suggestion-title">${suggestion.sideTitle}</h3>
              </div>
            </div>
          </div>
          <div class="suggestion-description">
            <p>${suggestion.description}</p>
          </div>
          <div class="suggestion-actions">
            <button class="japandi-btn japandi-btn-primary select-recipe-btn" data-suggestion-id="${suggestion.id}">
              Cook This Meal
            </button>
          </div>
        </div>
      `;
    }
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
    const isHarmonized = suggestions.some(s => s.isHarmonized);
    const headerText = isHarmonized
      ? "Here are some harmonized meal ideas for you. Pick one to get both recipes!"
      : "Based on your preferences, here are 5 recipe suggestions. Click one to see the full recipe!";
    return `
      <div class="recipe-suggestions-container">
        <div class="suggestions-header">
          <h2>🍳 ${isHarmonized ? "Meal Ideas For You" : "Recipe Ideas For You"}</h2>
          <p>${headerText}</p>
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
