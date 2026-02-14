import { globalStateManager } from '../../core/StateManager.js';
import { globalEventBus } from '../../core/EventBus.js';
import { apiService } from '../../core/ApiService.js';
import { DeviceUtils } from '../../utils/DeviceUtils.js';
import { DomUtils } from '../../utils/DomUtils.js';
import { VibeEngine } from '../../shared/VibeEngine.js';
import { RecipeFormatter } from '../../shared/RecipeFormatter.js';
import { PromptBuilder } from '../../shared/PromptBuilder.js';
import { RecipeSuggestionService } from '../../services/RecipeSuggestionService.js';

// Import mobile-specific components
import { Component } from '../../components/Component.js';
import { VibeCard } from '../../components/Card/VibeCard.js';
import { RecipeCard } from '../../components/Card/RecipeCard.js';
import { SwipeEngine } from '../../components/SwipeEngine/SwipeEngine.js';
import { FloatingActionButton } from '../../components/Navigation/FloatingActionButton.js';
import { Loading, MobileLoading, RecipeLoading } from '../../components/UI/Loading.js';
import { Modal, ConfirmModal, AlertModal, FullscreenModal } from '../../components/UI/Modal.js';

// Mobile-specific application orchestrator
export class MobileApp {
  constructor() {
    this.isInitialized = false;
    this.components = new Map();
    this.vibeEngine = new VibeEngine();
    this.currentCard = null;
    this.currentSwipeEngine = null;
    this.recipeSuggestionService = new RecipeSuggestionService(globalStateManager);
    
    // Mobile-specific containers
    this.containers = {
      cardContainer: null,
      resultContainer: null,
      headerContainer: null
    };
    
    // Mobile-specific UI elements
    this.elements = {
      likeIndicator: null,
      nopeIndicator: null,
      roundCounter: null
    };
  }
  
  // Initialize mobile application
  async initialize() {
    if (this.isInitialized) {
      console.warn('MobileApp already initialized');
      return;
    }
    
    try {
      console.log('📱 Initializing Mobile Application...');
      
      // Load user state
      await this.loadUserState();
      
      // Setup containers
      this.setupContainers();
      
      // Create mobile-specific UI elements
      this.createMobileElements();
      
      // Setup mobile header
      this.setupMobileHeader();
      
      // Setup FAB navigation
      this.setupFloatingNavigation();
      
      // Start swipe deck
      this.startSwipeDeck();
      
      // Setup event listeners
      this.setupEventListeners();
      
      this.isInitialized = true;
      
      console.log('✅ Mobile Application initialized successfully');
      globalEventBus.emit('app:initialized', { platform: 'mobile' });
      
    } catch (error) {
      console.error('❌ Failed to initialize MobileApp:', error);
      this.handleError(error);
    }
  }
  
  // Setup DOM containers
  setupContainers() {
    console.log('🔍 Setting up containers...');
    this.containers.cardContainer = DomUtils.find('.mobile-card-container');
    this.containers.resultContainer = DomUtils.find('#mobile-result');
    this.containers.headerContainer = DomUtils.find('.mobile-header');
    
    console.log('🔍 Container setup results:', {
      cardContainer: !!this.containers.cardContainer,
      resultContainer: !!this.containers.resultContainer,
      headerContainer: !!this.containers.headerContainer
    });
    
    if (!this.containers.cardContainer) {
      throw new Error('Mobile card container not found');
    }
  }
  
  // Create mobile-specific UI elements
  createMobileElements() {
    // Create swipe indicators
    this.elements.likeIndicator = DomUtils.createElement('div', {
      className: 'mobile-swipe-indicator like',
      textContent: '✓'
    });
    
    this.elements.nopeIndicator = DomUtils.createElement('div', {
      className: 'mobile-swipe-indicator nope',
      textContent: '✗'
    });
    
    // Add to body
    document.body.appendChild(this.elements.likeIndicator);
    document.body.appendChild(this.elements.nopeIndicator);
    
    // Setup round counter
    this.elements.roundCounter = {
      current: DomUtils.find('.round-text'),
      total: null // Using round-text which shows "Round X of Y" format
    };
    
    if (this.elements.roundCounter.current) {
      const currentRound = this.vibeEngine.getCurrentRound();
      const maxRounds = this.vibeEngine.getMaxRounds();
      this.elements.roundCounter.current.textContent = `Round ${currentRound} of ${maxRounds}`;
    }
  }
  
