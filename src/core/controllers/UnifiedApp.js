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
import {
  CONFIG,
  MEAL_TYPES,
  QUESTIONNAIRE_FLOWS,
  DISH_FORMATS
} from "../Config.js";

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

      // 3. Load user data
      await this.loadUserData();

      // 4. Show questionnaire before starting the swipe game
      this.showQuestionnaire();

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

    console.log("🎯 Creating first vibe card:", firstVibe.id);

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

      // Initialize round progress display (card 1 of MAX_VIBE_ROUNDS)
      this.updateRoundProgress(this.vibeEngine.getCurrentRound());
      this._updateSkipButton();

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

    console.log(`👆 Swipe ${direction}: ${currentVibe.id}`);

    if (currentVibe.swipeRight) {
      // Axis card — both directions are positive choices; the unchosen half becomes avoidance signal
      const chosen =
        direction === "right" ? currentVibe.swipeRight : currentVibe.swipeLeft;
      const rejected =
        direction === "right" ? currentVibe.swipeLeft : currentVibe.swipeRight;

      const currentProfile = globalStateManager.get("vibeProfile") || [];
      const negativeVibes = globalStateManager.get("negativeVibes") || [];

      globalStateManager.setState({
        vibeProfile: [
          ...currentProfile,
          { axis: currentVibe.axis, label: chosen.label, tags: chosen.tags }
        ],
        negativeVibes: [
          ...negativeVibes,
          { axis: currentVibe.axis, label: rejected.label, tags: rejected.tags }
        ]
      });

      console.log(`✅ [${currentVibe.axis}] Chose: "${chosen.label}"`);
    } else {
      // Legacy image card — right = like, left = dislike
      if (direction === "right") {
        const currentProfile = globalStateManager.get("vibeProfile") || [];
        globalStateManager.setState({
          vibeProfile: [...currentProfile, currentVibe]
        });
      } else {
        const negativeVibes = globalStateManager.get("negativeVibes") || [];
        globalStateManager.setState({
          negativeVibes: [...negativeVibes, currentVibe]
        });
      }
    }

    this.showNextCard();
  }

  showNextCard() {
    const nextVibe = this.vibeEngine.getNextVibe();
    if (nextVibe) {
      console.log(`🔄 Loading next vibe: ${nextVibe.id}`);

      globalStateManager.setState({ currentVibe: nextVibe });

      this.containers.cardContainer.innerHTML = "";
      this.currentCard = new VibeCard(this.containers.cardContainer, {
        vibe: nextVibe
      });
      this.currentCard.mount();

      this.setupSwipeHandling();
      this.updateRoundProgress(this.vibeEngine.getCurrentRound());
      this._updateSkipButton();
    } else {
      this.showResult();
    }
  }

  _updateSkipButton() {
    const round = this.vibeEngine.getCurrentRound();
    const hasIngredients = Boolean(
      (globalStateManager.get("ingredientsAtHome") || "").trim()
    );

    // Show skip after round 1 when ingredients are known; after round 3 otherwise
    const shouldShow = hasIngredients ? round >= 1 : round >= 3;
    if (!shouldShow) {
      return;
    }

    // Reuse or create the skip button fixed to bottom of screen (above card container)
    let skipBtn = document.querySelector(".vibe-skip-btn");
    if (!skipBtn) {
      skipBtn = document.createElement("button");
      skipBtn.className = "vibe-skip-btn";
      skipBtn.addEventListener("click", () => {
        if (skipBtn.classList.contains("is-exiting")) {
          return;
        } // prevent double-fire
        skipBtn.classList.add("is-exiting");
        // Start recipe generation immediately — loading screen appears behind the exiting pill
        this.showRecipeGeneration();
        // Remove pill from DOM after exit animation completes
        setTimeout(() => skipBtn.remove(), 420);
      });
      this.containers.cardContainer.appendChild(skipBtn);
    }

    skipBtn.textContent = hasIngredients
      ? `Skip swiping — use my ingredients →`
      : `I know what I want — show me recipes →`;
  }

  showResult() {
    // Remove skip button if present
    document.querySelector(".vibe-skip-btn")?.remove();
    // Always generate — showRecipeGeneration reads full context (vibes + ingredients + questionnaire)
    // and works correctly even with an empty vibe profile
    this.showRecipeGeneration();
  }

  showQuestionnaire() {
    const header = document.querySelector(".mobile-header");
    if (header) {
      header.style.display = "none";
    }

    const container = this.containers.cardContainer;
    if (!container) {
      return;
    }

    const mealOptions = MEAL_TYPES.map(
      m =>
        `<button class="q-option" data-field="mealType" data-value="${m.value}">${m.emoji} ${m.label}</button>`
    ).join("");

    // Only Q1 is rendered upfront — Q2, Q3, and ingredients reveal progressively
    container.innerHTML = `
      <div class="questionnaire-card">
        <div class="questionnaire-header">
          <h2 class="questionnaire-title">What are we cooking?</h2>
          <p class="questionnaire-subtitle">A couple of quick questions first</p>
        </div>
        <div class="questionnaire-body" id="questionnaire-body">
          <div class="q-step" data-step="1">
            <label class="q-label">What are you making?</label>
            <div class="q-options">${mealOptions}</div>
          </div>
        </div>
        <div class="questionnaire-footer">
          <button class="japandi-btn japandi-btn-primary q-submit-btn" disabled>
            Start Swiping →
          </button>
        </div>
      </div>
    `;

    this.setupAdaptiveQuestionnaire(container);
  }

  setupAdaptiveQuestionnaire(container) {
    const answers = {
      mealType: null,
      servingSize: null,
      timeAvailable: null,
      dishFormat: null,
      dishFormatLabel: null
    };
    const body = container.querySelector("#questionnaire-body");
    const submitBtn = container.querySelector(".q-submit-btn");

    // Single delegated listener handles all option clicks
    container.addEventListener("click", e => {
      const btn = e.target.closest(".q-option");
      if (!btn) {
        return;
      }

      const field = btn.dataset.field;
      const value = btn.dataset.value;

      container
        .querySelectorAll(`.q-option[data-field="${field}"]`)
        .forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      answers[field] = value;

      if (field === "mealType") {
        body
          .querySelectorAll(
            "[data-step='2'],[data-step='3'],[data-step='ingredients'],[data-step='dish']"
          )
          .forEach(el => el.remove());
        answers.servingSize = null;
        answers.timeAvailable = null;
        answers.dishFormat = null;
        answers.dishFormatLabel = null;
        submitBtn.disabled = true;
        this._revealQ2(body, answers, submitBtn, value);
      } else if (field === "servingSize") {
        body
          .querySelectorAll(
            "[data-step='3'],[data-step='ingredients'],[data-step='dish']"
          )
          .forEach(el => el.remove());
        answers.timeAvailable = null;
        answers.dishFormat = null;
        answers.dishFormatLabel = null;
        submitBtn.disabled = true;
        this._revealQ3orIngredients(body, answers, submitBtn);
      } else if (field === "timeAvailable") {
        body
          .querySelectorAll("[data-step='ingredients'],[data-step='dish']")
          .forEach(el => el.remove());
        answers.dishFormat = null;
        answers.dishFormatLabel = null;
        submitBtn.disabled = true;
        this._revealIngredients(body, answers, submitBtn);
      }
    });

    submitBtn.addEventListener("click", () => {
      globalStateManager.setState({
        sessionContext: {
          mealType: answers.mealType,
          servingSize: answers.servingSize,
          timeAvailable: answers.timeAvailable,
          dishFormat: answers.dishFormat,
          dishFormatLabel: answers.dishFormatLabel
        }
      });

      const ingredientsInput = container.querySelector(".q-ingredients-input");
      const rawIngredients = ingredientsInput?.value.trim();
      if (rawIngredients) {
        globalStateManager.setState({ ingredientsAtHome: rawIngredients });
      }

      this.startVibeGame();
    });
  }

  _revealQ2(body, answers, submitBtn, mealType) {
    const flow = QUESTIONNAIRE_FLOWS[mealType];
    if (!flow) {
      return;
    }

    const optionsHtml = flow.q2.options
      .map(
        o =>
          `<button class="q-option" data-field="servingSize" data-value="${o.value}">${o.emoji} ${o.label}</button>`
      )
      .join("");

    const step = document.createElement("div");
    step.className = "q-step q-step-reveal";
    step.dataset.step = "2";
    step.innerHTML = `
      <label class="q-label">${flow.q2.label}</label>
      <div class="q-options">${optionsHtml}</div>
    `;
    body.appendChild(step);
    this._scrollToStep(body);
  }

  _revealQ3orIngredients(body, answers, submitBtn) {
    const flow = QUESTIONNAIRE_FLOWS[answers.mealType];
    if (!flow) {
      return;
    }

    if (flow.q3.skip) {
      answers.timeAvailable = flow.q3.default;
      this._revealIngredients(body, answers, submitBtn);
    } else {
      this._revealQ3(body, answers, submitBtn, flow.q3);
    }
  }

  _revealQ3(body, answers, submitBtn, q3config) {
    const optionsHtml = q3config.options
      .map(
        o =>
          `<button class="q-option" data-field="timeAvailable" data-value="${o.value}">${o.emoji} ${o.label}</button>`
      )
      .join("");

    const step = document.createElement("div");
    step.className = "q-step q-step-reveal";
    step.dataset.step = "3";
    step.innerHTML = `
      <label class="q-label">${q3config.label}</label>
      <div class="q-options">${optionsHtml}</div>
    `;
    body.appendChild(step);
    this._scrollToStep(body);
  }

  _revealIngredients(body, answers, submitBtn) {
    const step = document.createElement("div");
    step.className = "q-step q-step-reveal";
    step.dataset.step = "ingredients";
    step.innerHTML = `
      <label class="q-label">
        What do you have at home?
        <span class="q-optional">optional</span>
      </label>
      <p class="q-hint">Leave blank if you have nothing specific in mind</p>
      <input type="text" class="q-ingredients-input" placeholder="e.g. tomatoes, pasta, chicken…" />
      <div class="q-direction-action-row">
        <button class="japandi-btn japandi-btn-primary q-direction-btn">
          Help me pick a direction →
        </button>
        <button class="q-surprise-link">Surprise me</button>
      </div>
    `;
    body.appendChild(step);
    this._scrollToStep(body);

    const input = step.querySelector(".q-ingredients-input");
    const directionBtn = step.querySelector(".q-direction-btn");
    const surpriseLink = step.querySelector(".q-surprise-link");

    directionBtn.addEventListener("click", () => {
      directionBtn.disabled = true;
      directionBtn.textContent = "Finding directions…";
      this._loadDirections(body, answers, submitBtn, input.value);
    });

    surpriseLink.addEventListener("click", () => {
      answers.dishFormat = null;
      answers.dishFormatLabel = null;
      submitBtn.disabled = false;
      submitBtn.click();
    });
  }

  async _loadDirections(body, answers, submitBtn, ingredients) {
    const step = document.createElement("div");
    step.className = "q-step q-step-reveal";
    step.dataset.step = "dish";
    step.innerHTML = `
      <label class="q-label">What kind of direction?</label>
      <div class="q-dish-loading">
        <div class="q-dish-loading-spinner"></div>
        <span>Finding the best directions…</span>
      </div>
    `;
    body.appendChild(step);
    this._scrollToStep(body);

    let tiles;
    try {
      tiles = await this.recipeSuggestionService.suggestFoodDirections(
        answers,
        ingredients
      );
    } catch (err) {
      console.warn("⚠️ _loadDirections fallback:", err.message);
      tiles = (DISH_FORMATS[answers.mealType] || DISH_FORMATS.dinner)
        .filter(f => f.value !== "any")
        .slice(0, 4)
        .map(f => ({ label: f.label, emoji: f.emoji, prompt: f.prompt }));
    }

    tiles.push({ label: "Surprise me", emoji: "🎲", prompt: null });
    this._renderDirectionTiles(step, body, answers, submitBtn, tiles);
  }

  _renderDirectionTiles(step, body, answers, submitBtn, tiles) {
    const tilesHtml = tiles
      .map(
        t =>
          `<button class="q-dish-tile" data-label="${t.label}" data-prompt="${t.prompt ?? ""}">
            <span class="q-dish-emoji">${t.emoji}</span>
            <span class="q-dish-label">${t.label}</span>
          </button>`
      )
      .join("");

    step.innerHTML = `
      <label class="q-label">What kind of direction?</label>
      <div class="q-dish-grid">${tilesHtml}</div>
    `;
    this._scrollToStep(body);

    const grid = step.querySelector(".q-dish-grid");

    grid.addEventListener("click", e => {
      const tile = e.target.closest(".q-dish-tile");
      if (!tile) {
        return;
      }

      // Deselect previous tile
      grid
        .querySelectorAll(".q-dish-tile.selected")
        .forEach(t => t.classList.remove("selected"));
      tile.classList.add("selected");

      answers.dishFormat = tile.dataset.prompt || null;
      answers.dishFormatLabel = tile.dataset.label;
      submitBtn.disabled = false;
    });
  }

  _scrollToStep(body) {
    // Give the DOM a tick to paint the new step before scrolling
    requestAnimationFrame(() => {
      body.scrollTo({ top: body.scrollHeight, behavior: "smooth" });
    });
  }

  startVibeGame() {
    // Restore the round indicator
    const header = document.querySelector(".mobile-header");
    if (header) {
      header.style.display = "";
    }

    // Reset vibe engine with session context for contextual filtering
    const sessionContext = globalStateManager.get("sessionContext");
    this.vibeEngine.reset(sessionContext);

    // Preload first few card images immediately so they're ready
    this.vibeEngine.preloadFirst(4);

    this.createFirstCard();
  }

  showRecipeGeneration() {
    // Ingredients were already collected in the questionnaire — go straight to suggestions
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
        recipeCard.classList.add("suggestions-mode");
        this.showSuggestionsView(recipeCard);
      }
    }
  }

  showSuggestionsView(container) {
    // Reuse existing view if available, otherwise create new one
    if (!this.recipeSuggestionsView) {
      this.recipeSuggestionsView = new RecipeSuggestionsView(container, {
        serviceRegistry: this.serviceRegistry
      });

      this.recipeSuggestionsView.on("recipeSelected", e => {
        this.handleRecipeSelected(e.detail.suggestion);
      });

      this.recipeSuggestionsView.on("startFresh", () => {
        this.resetAndRestart();
      });
    }

    this.currentView = this.recipeSuggestionsView;
    this.recipeSuggestionsView.render();
  }

  resetAndRestart() {
    // Reset session state — keep preferences, favorites, and username
    globalStateManager.setState({
      sessionContext: {
        mealType: null,
        servingSize: null,
        timeAvailable: null,
        dishFormat: null,
        dishFormatLabel: null
      },
      vibeProfile: [],
      negativeVibes: [],
      currentSuggestions: [],
      ingredientsAtHome: "",
      currentVibeRound: 0,
      shuffledVibes: []
    });

    // Hide result view, restore main container
    const resultContainer = this.containers.resultContainer;
    const mobileContainer = document.querySelector(".mobile-container");

    if (resultContainer) {
      resultContainer.style.display = "none";
      resultContainer.classList.remove("show");
    }
    if (mobileContainer) {
      mobileContainer.style.display = "";
    }

    // Clear view references so they're re-created fresh next session
    this.recipeSuggestionsView = null;
    this.recipeDetailView = null;

    this.showQuestionnaire();
  }

  handleRecipeSelected(suggestion) {
    this.showRecipeDetailView(
      this.containers.resultContainer.querySelector(".mobile-recipe-card"),
      suggestion
    );
  }

  showRecipeDetailView(container, suggestion) {
    // Remove previous listener before adding a new one to prevent accumulation
    if (this._backToSuggestionsHandler) {
      container.removeEventListener(
        "backToSuggestions",
        this._backToSuggestionsHandler
      );
    }

    this._backToSuggestionsHandler = () => {
      this.showSuggestionsView(container);
    };

    this.recipeDetailView = new RecipeDetailView(container, {
      serviceRegistry: this.serviceRegistry
    });

    container.addEventListener(
      "backToSuggestions",
      this._backToSuggestionsHandler
    );

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
}
