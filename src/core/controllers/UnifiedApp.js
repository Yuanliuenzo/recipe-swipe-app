/**
 * Unified App Controller
 * Handles all device types with responsive behavior
 */

import { globalStateManager } from '../StateManager.js';
import { globalEventBus } from '../EventBus.js';
import { DeviceUtils } from '../../utils/DeviceUtils.js';
import { VibeEngine } from '../../shared/VibeEngine.js';
import { SwipeEngine } from '../../components/SwipeEngine/SwipeEngine.js';
import { VibeCard } from '../../components/Card/VibeCard.js';
import { RecipeCard } from '../../components/Card/RecipeCard.js';
import { RecipeSuggestionService } from '../../services/RecipeSuggestionService.js';
import { FavoritesService } from '../../services/FavoritesService.js';
import { UserPreferencesService } from '../../services/UserPreferencesService.js';
import { NavigationService } from '../../services/NavigationService.js';
import { apiService } from '../ApiService.js';
import { RecipeFormatter } from '../../shared/RecipeFormatter.js';
import { PromptBuilder } from '../../shared/PromptBuilder.js';
import { RecipeDetailView } from '../../components/views/RecipeDetailView.js';
import { RecipeSuggestionsView } from '../../components/views/RecipeSuggestionsView.js';

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
    this.favoritesService = new FavoritesService(globalStateManager, apiService);
    this.userPreferencesService = new UserPreferencesService(globalStateManager, apiService);
    this.navigationService = new NavigationService(this.favoritesService, this.userPreferencesService);
    this.recipeSuggestionService = new RecipeSuggestionService(globalStateManager);
    
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
      console.warn('UnifiedApp already initialized');
      return;
    }

    try {
      console.log('🎯 Initializing Unified App Controller...');
      
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
      console.log('✅ Unified App initialized successfully!');
      
    } catch (error) {
      console.error('❌ Failed to initialize Unified App:', error);
      throw error;
    }
  }

  async initializeServices() {
    // Initialize all existing state-of-the-art services
    await this.favoritesService.initialize();
    await this.userPreferencesService.initialize();
    
    // Register services in registry for global access
    this.serviceRegistry.register('favorites', this.favoritesService);
    this.serviceRegistry.register('userPreferences', this.userPreferencesService);
    this.serviceRegistry.register('navigation', this.navigationService);
    this.serviceRegistry.register('recipeSuggestion', this.recipeSuggestionService);
    this.serviceRegistry.register('api', apiService);
    
    console.log('✅ All existing services initialized and registered');
  }

  setupContainers() {
    // Find containers based on current DOM structure
    this.containers = {
      cardContainer: document.querySelector('.mobile-card-container') || document.querySelector('.card-container'),
      resultContainer: document.querySelector('.mobile-result'),
      headerContainer: document.querySelector('.mobile-header'),
      navigationContainer: document.querySelector('.mobile-navigation')
    };

    // Validate containers
    Object.entries(this.containers).forEach(([key, container]) => {
      if (!container && key !== 'resultContainer' && key !== 'navigationContainer') {
        console.warn(`⚠️ Container not found: ${key}`);
      }
    });
  }

  async loadUserData() {
    try {
      await apiService.getUserData();
      console.log('✅ User data loaded');
    } catch (error) {
      console.warn('⚠️ Failed to load user data:', error.message);
      console.log('🎯 Continuing with default state...');
    }
  }

  async createFirstCard() {
    const firstVibe = this.vibeEngine.getNextVibe();
    if (!firstVibe) {
      console.error('❌ No vibes available');
      return;
    }

    console.log('🎯 Creating first vibe card:', firstVibe.name);
    
    // Store current vibe
    globalStateManager.setState({ currentVibe: firstVibe });
    
    // Create card
    if (this.containers.cardContainer) {
      this.currentCard = new VibeCard(this.containers.cardContainer, { vibe: firstVibe });
      this.currentCard.mount();
      
      // Setup swipe handling
      this.setupSwipeHandling();
      
      console.log('✅ First card created successfully');
    } else {
      console.error('❌ No card container found');
    }
  }

  setupSwipeHandling() {
    if (!this.currentCard) return;

    const cardElement = this.containers.cardContainer.querySelector('.vibe-card, .mobile-vibe-card');
    if (!cardElement) return;

    // Create swipe engine
    this.swipeEngine = new SwipeEngine(cardElement, {
      onSwipeLeft: () => this.handleSwipe('left'),
      onSwipeRight: () => this.handleSwipe('right'),
      threshold: 0.3,
      maxRotation: 15
    });

    // Add fallback click handler
    cardElement.addEventListener('click', () => {
      console.log('👆 Card clicked - simulating swipe right');
      this.handleSwipe('right');
    });

    // Add keyboard support
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') this.handleSwipe('right');
      if (e.key === 'ArrowLeft') this.handleSwipe('left');
    });
  }

  handleSwipe(direction) {
    const currentVibe = globalStateManager.get('currentVibe');
    
    if (!currentVibe) {
      this.showResult();
      return;
    }

    console.log(`👆 Swipe ${direction}: ${currentVibe.name}`);

    if (direction === 'right') {
      // Add to profile
      const currentProfile = globalStateManager.get('vibeProfile');
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
      this.containers.cardContainer.innerHTML = '';
      this.currentCard = new VibeCard(this.containers.cardContainer, { vibe: nextVibe });
      this.currentCard.mount();
      
      // Setup swipe handling for new card
      this.setupSwipeHandling();
      
    } else {
      this.showResult();
    }
  }

  showResult() {
    const profile = globalStateManager.get('vibeProfile');
    console.log('🎉 Showing result with profile:', profile);

    if (profile.length > 0) {
      this.showRecipeGeneration(profile);
    } else {
      this.showSimpleResult();
    }
  }

  showRecipeGeneration(profile) {
    // Hide main container, show result container
    const mobileContainer = document.querySelector('.mobile-container');
    const resultContainer = this.containers.resultContainer;

    if (mobileContainer) {
      mobileContainer.style.display = 'none';
    }

    if (resultContainer) {
      resultContainer.style.display = 'block';
      resultContainer.classList.add('show');

      const recipeCard = resultContainer.querySelector('.mobile-recipe-card');
      if (recipeCard) {
        recipeCard.innerHTML = this.createIngredientsInput();
        recipeCard.classList.add('suggestions-mode');
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
    const addBtn = recipeCard.querySelector('.add-ingredients-btn');
    const ingredientsInput = recipeCard.querySelector('.ingredients-input');
    const confirmation = recipeCard.querySelector('.ingredients-confirmation');
    const generateBtn = recipeCard.querySelector('.mobile-generate-btn');

    addBtn.addEventListener('click', () => {
      const rawValue = ingredientsInput.value.trim();
      if (rawValue) {
        const newItems = rawValue.split(',').map(item => item.trim().toLowerCase()).filter(item => item.length > 0);
        const existingItems = globalStateManager.get('ingredientsAtHome')?.split(',').map(item => item.trim().toLowerCase()) || [];
        const combined = [...existingItems, ...newItems];
        const uniqueItems = [...new Set(combined)];

        globalStateManager.setState({ ingredientsAtHome: uniqueItems.join(', ') });
        ingredientsInput.value = '';

        confirmation.textContent = `✅ Added: ${newItems.join(', ')}`;
        confirmation.style.color = '#4CAF50';
        confirmation.classList.add('show');

        setTimeout(() => confirmation.classList.remove('show'), 3000);
      }
    });

    generateBtn.addEventListener('click', async () => {
      generateBtn.innerHTML = '<span class="mobile-loading-spinner"></span> Getting suggestions... (this may take 30+ seconds)';
      generateBtn.disabled = true;

      try {
        this.showSuggestionsView(recipeCard);
      } catch (error) {
        console.error('Failed to generate suggestions:', error);
        generateBtn.textContent = 'Try Again';
        generateBtn.disabled = false;
      }
    });
  }

  showSuggestionsView(container) {
    this.recipeSuggestionsView = new RecipeSuggestionsView(container, {
      serviceRegistry: this.serviceRegistry
    });
    
    this.recipeSuggestionsView.on('recipeSelected', (e) => {
      this.handleRecipeSelected(e.detail.suggestion);
    });
    
    this.currentView = this.recipeSuggestionsView;
    this.recipeSuggestionsView.render();
  }

  handleRecipeSelected(suggestion) {
    this.showRecipeDetailView(this.containers.resultContainer.querySelector('.mobile-recipe-card'), suggestion);
  }

  showRecipeDetailView(container, suggestion) {
    this.recipeDetailView = new RecipeDetailView(container, {
      serviceRegistry: this.serviceRegistry
    });
    
    this.recipeDetailView.on('backToSuggestions', () => {
      this.showSuggestionsView(container);
    });
    
    this.currentView = this.recipeDetailView;
    this.recipeDetailView.render(suggestion);
  }




  showSimpleResult() {
    const container = this.containers.cardContainer;
    if (!container) return;

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
      const roundIndicator = document.querySelector('.round-indicator');
      if (!roundIndicator) {
        console.warn('Round indicator not found');
        return;
      }

      const actualTotalRounds = this.vibeEngine.shuffledVibes.length + this.vibeEngine.usedVibes.size;
      const remainingVibes = this.vibeEngine.shuffledVibes.length;
      const progressPercentage = actualTotalRounds > 0 ? ((actualTotalRounds - remainingVibes) / actualTotalRounds) * 100 : 0;

      roundIndicator.setAttribute('data-round', currentRound.toString());

      const roundText = roundIndicator.querySelector('.round-text');
      if (roundText) {
        roundText.textContent = `Round ${currentRound} of ${actualTotalRounds}`;
      }

      const progressBar = roundIndicator.querySelector('.round-progress');
      if (progressBar) {
        progressBar.style.width = `${progressPercentage}%`;
      }

      const dots = roundIndicator.querySelectorAll('.round-dot');
      dots.forEach((dot, index) => {
        if (index < currentRound) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      });

      console.log(`📊 Updated round progress: ${currentRound}/${actualTotalRounds} (${progressPercentage.toFixed(1)}%)`);
    } catch (error) {
      console.error('❌ Failed to update round progress:', error);
    }
  }

  setupEventListeners() {
    // Setup navigation using existing NavigationService
    // The navigation service is already initialized in constructor
    // No setupNavigation method needed - it's ready to use
    
    // Setup global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.handleEscapeKey();
      }
    });
  }

  handleEscapeKey() {
    // Handle escape key based on current state
    const resultContainer = this.containers.resultContainer;
    const mobileContainer = document.querySelector('.mobile-container');

    if (resultContainer && resultContainer.style.display !== 'none') {
      // Go back to main view
      resultContainer.style.display = 'none';
      resultContainer.classList.remove('show');
      
      if (mobileContainer) {
        mobileContainer.style.display = 'flex';
      }
    }
  }

  showError(message) {
    // Use existing AlertModal from component registry
    const AlertModal = this.componentRegistry.getClass('AlertModal');
    if (AlertModal) {
      const modal = new AlertModal(document.body, {
        title: 'Error',
        content: message
      });
      modal.mount();
      modal.open();
    } else {
      alert(message);
    }
  }

  destroy() {
    console.log('🗑️ Destroying Unified App...');
    
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
        container.innerHTML = '';
      }
    });
    
    this.isInitialized = false;
  }
}