  // Setup mobile header
  setupMobileHeader() {
    if (!this.containers.headerContainer) return;
    
    const header = DomUtils.find('.mobile-header h1');
    if (header) {
      header.textContent = '🍳 Recipe Swipe';
    }
  }
  
  // Setup floating action button
  setupFloatingNavigation() {
    const fab = new FloatingActionButton(document.body, {
      icon: '👤',
      items: [
        { icon: '⭐', text: 'My Favorites', action: 'favorites' },
        { icon: '⚙️', text: 'Preferences', action: 'preferences' },
        { icon: '🚪', text: 'Logout', action: 'logout' }
      ],
      onItemClick: (action) => this.handleFABAction(action),
      onBackClick: () => this.exitFullscreenView()
    });
    
    this.components.set('fab', fab);
    fab.mount();
  }
  
  // Start swipe deck
  startSwipeDeck() {
    const vibe = this.vibeEngine.getNextVibe();
    if (!vibe) {
      this.showResult();
      return;
    }
    
    // Create vibe card
    this.currentCard = new VibeCard(this.containers.cardContainer, {
      vibe,
      round: this.vibeEngine.getCurrentRound()
    });
    
    this.components.set('currentCard', this.currentCard);
    this.currentCard.mount();
    
    // Setup swipe engine
    this.setupSwipeEngine();
    
    // Update round counter
    this.updateRoundCounter();
  }
  
  // Setup mobile swipe functionality
  setupSwipeEngine() {
    if (!this.currentCard) return;
    
    const cardElement = this.currentCard.getElement();
    this.currentSwipeEngine = new SwipeEngine(cardElement, {
      callbacks: {
        onSwipeStart: (data) => this.onSwipeStart(data),
        onSwipeMove: (data) => this.onSwipeMove(data),
        onSwipeRight: (data) => this.onSwipeRight(data),
        onSwipeLeft: (data) => this.onSwipeLeft(data),
        onSwipeCancel: (data) => this.onSwipeCancel(data)
      }
    });
  }
  
  // Mobile swipe event handlers
  onSwipeStart(data) {
    console.log('Mobile swipe started:', data);
    DeviceUtils.vibrate(10); // Haptic feedback
  }
  
  onSwipeMove(data) {
    // Update swipe indicators
    const threshold = 80;
    
    if (data.distance > threshold) {
      if (data.distance > 0) {
        this.elements.likeIndicator.classList.add('show');
        this.elements.nopeIndicator.classList.remove('show');
      } else {
        this.elements.nopeIndicator.classList.add('show');
        this.elements.likeIndicator.classList.remove('show');
      }
    } else {
      this.elements.likeIndicator.classList.remove('show');
      this.elements.nopeIndicator.classList.remove('show');
    }
  }
  
  onSwipeRight(data) {
    console.log('Swiped right - adding vibe to profile');
    const vibe = this.currentCard.getVibe();
    
    // Haptic feedback
    DeviceUtils.vibrate([10, 50, 10]);
    
    // Add to profile
    const currentProfile = globalStateManager.get('vibeProfile');
    globalStateManager.setState({
      vibeProfile: [...currentProfile, vibe]
    });
    
    // Animate card out
    this.currentCard.swipeOut('right', () => {
      this.cleanupCurrentCard();
      this.startSwipeDeck();
    });
    
    // Reset indicators
    this.resetIndicators();
  }
  
