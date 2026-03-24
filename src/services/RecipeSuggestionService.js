// RecipeSuggestionService.js
// Handles two-stage recipe generation: title suggestions first, full recipe later

import { apiService } from "../core/ApiService.js";
import { RecipeFormatter } from "../shared/RecipeFormatter.js";
import { getCurrentSeason } from "../utils/LLMUtils.js";
import { CONFIG, DISH_FORMATS } from "../core/Config.js";

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

        // Map suggestions to internal format
        const suggestions = (
          parsedSuggestions || this.fallbackSuggestions()
        ).map((s, idx) => {
          // Normalize to components array — LLM may return components[] or a legacy title string
          const components =
            Array.isArray(s.components) && s.components.length > 0
              ? s.components
              : [s.title || `Recipe ${idx + 1}`];
          return {
            id: this.generateId(),
            index: idx + 1,
            title: components[0], // main dish name for display
            components, // full array drives card rendering + recipe generation
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
      const prompt = this.buildFullRecipePrompt(suggestion);

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
  // Quick dish-direction suggester (called from questionnaire before swiping)
  // --------------------------

  async suggestFoodDirections(context, ingredients) {
    const { mealType, servingSize, timeAvailable } = context;

    const mealLabels = {
      breakfast: "breakfast",
      brunch: "brunch",
      lunch: "lunch",
      dinner: "dinner",
      snack: "snack"
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

    const prompt = `You are a creative food editor helping someone choose a culinary direction for their meal.
The direction they pick will be used to generate 5 different recipe ideas — so it must be
broad enough that 5 distinctly different dishes could all fit comfortably within it.

Context:
- Meal: ${mealLabels[mealType] || mealType}
- People: ${servingLabels[servingSize] || "unspecified"}
- Time available: ${timeLabels[timeAvailable] || "flexible"}
- Ingredients on hand: ${ingredients?.trim() || "nothing specific"}

Suggest 3–4 culinary directions (cuisine, mood, or cooking style).
Each direction must be broad enough to inspire 5 completely different recipes.

BAD (too narrow — only one dish fits):
  "Golden eggs & greens", "Shakshuka", "Stir-fried spinach", "Pan-fried egg", "Egg dish", "Salad" — these are recipes, not directions.

GOOD (broad enough for 5 diverse recipes):
  "Mediterranean" → shakshuka, frittata, baked feta, tabbouleh, egg drop soup with herbs
  "Italian comfort" → pasta, frittata, bruschetta, ribollita, uova in purgatorio
  "Middle Eastern warmth" → shakshuka, fatteh, spinach with tahini, pilafs, flatbreads
  "Light & Japanese-inspired" → miso soup, onsen tamago, salads, rice bowls, dashi broth dishes

If ingredients were provided, lean toward directions where they fit naturally — but the direction itself stays broad.

Respond ONLY with JSON (no extra text):
{
  "directions": [
    {"label": "Mediterranean", "emoji": "🫒", "prompt": "Mediterranean-inspired cooking — varied dishes in this tradition"},
    {"label": "Italian comfort", "emoji": "🍅", "prompt": "Italian home cooking — pasta, eggs, soups, or vegetable dishes"},
    {"label": "Light & Asian-inspired", "emoji": "🥢", "prompt": "Light Asian-influenced dishes — quick, fresh, umami-forward"}
  ]
}

Rules: labels 1–3 words (cuisine name or short mood), punchy; 3–4 directions; the "prompt" field describes the culinary tradition or style in one phrase.`;

    try {
      const response = await apiService.post(
        CONFIG.ENDPOINTS.GENERATE_RECIPE,
        { prompt, suggestions: false },
        30000
      );
      const rawText =
        response?.recipe ?? (typeof response === "string" ? response : "");
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed.directions) && parsed.directions.length > 0) {
          return parsed.directions;
        }
      }
    } catch (err) {
      console.warn(
        "⚠️ suggestFoodDirections failed, using fallback:",
        err.message
      );
    }

    // Fallback: static DISH_FORMATS for this meal type (exclude "any")
    return (DISH_FORMATS[mealType] || DISH_FORMATS.dinner)
      .filter(f => f.value !== "any")
      .slice(0, 4)
      .map(f => ({ label: f.label, emoji: f.emoji, prompt: f.prompt }));
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

    let prompt =
      "Suggest exactly 5 recipe ideas that match the following user context:\n\n";
    prompt += contextBlock;
    if (sessionContext.dishFormat) {
      prompt += `Culinary direction: ${sessionContext.dishFormat} — all 5 suggestions should feel like they belong to this culinary tradition or mood. Vary the dish format freely.\n`;
    }
    prompt += vibeBlock;
    prompt += seasonLine;
    prompt += ingredientsBlock;
    prompt += `
For each recipe, think about what makes a complete, satisfying meal:
- Some dishes are naturally standalone (a hearty soup, a grain bowl, shakshuka) — list only one component.
- Some genuinely benefit from a side (pasta + salad, grilled fish + roasted veg) — list two.
- Some are a full composed meal (tagine + couscous + yogurt dip) — list all natural components, max 3.
Only add components when they genuinely make the meal better.

Please respond with exactly 5 suggestions in this JSON format:
{
  "suggestions": [
    { "components": ["Shakshuka"], "description": "Brief explanation (max 40 words)" },
    { "components": ["Tagliatelle al Ragù", "Rocket & parmesan salad"], "description": "Brief explanation (max 40 words)" },
    { "components": ["Moroccan Chicken Tagine", "Saffron Couscous", "Harissa Yogurt"], "description": "Brief explanation (max 40 words)" }
  ]
}

components[0] is always the main dish. Additional entries are natural accompaniments (max 3 total). Keep all names specific and appetising. Descriptions hint at why each matches the mood.
`;

    return prompt;
  }

  buildFullRecipePrompt(suggestion) {
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

    // Normalize to components array (suggestion object or legacy string)
    const components =
      suggestion &&
      Array.isArray(suggestion.components) &&
      suggestion.components.length > 0
        ? suggestion.components
        : [
            typeof suggestion === "string"
              ? suggestion
              : suggestion?.title || "Recipe"
          ];

    const isMultiComponent = components.length > 1;
    const componentLabels = ["Main dish", "Side dish", "Accompaniment"];

    // Opening line
    let prompt;
    if (isMultiComponent) {
      const list = components
        .map(
          (name, i) =>
            `${componentLabels[i] || `Component ${i + 1}`}: "${name}"`
        )
        .join("\n");
      prompt = `Generate complete recipes for the following meal:\n${list}\n\n`;
    } else {
      prompt = `Generate a complete recipe for "${components[0]}"\n\n`;
    }

    // Context
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

    // Output structure
    if (isMultiComponent) {
      const sectionTemplate = (name, brief) => `
${name}
===

Ingredients:
• [ingredient 1]
• [ingredient 2]

Instructions:
1. [step 1]
2. [step 2]
${brief ? "\n(Keep this section brief — simple preparation)" : ""}`;
      const sections = components
        .map((name, i) => sectionTemplate(name, i > 0))
        .join("\n\n---\n");
      prompt += `
Structure exactly like this (one section per component, separated by ---):
${sections}

Do not omit headers. Keep each recipe concise but complete.
`;
    } else {
      prompt += `
Structure exactly like this:

${components[0]}
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
        components: ["Fresh Garden Salad"],
        description: "Light, healthy salad with seasonal vegetables"
      },
      {
        components: ["Comforting Vegetable Soup"],
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
    const components = suggestion.components || [suggestion.title];
    const accompaniments = components.slice(1);
    const accompHtml = accompaniments
      .map(
        name => `<div class="suggestion-component-line">
          <span class="suggestion-component-plus">+</span>
          <span class="suggestion-component-name">${name}</span>
        </div>`
      )
      .join("");
    const btnLabel =
      accompaniments.length > 0 ? "Cook This Meal" : "Choose This Recipe";

    return `
      <div class="recipe-suggestion-card" data-suggestion-id="${suggestion.id}">
        <div class="suggestion-header">
          <div class="suggestion-number">${suggestion.index}</div>
          <div class="suggestion-title-group">
            <h3 class="suggestion-title">${components[0]}</h3>
            ${accompHtml}
          </div>
        </div>
        <div class="suggestion-description">
          <p>${suggestion.description}</p>
        </div>
        <div class="suggestion-actions">
          <button class="japandi-btn japandi-btn-primary select-recipe-btn" data-suggestion-id="${suggestion.id}">
            ${btnLabel}
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
          <p>Based on your preferences, here are 5 suggestions. Click one to see the full recipe!</p>
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
