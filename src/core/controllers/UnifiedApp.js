/**
 * Unified App Controller
 * Handles all device types with responsive behavior
 */

import { globalStateManager } from "../StateManager.js";
import { DeviceUtils } from "../../utils/DeviceUtils.js";
import { VibeEngine } from "../../shared/VibeEngine.js";
import { SwipeEngine } from "../../components/SwipeEngine/SwipeEngine.js";
import { VibeCard } from "../../components/Card/VibeCard.js";
import { RecipeSuggestionService } from "../../services/RecipeSuggestionService.js";
import { FavoritesService } from "../../services/FavoritesService.js";
import { UserPreferencesService } from "../../services/UserPreferencesService.js";
import { NavigationService } from "../../services/NavigationService.js";
import { apiService } from "../ApiService.js";
import { RecipeFormatter } from "../../shared/RecipeFormatter.js";
import { PromptBuilder } from "../../shared/PromptBuilder.js";
import { RecipeDetailView } from "../../components/views/RecipeDetailView.js";
import { RecipeSuggestionsView } from "../../components/views/RecipeSuggestionsView.js";
import { CONFIG } from "../Config.js";
import { QuestionEngine } from "../QuestionEngine.js";

export class UnifiedApp {
  constructor(serviceRegistry, componentRegistry) {
    this.serviceRegistry = serviceRegistry;
    this.componentRegistry = componentRegistry;
    this.isInitialized = false;

    // Core engines
    this.vibeEngine = new VibeEngine();
    this.swipeEngine = null;
    this.currentCard = null;

    // Services - use existing state-of-the-art services
    this.favoritesService = new FavoritesService(
      globalStateManager,
      apiService
    );
    this.userPreferencesService = new UserPreferencesService(
      globalStateManager,
      apiService
    );
    this.navigationService = new NavigationService(
      this.favoritesService,
      this.userPreferencesService
    );
    this.recipeSuggestionService = new RecipeSuggestionService(
      globalStateManager
    );

    // 🆕 Question Engine for minimal essential questions
    this.questionEngine = new QuestionEngine(globalStateManager);
    this.currentQuestionView = null;

    // Now inject dependencies back into services
    this.favoritesService.navigationService = this.navigationService;
    this.favoritesService.recipeFormatter = this.recipeFormatter;
    this.userPreferencesService.navigationService = this.navigationService;

    // Shared utilities
    this.recipeFormatter = RecipeFormatter;
    this.promptBuilder = PromptBuilder;

    // UI state
    this.containers = {};
    this.deviceInfo = DeviceUtils.getDeviceInfo();

    // Views
    this.currentView = null;
    this.recipeDetailView = null;
    this.recipeSuggestionsView = null;
  }

  async initialize() {
    if (this.isInitialized) {
      console.warn("UnifiedApp already initialized");
      return;
    }

    try {
      // 1. Initialize services
      await this.initializeServices();

      // 2. Setup DOM containers
      this.setupContainers();

      // 3. Initialize vibe engine
      this.vibeEngine.reset();

      // 4. Load user data
      await this.loadUserData();

      // 5. Create first card
      await this.createFirstCard();

      // 6. Setup event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      console.log("✅ Unified App initialized successfully!");
    } catch (error) {
      console.error("❌ Failed to initialize Unified App:", error);
      throw error;
    }
  }

  async initializeServices() {
    // Initialize all existing state-of-the-art services
    await this.favoritesService.initialize();
    await this.userPreferencesService.initialize();

    // Register services in registry for global access
    this.serviceRegistry.register("favorites", this.favoritesService);
    this.serviceRegistry.register(
      "userPreferences",
      this.userPreferencesService
    );
    this.serviceRegistry.register("navigation", this.navigationService);
    this.serviceRegistry.register(
      "recipeSuggestion",
      this.recipeSuggestionService
    );
    this.serviceRegistry.register("api", apiService);

    console.log("✅ All existing services initialized and registered");
  }

  setupContainers() {
    // Find containers based on current DOM structure
    this.containers = {
      cardContainer:
        document.querySelector(".mobile-card-container") ||
        document.querySelector(".card-container"),
      resultContainer: document.querySelector(".mobile-result"),
      headerContainer: document.querySelector(".mobile-header"),
      navigationContainer: document.querySelector(".mobile-navigation")
    };

    // Validate containers
    Object.entries(this.containers).forEach(([key, container]) => {
      if (
        !container &&
        key !== "resultContainer" &&
        key !== "navigationContainer"
      ) {
        console.warn(`⚠️ Container not found: ${key}`);
      }
    });
  }