  onSwipeLeft(data) {
    console.log('Swiped left - rejecting vibe');
    
    // Haptic feedback
    DeviceUtils.vibrate(10);
    
    // Animate card out
    this.currentCard.swipeOut('left', () => {
      this.cleanupCurrentCard();
      this.startSwipeDeck();
    });
    
    // Reset indicators
    this.resetIndicators();
  }
  
  onSwipeCancel(data) {
    console.log('Swipe cancelled');
    this.currentCard.resetToCenter();
    this.resetIndicators();
  }
  
  // Reset swipe indicators
  resetIndicators() {
    this.elements.likeIndicator.classList.remove('show');
    this.elements.nopeIndicator.classList.remove('show');
  }
  
  // Update round counter
  updateRoundCounter() {
    if (this.elements.roundCounter.current) {
      this.elements.roundCounter.current.textContent = this.vibeEngine.getCurrentRound();
    }
  }
  
  // Cleanup current card
  cleanupCurrentCard() {
    if (this.currentCard) {
      this.currentCard.unmount();
      this.currentCard = null;
    }
    
    if (this.currentSwipeEngine) {
      this.currentSwipeEngine.destroy();
      this.currentSwipeEngine = null;
    }
  }
  
  // Show result screen
  async showResult() {
    // Ensure containers are setup
    if (!this.containers.resultContainer) {
      this.setupContainers();
    }
    
    // Hide main container
    DomUtils.hide(document.querySelector('.mobile-container'));
    
    // Show result container
    if (this.containers.resultContainer) {
      DomUtils.show(this.containers.resultContainer);
      this.containers.resultContainer.classList.add('show');
    } else {
      console.error('Result container still not found after setup');
      return;
    }
    
    // Create result content
    await this.createResultContent();
  }
  
  // Create mobile result screen
  async createResultContent() {
    const state = globalStateManager.getState();
    
    // Create recipe card
    const recipeCard = DomUtils.createElement('div', { className: 'mobile-recipe-card' });
    this.containers.resultContainer.appendChild(recipeCard);
    
    // Create vibe summary
    const vibeSummary = this.createMobileVibeSummary(state.vibeProfile);
    recipeCard.innerHTML = vibeSummary + this.createMobileIngredientsInput();
    
    // Setup mobile-specific functionality
    this.setupMobileResultActions(recipeCard);
  }
  
  // Create mobile vibe summary
  createMobileVibeSummary(vibeProfile) {
    return `
      <div class="mobile-vibe-summary">
        <h2>🍳 Ready to Cook!</h2>
        <p style="color: #666;">Let's find you a delicious recipe!</p>
      </div>
    `;
  }
  
  // Create mobile ingredients input
  createMobileIngredientsInput() {
    return `
      <div class="ingredients-container">
        <h2>🏡 What do you have at home?</h2>
        <p class="ingredients-subtitle">Optional: Add ingredients you'd like to use</p>
        <textarea class="ingredients-input" placeholder="chicken breast, rice, garlic, spinach..." rows="3"></textarea>
        <div class="ingredients-actions">
          <button class="japandi-btn japandi-btn-subtle add-ingredients-btn" type="button">+ Add Ingredients</button>
        </div>
        <div class="ingredients-confirmation"></div>
        <button class="japandi-btn japandi-btn-primary mobile-generate-btn" type="button">🍳 Generate My Recipe</button>
      </div>
    `;
  }
  
