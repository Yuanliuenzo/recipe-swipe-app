/**
 * Question Engine - Modular UX Question System
 * Handles the minimal essential questions that swipes cannot answer
 *
 * Design Principles:
 * - Questions earn their place only if swipes can't answer them
 * - Visual, single-tap interactions (no forms)
 * - Mood-first exploration preserved
 * - Modular for easy adjustment
 */

export class QuestionEngine {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.currentStep = 0;
    this.questions = this.initializeQuestions();
  }

  /**
   * Initialize question modules based on UX principles
   * Only questions that swipes CANNOT answer
   */
  initializeQuestions() {
    return [
      // Core: Meal Occasion + Hunger Level (combined visual screen)
      {
        id: "meal-context",
        type: "visual-grid",
        component: "MealContextQuestion",
        required: true,
        reason: "Swipes cannot determine meal occasion or hunger level",
        config: {
          options: [
            { id: "breakfast-light", label: "Light Breakfast", icon: "☀️🥐" },
            { id: "breakfast-hearty", label: "Hearty Breakfast", icon: "🍳🥓" },
            { id: "lunch-light", label: "Light Lunch", icon: "🥗☀️" },
            { id: "lunch-hearty", label: "Hearty Lunch", icon: "🍔🍟" },
            { id: "dinner-light", label: "Light Dinner", icon: "🐟🥗" },
            { id: "dinner-hearty", label: "Hearty Dinner", icon: "🍝🥩" },
            { id: "snack", label: "Snack", icon: "🍿🍎" },
            { id: "dessert", label: "Dessert", icon: "🍰🍨" }
          ]
        }
      },

      // Optional: Specialist Mode (contextually filtered based on meal type)
      {
        id: "specialist-mode",
        type: "optional-grid",
        component: "SpecialistModeQuestion",
        required: false,
        reason:
          "Opt-in specialist mode for users with specific intent, filtered by meal context",
        config: {
          title: "Any specific craving?",
          getContextualOptions: (mealContext, getDefaultOptions) => {
            if (!mealContext) {
              return getDefaultOptions();
            }

            const { timeOfDay } = mealContext;

            switch (timeOfDay) {
              case "breakfast":
                return [
                  {
                    id: "surprise-me",
                    label: "Surprise Me",
                    icon: "🎲",
                    default: true
                  },
                  { id: "breakfast-chef", label: "Breakfast Chef", icon: "🍳" },
                  {
                    id: "smoothie-master",
                    label: "Smoothie Master",
                    icon: "🥤"
                  },
                  { id: "bakery-expert", label: "Bakery Expert", icon: "🥐" },
                  {
                    id: "coffee-connoisseur",
                    label: "Coffee Expert",
                    icon: "☕"
                  },
                  { id: "healthy-start", label: "Healthy Start", icon: "🥗" }
                ];
              case "lunch":
                return [
                  {
                    id: "surprise-me",
                    label: "Surprise Me",
                    icon: "🎲",
                    default: true
                  },
                  { id: "sandwich-chef", label: "Sandwich Chef", icon: "🥪" },
                  { id: "salad-master", label: "Salad Master", icon: "🥗" },
                  { id: "soup-expert", label: "Soup Expert", icon: "🍲" },
                  { id: "bowl-builder", label: "Bowl Builder", icon: "🍜" },
                  { id: "quick-bites", label: "Quick Bites", icon: "🍱" }
                ];
              case "dinner":
                return [
                  {
                    id: "surprise-me",
                    label: "Surprise Me",
                    icon: "🎲",
                    default: true
                  },
                  { id: "pasta-perfect", label: "Pasta Perfect", icon: "🍝" },
                  { id: "grill-master", label: "Grill Master", icon: "🔥" },
                  { id: "roast-expert", label: "Roast Expert", icon: "🍖" },
                  { id: "stews-slow", label: "Slow Cooker", icon: "🕐" },
                  { id: "global-flavors", label: "Global Flavors", icon: "🌍" }
                ];
              case "snack":
                return [
                  {
                    id: "surprise-me",
                    label: "Surprise Me",
                    icon: "🎲",
                    default: true
                  },
                  { id: "quick-snacks", label: "Quick Snacks", icon: "🍿" },
                  { id: "healthy-snacks", label: "Healthy Snacks", icon: "🥨" },
                  { id: "sweet-snacks", label: "Sweet Snacks", icon: "🍪" },
                  { id: "savory-bites", label: "Savory Bites", icon: "🧀" },
                  { id: "energy-boost", label: "Energy Boost", icon: "⚡" }
                ];
              case "dessert":
                return [
                  {
                    id: "surprise-me",
                    label: "Surprise Me",
                    icon: "🎲",
                    default: true
                  },
                  { id: "pastry-chef", label: "Pastry Chef", icon: "🧁" },
                  {
                    id: "chocolate-master",
                    label: "Chocolate Master",
                    icon: "🍫"
                  },
                  { id: "frozen-treats", label: "Frozen Treats", icon: "🍦" },
                  { id: "fruit-fresh", label: "Fruit Fresh", icon: "🍓" },
                  { id: "baked-goods", label: "Baked Goods", icon: "🥖" }
                ];
              default:
                return getDefaultOptions();
            }
          }
        }
      },

      // Optional: Time Constraints (post-swipe, opt-in)
      {
        id: "time-constraint",
        type: "optional-slider",
        component: "TimeConstraintQuestion",
        required: false,
        reason: "Hard time constraints for users with urgency",
        config: {
          title: "How much time?",
          options: [
            { id: "quick", label: "Quick (15 min)", icon: "⚡" },
            {
              id: "normal",
              label: "Normal (30 min)",
              icon: "⏰",
              default: true
            },
            { id: "leisurely", label: "Leisurely (60+ min)", icon: "🕐" }
          ]
        }
      }
    ];
  }

  /**
   * Get next question to display
   */
  getNextQuestion() {
    // Show all questions in order, letting optional ones be skippable
    for (let i = this.currentStep; i < this.questions.length; i++) {
      const question = this.questions[i];

      // Always show the next question in sequence
      // Optional questions will have skip buttons in their UI
      this.currentStep = i + 1;

      // For specialist mode, get contextual options based on meal context
      if (question.id === "specialist-mode") {
        const mealContext = this.stateManager.get("mealContext");

        // Create a copy of the question to avoid mutating the original
        const questionCopy = {
          id: question.id,
          type: question.type,
          component: question.component,
          required: question.required,
          reason: question.reason,
          config: {
            title: question.config.title,
            getContextualOptions: question.config.getContextualOptions
          }
        };

        if (question.config.getContextualOptions) {
          questionCopy.config.options = question.config.getContextualOptions(
            mealContext,
            this.getDefaultSpecialistOptions.bind(this)
          );
        }

        return questionCopy;
      }

      return question;
    }

    return null; // No more questions
  }

  /**
   * Get default specialist options (fallback)
   */
  getDefaultSpecialistOptions() {
    return [
      { id: "surprise-me", label: "Surprise Me", icon: "🎲", default: true },
      { id: "quick-easy", label: "Quick & Easy", icon: "⚡" },
      { id: "healthy-fresh", label: "Healthy & Fresh", icon: "🥗" },
      { id: "comfort-food", label: "Comfort Food", icon: "🍲" },
      { id: "global-flavors", label: "Global Flavors", icon: "🌍" },
      { id: "sweet-treats", label: "Sweet Treats", icon: "🍰" }
    ];
  }

  /**
   * Process answer and update state
   */
  processAnswer(questionId, answer) {
    const question = this.questions.find(q => q.id === questionId);
    if (!question) {
      return;
    }

    // Update state based on answer
    this.updateStateForAnswer(question, answer);

    // Store answer for potential personalization
    const answers = this.stateManager.get("questionAnswers") || {};
    answers[questionId] = answer;
    this.stateManager.setState({ questionAnswers: answers });
  }

  /**
   * Update application state based on question answer
   */
  updateStateForAnswer(question, answer) {
    switch (question.id) {
      case "meal-context":
        this.updateMealContext(answer);
        break;
      case "specialist-mode":
        this.updateSpecialistMode(answer);
        break;
      case "time-constraint":
        this.updateTimeConstraint(answer);
        break;
    }
  }

  /**
   * Update meal context state
   */
  updateMealContext(answer) {
    const [timeOfDay, hunger] = answer.id.split("-");

    this.stateManager.setState({
      mealContext: {
        timeOfDay, // breakfast, lunch, dinner, snack, dessert
        hunger, // light, hearty
        fullAnswer: answer
      }
    });
  }

  /**
   * Update specialist mode state
   */
  updateSpecialistMode(answer) {
    this.stateManager.setState({
      specialistMode: answer.id === "surprise-me" ? null : answer.id
    });
  }

  /**
   * Update time constraint state
   */
  updateTimeConstraint(answer) {
    this.stateManager.setState({
      timeConstraint: answer.id
    });
  }

  /**
   * Get prompt modifiers based on all answered questions
   */
  getPromptModifiers() {
    const modifiers = [];

    // Meal context modifiers
    const mealContext = this.stateManager.get("mealContext");
    if (mealContext) {
      modifiers.push(this.getMealContextPrompt(mealContext));
    }

    // Specialist mode modifiers
    const specialistMode = this.stateManager.get("specialistMode");
    if (specialistMode) {
      modifiers.push(this.getSpecialistPrompt(specialistMode));
    }

    // Time constraint modifiers
    const timeConstraint = this.stateManager.get("timeConstraint");
    if (timeConstraint) {
      modifiers.push(this.getTimeConstraintPrompt(timeConstraint));
    }

    return modifiers;
  }

  /**
   * Generate meal context prompt modifier
   */
  getMealContextPrompt(mealContext) {
    const { timeOfDay, hunger } = mealContext;

    const timePrompts = {
      breakfast: "breakfast",
      lunch: "lunch",
      dinner: "dinner",
      snack: "snack",
      dessert: "dessert"
    };

    const hungerPrompts = {
      light: "light and refreshing",
      hearty: "hearty and satisfying"
    };

    return `${timePrompts[timeOfDay]} that is ${hungerPrompts[hunger]}`;
  }

  /**
   * Generate specialist mode prompt modifier
   */
  getSpecialistPrompt(specialistMode) {
    const specialistPrompts = {
      // Breakfast specialists
      "breakfast-chef":
        "focus on breakfast dishes like eggs, pancakes, and oatmeal",
      "smoothie-master": "focus on smoothies and breakfast drinks",
      "bakery-expert": "focus on baked goods like pastries, muffins, and bread",
      "coffee-connoisseur": "focus on coffee-based breakfast items",
      "healthy-start": "focus on healthy and nutritious breakfast options",

      // Lunch specialists
      "sandwich-chef": "focus on sandwiches, wraps, and handheld lunch items",
      "salad-master": "focus on fresh salads and grain bowls",
      "soup-expert": "focus on soups and stews perfect for lunch",
      "bowl-builder": "focus on nourish bowls and power bowls",
      "quick-bites": "focus on quick and easy lunch options",

      // Dinner specialists
      "pasta-perfect": "focus on pasta dishes and Italian cuisine",
      "grill-master": "focus on grilled meats and vegetables",
      "roast-expert": "focus on roasted dishes and oven meals",
      "stews-slow": "focus on slow-cooked stews and casseroles",
      "global-flavors": "focus on international dinner cuisines",

      // Snack specialists
      "quick-snacks": "focus on quick snack items and finger foods",
      "healthy-snacks": "focus on nutritious and healthy snack options",
      "sweet-snacks": "focus on sweet snacks and desserts",
      "savory-bites": "focus on savory snack options",
      "energy-boost": "focus on high-energy and protein-rich snacks",

      // Dessert specialists
      "pastry-chef": "focus on pastries, cakes, and baked desserts",
      "chocolate-master": "focus on chocolate-based desserts",
      "frozen-treats": "focus on ice cream, sorbets, and frozen desserts",
      "fruit-fresh": "focus on fruit-based and fresh desserts",
      "baked-goods": "focus on baked desserts and sweet treats",

      // General specialists
      "quick-easy": "focus on quick and easy recipes",
      "healthy-fresh": "focus on healthy and fresh ingredients",
      "comfort-food": "focus on comforting and hearty dishes",
      "sweet-treats": "focus on sweet desserts and treats"
    };

    return specialistPrompts[specialistMode] || "";
  }

  /**
   * Generate time constraint prompt modifier
   */
  getTimeConstraintPrompt(timeConstraint) {
    const timePrompts = {
      quick: "ready in 15 minutes or less",
      normal: "ready in about 30 minutes",
      leisurely: "can take 60 minutes or more"
    };

    return timePrompts[timeConstraint] || "";
  }

  /**
   * Reset question engine for new session
   */
  reset() {
    this.currentStep = 0;
    this.stateManager.setState({
      mealContext: null,
      specialistMode: null,
      timeConstraint: null
    });
  }

  /**
   * Check if questions are complete
   */
  isComplete() {
    const requiredQuestions = this.questions.filter(q => q.required);
    const answers = this.stateManager.get("questionAnswers") || {};

    return requiredQuestions.every(q => answers[q.id]);
  }
}
