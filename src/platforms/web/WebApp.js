import { globalStateManager } from '../../core/StateManager.js';
import { globalEventBus } from '../../core/EventBus.js';
import { apiService } from '../../core/ApiService.js';
import { DeviceUtils } from '../../utils/DeviceUtils.js';
import { DomUtils } from '../../utils/DomUtils.js';
import { VibeEngine } from '../../shared/VibeEngine.js';
import { RecipeFormatter } from '../../shared/RecipeFormatter.js';
import { PromptBuilder } from '../../shared/PromptBuilder.js';

// Import web-specific components
import { Component } from '../../components/Component.js';
import { VibeCard } from '../../components/Card/VibeCard.js';
import { RecipeCard } from '../../components/Card/RecipeCard.js';
import { SwipeEngine } from '../../components/SwipeEngine/SwipeEngine.js';
import { Header } from '../../components/Navigation/Header.js';
import { Loading, RecipeLoading } from '../../components/UI/Loading.js';
import { Modal, ConfirmModal, AlertModal } from '../../components/UI/Modal.js';

// Web-specific application orchestrator
export class WebApp {
  constructor() {
    this.isInitialized = false;
    this.components = new Map();
    this.vibeEngine = new VibeEngine();
    this.currentCard = null;
    this.currentSwipeEngine = null;
    
    // Web-specific containers
    this.containers = {
      cardContainer: null,
      resultContainer: null,
      headerContainer: null
    };
    
    // Web-specific UI elements
    this.elements = {
      likeGlow: null,
      nopeGlow: null
    };
  }
  
  // Initialize web application
  async initialize() {
    if (this.isInitialized) {
      console.warn('WebApp already initialized');
      return;
    }
    
    try {
      console.log('🌐 Initializing Web Application...');
      
      // Load user state
      await this.loadUserState();
      
      // Setup containers
      this.setupContainers();
      
      // Create web-specific UI elements
      this.createWebElements();
      
      // Setup header
      this.setupHeader();
      
      // Start swipe deck
      this.startSwipeDeck();
      
      // Setup event listeners
      this.setupEventListeners();
      
      this.isInitialized = true;
      
      console.log('✅ Web Application initialized successfully');
      globalEventBus.emit('app:initialized', { platform: 'web' });
      
    } catch (error) {
      console.error('❌ Failed to initialize WebApp:', error);
      this.handleError(error);
    }
  }
  
  // Setup DOM containers
  setupContainers() {
    this.containers.cardContainer = DomUtils.find('#card-container');
    this.containers.resultContainer = DomUtils.find('#result');
    this.containers.headerContainer = DomUtils.find('.header');
    
    if (!this.containers.cardContainer) {
      throw new Error('Card container not found');
    }
  }
  
  // Create web-specific UI elements
  createWebElements() {
    // Create swipe indicators
    this.elements.likeGlow = DomUtils.createElement('div', {
      className: 'swipe-glow like-glow',
      innerHTML: '<div class="glow-icon">✓</div>'
    });
    
    this.elements.nopeGlow = DomUtils.createElement('div', {
      className: 'swipe-glow nope-glow',
      innerHTML: '<div class="glow-icon">✗</div>'
    });
    
    // Add to body
    document.body.appendChild(this.elements.likeGlow);
    document.body.appendChild(this.elements.nopeGlow);
  }
  
  // Setup header component
  setupHeader() {
    if (!this.containers.headerContainer) return;
    
    const header = new Header(this.containers.headerContainer, {
      username: globalStateManager.get('currentUsername'),
      onFavoritesClick: () => this.showFavorites(),
      onPreferencesClick: () => this.showPreferences(),
      onSwitchProfileClick: () => this.switchProfile(),
      onLogoutClick: () => this.logout()
    });
    
    this.components.set('header', header);
    header.mount();
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
  }
  
  // Setup swipe functionality
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
  
  // Swipe event handlers
  onSwipeStart(data) {
    console.log('Swipe started:', data);
  }
  
  onSwipeMove(data) {
    // Update glow indicators
    const maxDistance = 200;
    const likeIntensity = Math.max(0, Math.min(1, data.distance / maxDistance));
    const nopeIntensity = Math.max(0, Math.min(1, -data.distance / maxDistance));
    
    if (this.elements.likeGlow) {
      this.elements.likeGlow.style.opacity = likeIntensity * 0.6;
    }
    if (this.elements.nopeGlow) {
      this.elements.nopeGlow.style.opacity = nopeIntensity * 0.6;
    }
  }
  