  async loadUserData() {
    try {
      await apiService.getUserData();
      console.log("✅ User data loaded");
    } catch (error) {
      console.warn("⚠️ Failed to load user data:", error.message);
      console.log("🎯 Continuing with default state...");
    }
  }

  async createFirstCard() {
    const firstVibe = this.vibeEngine.getNextVibe();
    if (!firstVibe) {
      console.error("❌ No vibes available");
      return;
    }

    console.log("🎯 Creating first vibe card:", firstVibe.name);

    // Store current vibe
    globalStateManager.setState({ currentVibe: firstVibe });

    // Create card
    if (this.containers.cardContainer) {
      this.currentCard = new VibeCard(this.containers.cardContainer, {
        vibe: firstVibe
      });
      this.currentCard.mount();

      // Setup swipe handling
      this.setupSwipeHandling();

      // Initialize round progress display
      this.updateRoundProgress(1);

      console.log("✅ First card created successfully");
    } else {
      console.error("❌ No card container found");
    }
  }

  setupSwipeHandling() {
    if (!this.currentCard) {
      return;
    }

    const cardElement = this.containers.cardContainer.querySelector(
      ".vibe-card, .mobile-vibe-card"
    );
    if (!cardElement) {
      return;
    }

    // Create swipe engine
    this.swipeEngine = new SwipeEngine(cardElement, {
      onSwipeLeft: () => this.handleSwipe("left"),
      onSwipeRight: () => this.handleSwipe("right"),
      maxRotation: 15
    });

    // Add fallback click handler
    cardElement.addEventListener("click", () => {
      console.log("👆 Card clicked - simulating swipe right");
      this.handleSwipe("right");
    });

    // Add keyboard support
    document.addEventListener("keydown", e => {
      if (e.key === "ArrowRight") {
        this.handleSwipe("right");
      }
      if (e.key === "ArrowLeft") {
        this.handleSwipe("left");
      }
    });
  }

  handleSwipe(direction) {
    const currentVibe = globalStateManager.get("currentVibe");

    if (!currentVibe) {
      this.showResult();
      return;
    }

    console.log(`👆 Swipe ${direction}: ${currentVibe.name}`);

    if (direction === "right") {
      // Add to profile
      const currentProfile = globalStateManager.get("vibeProfile");
      const updatedProfile = [...currentProfile, currentVibe];
      globalStateManager.setState({ vibeProfile: updatedProfile });
      console.log(`❤️ Added ${currentVibe.name} to profile`);

      // Update round progress
      this.updateRoundProgress(updatedProfile.length);
    }

    // Show next card
    this.showNextCard();
  }

  showNextCard() {
    const nextVibe = this.vibeEngine.getNextVibe();
    if (nextVibe) {
      console.log(`🔄 Loading next vibe: ${nextVibe.name}`);

      // Store current vibe
      globalStateManager.setState({ currentVibe: nextVibe });

      // Clear and create new card
      this.containers.cardContainer.innerHTML = "";
      this.currentCard = new VibeCard(this.containers.cardContainer, {
        vibe: nextVibe
      });
      this.currentCard.mount();

      // Setup swipe handling for new card
      this.setupSwipeHandling();
    } else {
      this.showResult();
    }
  }

  showResult() {
    const profile = globalStateManager.get("vibeProfile");
    console.log("🎉 Showing result with profile:", profile);

    if (profile.length > 0) {
      this.showRecipeGeneration(profile);
    } else {
      this.showSimpleResult();
    }
  }

  showRecipeGeneration() {
    // Hide main container, show result container
    const mobileContainer = document.querySelector(".mobile-container");
    const resultContainer = this.containers.resultContainer;

    if (mobileContainer) {
      mobileContainer.style.display = "none";
    }

    if (resultContainer) {
      resultContainer.style.display = "block";
      resultContainer.classList.add("show");

      const recipeCard = resultContainer.querySelector(".mobile-recipe-card");
      if (recipeCard) {
        recipeCard.innerHTML = this.createIngredientsInput();
        recipeCard.classList.add("suggestions-mode");
        this.setupIngredientsActions(recipeCard);
      }
    }
  }

  createIngredientsInput() {
    return `
      <div class="ingredients-container">
        <h2>🍳 Ready to Cook!</h2>
        <p style="color: #666;">Let's find you a delicious recipe!</p>
        <h3>🏡 What do you have at home?</h3>
        <p class="ingredients-subtitle">Optional: Add ingredients you'd like to use</p>
        <textarea class="ingredients-input" placeholder="chicken breast, rice, garlic, spinach..." rows="3"></textarea>
        <div class="ingredients-actions">
          <button class="japandi-btn japandi-btn-subtle add-ingredients-btn" type="button">+ Add Ingredients</button>
        </div>
        <div class="ingredients-confirmation"></div>
        <button class="japandi-btn japandi-btn-primary mobile-generate-btn" type="button">💡 Get Recipe Suggestions</button>
      </div>
    `;
  }

