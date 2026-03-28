// Recipe text formatting and processing
export class RecipeFormatter {
  // Main formatting function — entry point
  static format(rawText = "") {
    // Handle legacy { recipe: "..." } object format stored before the refactor
    if (rawText && typeof rawText === "object") {
      rawText = rawText.recipe || "";
    }

    if (!rawText || typeof rawText !== "string") {
      return {
        html: "<p>No recipe available</p>",
        title: "Untitled Recipe",
        hasIngredients: false,
        hasInstructions: false,
        isMultiComponent: false,
        hasTimeline: false
      };
    }

    // Split by component separator (--- on its own line)
    const rawSections = rawText
      .split(/\n\s*---\s*\n/)
      .map(s => s.trim())
      .filter(Boolean);

    if (rawSections.length > 1) {
      return this._formatMultiComponent(rawSections);
    }

    // Single component — original behaviour
    const parsed = this._parseSingle(rawText);
    return {
      ...parsed,
      html: this._buildSingleHTML(parsed),
      isMultiComponent: false,
      hasTimeline: false
    };
  }

  // Parse a single recipe section into structured data (no HTML)
  static _parseSingle(rawText) {
    const lines = rawText.split("\n").map(l => l.trim());

    let title = "Untitled Recipe";
    const ingredients = [];
    const instructions = [];
    let currentSection = null;

    lines.forEach(line => {
      if (!line) {
        return;
      }

      // Skip === separator lines
      if (/^={2,}$/.test(line)) {
        return;
      }

      const lower = line.toLowerCase();

      // Section headers
      if (lower.includes("ingredients")) {
        currentSection = "ingredients";
        return;
      }
      if (lower.includes("instructions") || lower.includes("directions")) {
        currentSection = "instructions";
        return;
      }

      // First non-section, non-empty line is the title
      if (title === "Untitled Recipe") {
        title = line
          .replace(/\*\*/g, "")
          .replace(/__+/g, "")
          .replace(/^#+\s*/, "")
          .replace(/\*\*([^*]+)\*\*/g, "$1")
          .replace(/_([^_]+)_/g, "$1")
          .replace(/^Recipe\s+Name:\s*/i, "")
          .replace(/^Recipe:\s*/i, "")
          .replace(/^Name:\s*/i, "")
          .trim();
        return;
      }

      if (currentSection === "ingredients") {
        if (!/^\d+[\.\)]/.test(line)) {
          ingredients.push(line.replace(/^[-•\d.]+\s*/, ""));
        }
      }

      if (currentSection === "instructions") {
        instructions.push(line.replace(/^\d+[\).\s]*/, ""));
      }
    });

    return {
      title,
      ingredients,
      instructions,
      hasIngredients: ingredients.length > 0,
      hasInstructions: instructions.length > 0
    };
  }

  // Build HTML for a single-component recipe
  static _buildSingleHTML(parsed) {
    const { ingredients, instructions, hasIngredients, hasInstructions } =
      parsed;
    return `
    <div class="recipe-wrapper">
      ${
        hasIngredients
          ? `
        <div class="recipe-section" data-recipe-section="ingredients">
          <ul class="ingredients-list">
            ${ingredients.map(i => `<li>${i}</li>`).join("")}
          </ul>
        </div>`
          : ""
      }
      ${
        hasInstructions
          ? `
        <div class="recipe-section" data-recipe-section="instructions">
          <ol class="instructions-list">
            ${instructions.map(i => `<li>${i}</li>`).join("")}
          </ol>
        </div>`
          : ""
      }
    </div>`;
  }

  // Parse multiple sections into components + optional timeline
  static _formatMultiComponent(rawSections) {
    const components = [];
    let timeline = null;

    for (const section of rawSections) {
      const parsed = this._parseSingle(section);
      if (/timeline/i.test(parsed.title)) {
        // Timeline steps land in instructions array; fallback to raw lines if needed
        const steps =
          parsed.instructions.length > 0
            ? parsed.instructions
            : section
                .split("\n")
                .map(l => l.trim())
                .filter(
                  l =>
                    l &&
                    !/^(Cooking\s+)?Timeline/i.test(l) &&
                    !/^={2,}$/.test(l)
                )
                .map(l => l.replace(/^[-•*]\s*/, ""));
        timeline = { steps };
      } else {
        components.push(parsed);
      }
    }

    const html = this._buildMultiComponentHTML(components, timeline);
    return {
      isMultiComponent: true,
      components,
      timeline,
      html,
      title: components[0]?.title || "Recipe",
      hasIngredients: components.some(c => c.hasIngredients),
      hasInstructions: components.some(c => c.hasInstructions),
      hasTimeline: Boolean(timeline?.steps?.length)
    };
  }

  // Build HTML for a multi-component recipe
  static _buildMultiComponentHTML(components, timeline) {
    const ingredientsHtml = components
      .filter(c => c.hasIngredients)
      .map(
        c => `
        <div class="recipe-component-label">${c.title}</div>
        <ul class="ingredients-list">
          ${c.ingredients.map(i => `<li>${i}</li>`).join("")}
        </ul>`
      )
      .join("");

    const instructionsHtml = components
      .filter(c => c.hasInstructions)
      .map(
        c => `
        <div class="recipe-component-label">${c.title}</div>
        <ol class="instructions-list instructions-list--reset">
          ${c.instructions.map(i => `<li>${i}</li>`).join("")}
        </ol>`
      )
      .join("");

    const timelineHtml = timeline?.steps?.length
      ? `<div class="recipe-timeline">
          ${timeline.steps.map(s => `<div class="timeline-step">${s}</div>`).join("")}
        </div>`
      : "";

    return `
    <div class="recipe-wrapper">
      <div class="recipe-section" data-recipe-section="ingredients">
        ${ingredientsHtml}
      </div>
      <div class="recipe-section" data-recipe-section="instructions">
        ${instructionsHtml}
      </div>
      ${timeline ? `<div class="recipe-section" data-recipe-section="timeline">${timelineHtml}</div>` : ""}
    </div>`;
  }

  // Extract just the title
  static extractTitle(recipeText) {
    if (recipeText && typeof recipeText === "object") {
      recipeText = recipeText.recipe || "";
    }
    if (!recipeText || typeof recipeText !== "string") {
      return "Untitled Recipe";
    }

    const lines = recipeText.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (
        trimmed &&
        !trimmed.toLowerCase().includes("ingredients") &&
        !trimmed.toLowerCase().includes("instructions")
      ) {
        return trimmed.replace(/^(Recipe Name:|Recipe:)\s*/i, "").trim();
      }
    }

    return "Untitled Recipe";
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