  onSwipeRight(data) {
    console.log('Swiped right - adding vibe to profile');
    const vibe = this.currentCard.getVibe();
    
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
    
    // Reset glows
    this.resetGlows();
  }
  
  onSwipeLeft(data) {
    console.log('Swiped left - rejecting vibe');
    
    // Animate card out
    this.currentCard.swipeOut('left', () => {
      this.cleanupCurrentCard();
      this.startSwipeDeck();
    });
    
    // Reset glows
    this.resetGlows();
  }
  
  onSwipeCancel(data) {
    console.log('Swipe cancelled');
    this.currentCard.resetToCenter();
    this.resetGlows();
  }
  
  // Reset glow indicators
  resetGlows() {
    if (this.elements.likeGlow) {
      this.elements.likeGlow.style.opacity = 0;
    }
    if (this.elements.nopeGlow) {
      this.elements.nopeGlow.style.opacity = 0;
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
    // Hide swipe deck
    DomUtils.hide(this.containers.cardContainer.parentElement);
    DomUtils.hide(document.querySelector('h1'));
    
    // Show result container
    DomUtils.show(this.containers.resultContainer);
    this.containers.resultContainer.style.display = 'flex';
    this.containers.resultContainer.style.flexDirection = 'column';
    this.containers.resultContainer.style.justifyContent = 'center';
    this.containers.resultContainer.style.alignItems = 'center';
    this.containers.resultContainer.style.height = '100vh';
    this.containers.resultContainer.style.margin = 0;
    
    // Create result content
    await this.createResultContent();
  }
  
  // Create result screen content
  async createResultContent() {
    const state = globalStateManager.getState();
    
    // Create sparkle container
    const sparkleContainer = DomUtils.createElement('div', { id: 'sparkle-container' });
    this.containers.resultContainer.appendChild(sparkleContainer);
    
    // Create flip card wrapper
    const wrapper = DomUtils.createElement('div', { className: 'recipe-card-wrapper' });
    
    // Front (vibe summary)
    const front = DomUtils.createElement('div', { className: 'card-face front' });
    front.innerHTML = this.createVibeSummary(state.vibeProfile);
    
    // Back (ingredients input)
    const back = DomUtils.createElement('div', { className: 'card-face back' });
    back.innerHTML = this.createIngredientsInput();
    
    // Assemble card
    wrapper.appendChild(front);
    wrapper.appendChild(back);
    this.containers.resultContainer.appendChild(wrapper);
    
    // Setup flip functionality
    this.setupFlipCard(wrapper);
    
    // Setup ingredients functionality
    this.setupIngredientsInput(back);
    
    // Add sparkles
    this.addSparkles(sparkleContainer, wrapper);
  }
  
  // Create vibe summary HTML
  createVibeSummary(vibeProfile) {
    if (vibeProfile.length === 0) {
      return `
        <div class="vibe-summary">
          <h2>🍳 Ready to Cook!</h2>
          <p>Let's find you a delicious recipe!</p>
        </div>
      `;
    }
    
    return `
      <div class="vibe-summary">
        <h2>🎯 Your Vibe Profile</h2>
        <div class="selected-vibes">
          ${vibeProfile.map(vibe => `<span class="vibe-tag">${vibe.emoji} ${vibe.name}</span>`).join('')}
        </div>
        <p class="vibe-description">Ready for your personalized recipe?</p>
      </div>
    `;
  }
  
  // Create ingredients input HTML
  createIngredientsInput() {
    return `
      <div class="ingredients-container">
        <h2>🏡 What do you have at home?</h2>
        <p class="ingredients-subtitle">Optional: Add ingredients you'd like to use</p>
        <textarea class="ingredients-input" placeholder="chicken breast, rice, garlic, spinach..." rows="3"></textarea>
        <div class="ingredients-actions">
          <button class="japandi-btn japandi-btn-subtle add-ingredients-btn">+ Add Ingredients</button>
        </div>
        <div class="ingredients-confirmation"></div>
        <button class="japandi-btn japandi-btn-primary generate-btn">🍳 Generate My Recipe</button>
      </div>
    `;
  }
  
  // Setup flip card functionality
  setupFlipCard(wrapper) {
    wrapper.addEventListener('click', () => {
      wrapper.classList.toggle('flipped');
    });
  }
  
  // Setup ingredients input functionality
  setupIngredientsInput(backElement) {
    const addBtn = backElement.querySelector('.add-ingredients-btn');
    const ingredientsInput = backElement.querySelector('.ingredients-input');
    const confirmation = backElement.querySelector('.ingredients-confirmation');
    const generateBtn = backElement.querySelector('.generate-btn');
    
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
      }
    });
    
    // Generate button
    generateBtn.addEventListener('click', async () => {
      await this.generateRecipe(backElement);
    });
  }
  
  // Generate recipe
  async generateRecipe(backElement) {
    const button = backElement.querySelector('.generate-btn');
    const container = backElement.querySelector('.ingredients-container');
    
    // Show loading
    button.innerHTML = '<span class="loading-spinner"></span> Generating... (this may take 30+ seconds)';
    button.disabled = true;
    
    try {
      const prompt = PromptBuilder.generatePersonalizedPrompt(
        globalStateManager.get('vibeProfile'),
        globalStateManager.get('preferences'),
        globalStateManager.get('ingredientsAtHome')
      );
      
      const recipeText = await apiService.generateRecipe(prompt);
      const formattedRecipe = RecipeFormatter.format(recipeText);
      
      // Update container with recipe
      container.innerHTML = `
        <h2>🍳 Your Personalized Recipe</h2>
        <div class="recipe-content">${formattedRecipe.html}</div>
        <div class="recipe-action-bar">
          <button class="action-btn primary save-favorite-btn" type="button">
            <span class="action-icon">⭐</span>
            <span class="action-text">Save to Favorites</span>
          </button>
          <button class="action-btn secondary back-to-swipe-btn" type="button">
            <span class="action-icon">🔄</span>
            <span class="action-text">Back to Swiping</span>
          </button>
        </div>
      `;
      
      // Setup action buttons
      this.setupRecipeActions(container, recipeText, formattedRecipe.title);
      
    } catch (error) {
      console.error('Failed to generate recipe:', error);
      button.textContent = 'Try Again';
      button.disabled = false;
    }
  }
  
  // Setup recipe action buttons
  setupRecipeActions(container, recipeText, title) {
    const saveBtn = container.querySelector('.save-favorite-btn');
    const backBtn = container.querySelector('.back-to-swipe-btn');
    
    // Save favorite
    saveBtn.addEventListener('click', async () => {
      try {
        saveBtn.disabled = true;
        saveBtn.querySelector('.action-text').textContent = 'Saving...';
        
        await apiService.saveFavorite({
          recipeText,
          title: title || 'Untitled Recipe',
          rating: null,
          note: null
        });
        
        saveBtn.querySelector('.action-text').textContent = 'Saved!';
        setTimeout(() => {
          saveBtn.querySelector('.action-text').textContent = 'Save to Favorites';
          saveBtn.disabled = false;
        }, 2000);
        
      } catch (error) {
        console.error('Failed to save favorite:', error);
        saveBtn.querySelector('.action-text').textContent = 'Save to Favorites';
        saveBtn.disabled = false;
      }
    });
    
    // Back to swiping
    backBtn.addEventListener('click', () => {
      location.reload();
    });
  }
  
  // Add sparkles effect
  addSparkles(sparkleContainer, wrapper) {
    setTimeout(() => {
      const rect = wrapper.getBoundingClientRect();
      const containerRect = sparkleContainer.getBoundingClientRect();
      const centerX = rect.left - containerRect.left + rect.width / 2;
      const centerY = rect.top - containerRect.top + rect.height / 2;
      
      for (let i = 0; i < 40; i++) {
        const sparkle = DomUtils.createElement('div', { className: 'sparkle' });
        
        const size = 4 + Math.random() * 16;
        const angle = Math.random() * Math.PI * 2;
        const radius = 80 + Math.random() * 180;
        
        const x = centerX + radius * Math.cos(angle) - size / 2;
        const y = centerY + radius * Math.sin(angle) - size / 2;
        
        DomUtils.setStyles(sparkle, {
          left: `${x}px`,
          top: `${y}px`,
          width: `${size}px`,
          height: `${size}px`,
          transform: `rotate(${Math.random() * 360}deg)`,
          animationDelay: `${Math.random() * 2}s`,
          animationDuration: `${1.5 + Math.random() * 1.5}s`
        });
        
        sparkleContainer.appendChild(sparkle);
      }
    }, 100);
  }
  
  // Show favorites screen
  async showFavorites() {
    console.log('Showing favorites screen...');
    // Implementation would go here
  }
  
  // Show preferences screen
  async showPreferences() {
    console.log('Showing preferences screen...');
    // Implementation would go here
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
  
  // Error handling
  handleError(error) {
    console.error('WebApp error:', error);
    
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
    if (this.elements.likeGlow) {
      this.elements.likeGlow.remove();
    }
    if (this.elements.nopeGlow) {
      this.elements.nopeGlow.remove();
    }
    
    this.isInitialized = false;
  }
}