  setupIngredientsActions(recipeCard) {
    const addBtn = recipeCard.querySelector(".add-ingredients-btn");
    const ingredientsInput = recipeCard.querySelector(".ingredients-input");
    const confirmation = recipeCard.querySelector(".ingredients-confirmation");
    const generateBtn = recipeCard.querySelector(".mobile-generate-btn");

    addBtn.addEventListener("click", () => {
      const rawValue = ingredientsInput.value.trim();
      if (rawValue) {
        const newItems = rawValue
          .split(",")
          .map(item => item.trim().toLowerCase())
          .filter(item => item.length > 0);
        const existingItems =
          globalStateManager
            .get("ingredientsAtHome")
            ?.split(",")
            .map(item => item.trim().toLowerCase()) || [];
        const combined = [...existingItems, ...newItems];
        const uniqueItems = [...new Set(combined)];

        globalStateManager.setState({
          ingredientsAtHome: uniqueItems.join(", ")
        });
        ingredientsInput.value = "";

        confirmation.textContent = `✅ Added: ${newItems.join(", ")}`;
        confirmation.style.color = "#4CAF50";
        confirmation.classList.add("show");

        setTimeout(() => confirmation.classList.remove("show"), 3000);
      }
    });

    generateBtn.addEventListener("click", async () => {
      generateBtn.innerHTML =
        '<span class="mobile-loading-spinner"></span> Getting suggestions... (this may take 30+ seconds)';
      generateBtn.disabled = true;

      try {
        // 🆕 Show questions first, then suggestions
        await this.showQuestionFlow(recipeCard);
      } catch (error) {
        console.error("Failed to start question flow:", error);
        generateBtn.textContent = "Try Again";
        generateBtn.disabled = false;
      }
    });
  }

  handleRecipeSelected(suggestion) {
    this.showRecipeDetailView(
      this.containers.resultContainer.querySelector(".mobile-recipe-card"),
      suggestion
    );
  }

  showRecipeDetailView(container, suggestion) {
    this.recipeDetailView = new RecipeDetailView(container, {
      serviceRegistry: this.serviceRegistry
    });

    this.recipeDetailView.on("backToSuggestions", () => {
      this.showSuggestionsView(container);
    });

    this.currentView = this.recipeDetailView;
    this.recipeDetailView.render(suggestion);
  }

  showSimpleResult() {
    const container = this.containers.cardContainer;
    if (!container) {
      return;
    }

    container.innerHTML = `
      <div style="
        text-align: center; 
        padding: 40px; 
        color: white;
        font-family: 'Noto Sans', sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 15px;
        margin: 0 auto;
        max-width: 400px;
      ">
        <h2 style="font-size: 32px; margin-bottom: 20px;">🎉 That's What's Cooking!</h2>
        <p style="font-size: 18px; margin-bottom: 30px;">Ready to find a recipe!</p>
        <button onclick="location.reload()" style="
          background: white;
          color: #333;
          border: none;
          padding: 12px 24px;
          border-radius: 25px;
          font-size: 16px;
          cursor: pointer;
          margin-top: 20px;
        ">Start Over</button>
      </div>
    `;
  }

  updateRoundProgress(currentRound) {
    try {
      const roundIndicator = document.querySelector(".round-indicator");
      if (!roundIndicator) {
        console.warn("Round indicator not found");
        return;
      }

      const maxRounds = CONFIG.MAX_VIBE_ROUNDS;
      const progressPercentage =
        maxRounds > 0 ? (currentRound / maxRounds) * 100 : 0;

      roundIndicator.setAttribute("data-round", currentRound.toString());

      const roundText = roundIndicator.querySelector(".round-text");
      if (roundText) {
        roundText.textContent = `Round ${currentRound} of ${maxRounds}`;
      }

      const progressBar = roundIndicator.querySelector(".round-progress");
      if (progressBar) {
        progressBar.style.width = `${progressPercentage}%`;
      }

      const dots = roundIndicator.querySelectorAll(".round-dot");
      dots.forEach((dot, index) => {
        if (index < currentRound) {
          dot.classList.add("active");
        } else {
          dot.classList.remove("active");
        }
      });

      console.log(
        `📊 Updated round progress: ${currentRound}/${maxRounds} (${progressPercentage.toFixed(1)}%)`
      );
    } catch (error) {
      console.error("❌ Failed to update round progress:", error);
    }
  }