  // Setup mobile result actions
  setupMobileResultActions(recipeCard) {
    const addBtn = recipeCard.querySelector('.add-ingredients-btn');
    const ingredientsInput = recipeCard.querySelector('.ingredients-input');
    const confirmation = recipeCard.querySelector('.ingredients-confirmation');
    const generateBtn = recipeCard.querySelector('.mobile-generate-btn');
    
    // Add ingredients button
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
        
        // Haptic feedback
        DeviceUtils.vibrate(10);
      }
    });
    
    // Generate button
    generateBtn.addEventListener('click', async () => {
      await this.generateMobileRecipe(recipeCard);
    });
  }
  
  // Generate mobile recipe suggestions
  async generateMobileRecipe(recipeCard) {
    // If no recipeCard provided, find it in the result container
    if (!recipeCard) {
      recipeCard = this.containers.resultContainer.querySelector('.mobile-recipe-card');
    }
    
    if (!recipeCard) {
      console.error('Recipe card element not found');
      return;
    }
    
    const button = recipeCard.querySelector('.mobile-generate-btn');
    
    if (!button) {
      console.error('Generate button not found in recipe card');
      return;
    }
    
    // Show loading
    button.innerHTML = '<span class="mobile-loading-spinner"></span> Generating suggestions... (this may take 30+ seconds)';
    button.disabled = true;
    
    try {
      // Generate 5 recipe suggestions
      const suggestions = await this.recipeSuggestionService.generateSuggestions();
      
      // Clear the recipe card and show suggestions
      recipeCard.innerHTML = this.recipeSuggestionService.createSuggestionsGrid(suggestions);
      
      // Setup suggestion interactions
      this.setupSuggestionInteractions(recipeCard);
      
    } catch (error) {
      console.error('Failed to generate recipe suggestions:', error);
      button.textContent = 'Try Again';
      button.disabled = false;
    }
  }
  
  // Setup interactions for recipe suggestions
  setupSuggestionInteractions(container) {
    // Handle recipe selection
    container.querySelectorAll('.select-recipe-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const suggestionId = btn.dataset.suggestionId;
        const suggestion = this.recipeSuggestionService.selectSuggestion(suggestionId);
        
        if (suggestion) {
          await this.showSelectedRecipe(container, suggestion);
        }
      });
    });
    
    // Handle regenerate button
    const regenerateBtn = container.querySelector('.regenerate-btn');
    if (regenerateBtn) {
      regenerateBtn.addEventListener('click', async () => {
        await this.regenerateSuggestions(container);
      });
    }
  }
  
  // Show selected recipe in full detail
  async showSelectedRecipe(container, suggestion) {
    // Show loading state
    container.innerHTML = `
      <div class="suggestions-loading">
        <div class="loading-spinner"></div>
        <p>Generating full recipe...</p>
      </div>
    `;
    
    try {
      // Stage 2: Generate the full recipe for this suggestion
      const fullRecipe = await this.recipeSuggestionService.generateFullRecipe(suggestion.id);
      
      const showToggle = fullRecipe.formatted.hasIngredients && fullRecipe.formatted.hasInstructions;
      
      container.innerHTML = `
        ${showToggle ? `
          <div class="recipe-toggle" role="tablist" aria-label="Recipe sections">
            <button type="button" class="recipe-toggle-btn active" data-target="ingredients">Ingredients</button>
            <button type="button" class="recipe-toggle-btn" data-target="instructions">Instructions</button>
          </div>
        ` : ''}
        <div class="mobile-recipe-content">${fullRecipe.formatted.html}</div>
        <div class="recipe-actions">
          <button class="japandi-btn japandi-btn-subtle save-favorite-btn" type="button">⭐ Save</button>
          <button class="japandi-btn japandi-btn-primary mobile-reset-btn" type="button">🔄 Back to Suggestions</button>
        </div>
      `;
      
      // Setup toggle functionality
      if (showToggle) {
        this.setupMobileRecipeToggle(container);
      }
      
      // Setup action buttons
      this.setupMobileRecipeActions(container, fullRecipe.recipeText, fullRecipe.title);
      
    } catch (error) {
      console.error('Failed to generate full recipe:', error);
      container.innerHTML = `
        <div class="suggestions-loading">
          <p>❌ Failed to generate recipe</p>
          <button class="japandi-btn japandi-btn-primary" onclick="location.reload()">Try Again</button>
        </div>
      `;
    }
  }
  
  // Regenerate new suggestions
  async regenerateSuggestions(container) {
    container.innerHTML = `
      <div class="suggestions-loading">
        <div class="loading-spinner"></div>
        <p>Generating new suggestions...</p>
        <p class="loading-subtitle">Finding fresh recipe ideas for you</p>
      </div>
    `;
    
    try {
      const suggestions = await this.recipeSuggestionService.generateSuggestions();
      container.innerHTML = this.recipeSuggestionService.createSuggestionsGrid(suggestions);
      this.setupSuggestionInteractions(container);
    } catch (error) {
      console.error('Failed to regenerate suggestions:', error);
      container.innerHTML = `
        <div class="suggestions-loading">
          <p>❌ Failed to generate suggestions</p>
          <button class="japandi-btn japandi-btn-primary" onclick="location.reload()">Try Again</button>
        </div>
      `;
    }
  }
  
  // Setup mobile recipe toggle
  setupMobileRecipeToggle(recipeCard) {
    const toggleBtns = recipeCard.querySelectorAll('.recipe-toggle-btn');
    const content = recipeCard.querySelector('.mobile-recipe-content');
    
    toggleBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const target = btn.dataset.target;
        
        // Update button states
        toggleBtns.forEach(b => b.classList.toggle('active', b.dataset.target === target));
        
        // Show/hide sections
        content.querySelectorAll('[data-recipe-section]').forEach(section => {
          section.style.display = section.dataset.recipeSection === target ? '' : 'none';
        });
        
        // Haptic feedback
        DeviceUtils.vibrate(5);
      });
    });
  }
  
  // Setup mobile recipe actions
  setupMobileRecipeActions(recipeCard, recipeText, title) {
    const saveBtn = recipeCard.querySelector('.save-favorite-btn');
    const resetBtn = recipeCard.querySelector('.mobile-reset-btn');
    
    // Save favorite
    saveBtn.addEventListener('click', async () => {
      try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
        
        await apiService.saveFavorite({
          recipeText,
          title: title || 'Untitled Recipe',
          rating: null,
          note: null
        });
        
        // Success haptic
        DeviceUtils.vibrate([10, 50, 10]);
        saveBtn.textContent = '✅ Saved';
        
        setTimeout(() => {
          saveBtn.textContent = '⭐ Save';
          saveBtn.disabled = false;
        }, 2000);
        
      } catch (error) {
        console.error('Failed to save favorite:', error);
        saveBtn.textContent = '⭐ Save';
        saveBtn.disabled = false;
      }
    });
    
    // Back to suggestions button
    resetBtn.addEventListener('click', async () => {
      await this.regenerateSuggestions(recipeCard);
    });
  }
  
  // Handle FAB actions
  handleFABAction(action) {
    const fab = this.components.get('fab');
    
    switch (action) {
      case 'favorites':
        this.showMobileFavorites();
        break;
      case 'preferences':
        this.showMobilePreferences();
        break;
      case 'logout':
        this.logout();
        break;
    }
  }
  
  // Show mobile favorites
  async showMobileFavorites() {
    console.log('Showing mobile favorites...');
    
    // Show back button on FAB
    const fab = this.components.get('fab');
    if (fab) {
      fab.showBackButton(true);
    }
    
    // Implementation would create fullscreen favorites view
    const favoritesContainer = DomUtils.createElement('div', { className: 'mobile-favorites-fullscreen' });
    document.body.appendChild(favoritesContainer);
    
    try {
      const { favorites } = await apiService.getFavorites();
      
      if (!favorites || favorites.length === 0) {
        favoritesContainer.innerHTML = '<p class="mobile-empty-favorites">No favorites yet. Swipe and save some recipes!</p>';
      } else {
        // Render favorites
        const grid = DomUtils.createElement('div', { className: 'mobile-favorites-grid' });
        favorites.forEach(fav => {
          const card = this.createFavoriteCard(fav);
          grid.appendChild(card);
        });
        favoritesContainer.appendChild(grid);
      }
      
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
  }
  
  // Show mobile preferences
  showMobilePreferences() {
    console.log('Showing mobile preferences...');
    // Implementation would create fullscreen preferences view
  }
  
  // Exit fullscreen view
  exitFullscreenView() {
    const favoritesContainer = document.querySelector('.mobile-favorites-fullscreen');
    const preferencesContainer = document.querySelector('.mobile-preferences-fullscreen');
    
    if (favoritesContainer) {
      favoritesContainer.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
      favoritesContainer.style.opacity = '0';
      favoritesContainer.style.transform = 'translateY(30px) scale(0.98)';
      
      setTimeout(() => {
        favoritesContainer.remove();
      }, 350);
    }
    
    if (preferencesContainer) {
      preferencesContainer.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
      preferencesContainer.style.opacity = '0';
      preferencesContainer.style.transform = 'translateY(30px) scale(0.98)';
      
      setTimeout(() => {
        preferencesContainer.remove();
      }, 350);
    }
    
    // Show main container
    const mobileContainer = document.getElementById('mobile-container');
    if (mobileContainer) {
      mobileContainer.style.display = '';
      mobileContainer.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
      mobileContainer.style.opacity = '0';
      mobileContainer.style.transform = 'translateY(20px)';
      
      setTimeout(() => {
        mobileContainer.style.opacity = '1';
        mobileContainer.style.transform = 'translateY(0)';
      }, 50);
    }
    
    // Hide back button
    const fab = this.components.get('fab');
    if (fab) {
      fab.showBackButton(false);
    }
    
    // Haptic feedback
    DeviceUtils.vibrate(50);
  }
  
  // Create favorite card for mobile
  createFavoriteCard(favorite) {
    const card = DomUtils.createElement('div', { className: 'mobile-favorite-card' });
    
    const formattedRecipe = RecipeFormatter.format(favorite.recipeText, true);
    
    card.innerHTML = `
      <div class="mobile-favorite-header">
        <h3 class="mobile-favorite-title">${favorite.title}</h3>
        <button class="mobile-delete-favorite-btn" data-id="${favorite.id}">🗑️</button>
      </div>
      <div class="mobile-favorite-preview">
        ${formattedRecipe.html}
      </div>
    `;
    
    return card;
  }
  
  // Switch profile
  switchProfile() {
    window.location.href = '/profile-picker.html';
  }
  
  // Logout
  async logout() {
    try {
      await apiService.logout();
      window.location.href = '/profile-picker.html';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/profile-picker.html';
    }
  }
  
  // Load user state
  async loadUserState() {
    try {
      const data = await apiService.getUserData();
      globalStateManager.setState({
        currentUsername: data.username,
        vibeProfile: data.vibeProfile || [],
        ingredientsAtHome: data.ingredientsAtHome || '',
        favorites: data.favorites || [],
        preferences: data.preferences || {
          diet: 'None',
          budget: 'No',
          seasonalKing: 'No'
        }
      });
    } catch (error) {
      console.error('Failed to load user state:', error);
      window.location.href = '/profile-picker.html';
    }
  }
  
  // Setup event listeners
  setupEventListeners() {
    // Listen for state changes
    globalStateManager.subscribe('currentVibeRound', (round) => {
      this.updateRoundCounter();
    });
    
    // Handle device orientation changes
    window.addEventListener('orientationchange', () => {
      console.log('Orientation changed');
      // Handle orientation-specific UI adjustments
    });
  }
  
  // Error handling
  handleError(error) {
    console.error('MobileApp error:', error);
    
    // Show error modal
    const modal = new AlertModal(document.body, {
      title: 'Error',
      content: `An error occurred: ${error.message}`,
      onClose: () => {
        // Error cleanup
      }
    });
    modal.mount();
    modal.open();
    
    // Haptic feedback for error
    DeviceUtils.vibrate([100, 100, 100]);
  }
  
  // Cleanup
  destroy() {
    // Cleanup components
    this.components.forEach(component => {
      if (component.unmount) {
        component.unmount();
      }
    });
    this.components.clear();
    
    // Cleanup UI elements
    if (this.elements.likeIndicator) {
      this.elements.likeIndicator.remove();
    }
    if (this.elements.nopeIndicator) {
      this.elements.nopeIndicator.remove();
    }
    
    this.isInitialized = false;
  }
}