  setupEventListeners() {
    // Setup navigation using existing NavigationService
    // The navigation service is already initialized in constructor
    // No setupNavigation method needed - it's ready to use

    // Setup global keyboard shortcuts
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        this.handleEscapeKey();
      }
    });
  }

  handleEscapeKey() {
    // Handle escape key based on current state
    const resultContainer = this.containers.resultContainer;
    const mobileContainer = document.querySelector(".mobile-container");

    if (resultContainer && resultContainer.style.display !== "none") {
      // Go back to main view
      resultContainer.style.display = "none";
      resultContainer.classList.remove("show");

      if (mobileContainer) {
        mobileContainer.style.display = "flex";
      }
    }
  }

  showError(message) {
    // Use existing AlertModal from component registry
    const AlertModal = this.componentRegistry.getClass("AlertModal");
    if (AlertModal) {
      const modal = new AlertModal(document.body, {
        title: "Error",
        content: message
      });
      modal.mount();
      modal.open();
    } else {
      alert(message);
    }
  }

  destroy() {
    console.log("🗑️ Destroying Unified App...");

    // Cleanup swipe engine
    if (this.swipeEngine) {
      this.swipeEngine.destroy();
    }

    // Cleanup current card
    if (this.currentCard && this.currentCard.destroy) {
      this.currentCard.destroy();
    }

    // Clear containers
    Object.values(this.containers).forEach(container => {
      if (container) {
        container.innerHTML = "";
      }
    });

    this.isInitialized = false;
  }

  // 🆕 Question Flow Methods
  async showQuestionFlow(container) {
    // Reset question engine for new session
    this.questionEngine.reset();

    // Start with first question
    await this.showNextQuestion(container);
  }

  async showNextQuestion(container) {
    const question = this.questionEngine.getNextQuestion();

    if (!question) {
      // No more questions, proceed to suggestions
      await this.showSuggestionsView(container);
      return;
    }

    // Load and render the appropriate question component
    await this.renderQuestion(container, question);
  }

  async renderQuestion(container, question) {
    // Clean up previous question view
    if (this.currentQuestionView) {
      this.currentQuestionView.destroy();
    }

    // Dynamically import the question component
    let QuestionComponent;
    try {
      switch (question.component) {
        case "MealContextQuestion": {
          const module =
            await import("../../components/questions/MealContextQuestion.js");
          QuestionComponent = module.MealContextQuestion;
          break;
        }
        case "SpecialistModeQuestion": {
          const specialistModule =
            await import("../../components/questions/SpecialistModeQuestion.js");
          QuestionComponent = specialistModule.SpecialistModeQuestion;
          break;
        }
        case "TimeConstraintQuestion": {
          const timeModule =
            await import("../../components/questions/TimeConstraintQuestion.js");
          QuestionComponent = timeModule.TimeConstraintQuestion;
          break;
        }
        default:
          throw new Error(`Unknown question component: ${question.component}`);
      }

      // Create and render the question
      this.currentQuestionView = new QuestionComponent(container, {
        onAnswer: (questionId, answer) =>
          this.handleQuestionAnswer(questionId, answer),
        stateManager: globalStateManager
      });

      this.currentQuestionView.render(question.config);
    } catch (error) {
      console.error("Failed to load question component:", error);
      // Fallback to suggestions if question fails
      await this.showSuggestionsView(container);
    }
  }

  async handleQuestionAnswer(questionId, answer) {
    // Process the answer through the question engine
    this.questionEngine.processAnswer(questionId, answer);

    // Show next question or proceed to suggestions
    await this.showNextQuestion(
      this.containers.resultContainer.querySelector(".mobile-recipe-card")
    );
  }

  // 🆕 Enhanced suggestions method that incorporates question answers
  async showSuggestionsView(container) {
    // Get prompt modifiers from question engine
    const promptModifiers = this.questionEngine.getPromptModifiers();
    console.log("🎯 Question-based modifiers:", promptModifiers);

    // Reuse existing view if available, otherwise create new one
    if (!this.recipeSuggestionsView) {
      this.recipeSuggestionsView = new RecipeSuggestionsView(container, {
        serviceRegistry: this.serviceRegistry
      });

      this.recipeSuggestionsView.on("recipeSelected", e => {
        this.handleRecipeSelected(e.detail.suggestion);
      });
    }

    this.currentView = this.recipeSuggestionsView;

    // Pass question modifiers to suggestions view
    await this.recipeSuggestionsView.render(promptModifiers);
  }
}
