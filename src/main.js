// Main application entry point - Working integrated version
// Combines working swipe functionality with full architecture

import { globalStateManager } from './core/StateManager.js';
import { globalEventBus } from './core/EventBus.js';
import { apiService } from './core/ApiService.js';
import { VIBES, CONFIG, DEFAULT_PREFERENCES } from './core/Config.js';
import { VibeEngine } from './shared/VibeEngine.js';
import { RecipeFormatter } from './shared/RecipeFormatter.js';
import { PromptBuilder } from './shared/PromptBuilder.js';
import { DeviceUtils } from './utils/DeviceUtils.js';
import { DomUtils } from './utils/DomUtils.js';
import { SwipeUtils } from './utils/SwipeUtils.js';

// Import components
import { Component } from './components/Component.js';
import { Card } from './components/Card/Card.js';
import { VibeCard } from './components/Card/VibeCard.js';

// Import services
import { FavoritesService } from './services/FavoritesService.js';
import { UserPreferencesService } from './services/UserPreferencesService.js';
import { NavigationService } from './services/NavigationService.js';

// Platform detection
const isMobile = () => {
  return window.location.pathname.includes('mobile.html') || 
         document.querySelector('.mobile-container') !== null ||
         DeviceUtils.isMobile();
};

console.log('🔍 Platform detection:', {
  isMobile: isMobile(),
  pathname: window.location.pathname,
  hasMobileContainer: !!document.querySelector('.mobile-container'),
  deviceUtilsMobile: DeviceUtils.isMobile()
});

// Create global instances
const vibeEngine = new VibeEngine();

// Create service instances
const favoritesService = new FavoritesService(globalStateManager, apiService);
const userPreferencesService = new UserPreferencesService(globalStateManager, apiService);
const navigationService = new NavigationService();

// Expose to global scope for existing code
window.recipeApp = {
  // Core instances
  stateManager: globalStateManager,
  eventBus: globalEventBus,
  api: apiService,
  vibeEngine: vibeEngine,
  
  // Services
  services: {
    favorites: favoritesService,
    userPreferences: userPreferencesService,
    navigation: navigationService
  },
  
  // Utilities
  utils: {
    device: DeviceUtils,
    dom: DomUtils
  },
  
  // Shared classes
  RecipeFormatter,
  PromptBuilder,
  
  // Components
  components: {
    Component,
    Card,
    VibeCard
  }
};

// Make global variables available for existing code
window.vibes = VIBES;
window.maxVibeRounds = CONFIG.MAX_VIBE_ROUNDS;

// Create state proxy for backward compatibility
const stateProxy = new Proxy({}, {
  get(target, prop) {
    return globalStateManager.get(prop);
  },
  set(target, prop, value) {
    globalStateManager.setState({ [prop]: value });
    return true;
  }
});

// Expose state variables that existing code expects
window.vibeProfile = [];
window.ingredientsAtHome = '';
window.favorites = [];
window.currentUsername = '';
window.preferences = { ...DEFAULT_PREFERENCES };
window.currentVibeRound = 0;

// Sync state manager with global variables
globalStateManager.subscribe('vibeProfile', (newValue) => {
  window.vibeProfile = newValue;
});
globalStateManager.subscribe('ingredientsAtHome', (newValue) => {
  window.ingredientsAtHome = newValue;
});
globalStateManager.subscribe('favorites', (newValue) => {
  window.favorites = newValue;
});
globalStateManager.subscribe('currentUsername', (newValue) => {
  window.currentUsername = newValue;
});
globalStateManager.subscribe('preferences', (newValue) => {
  window.preferences = newValue;
});
globalStateManager.subscribe('currentVibeRound', (newValue) => {
  window.currentVibeRound = newValue;
});

console.log('🚀 Recipe App loaded with working integrated architecture!');

// Update round progress indicator
function updateRoundProgress(currentRound, totalRounds = null) {
  try {
    const roundIndicator = document.querySelector('.round-indicator');
    if (!roundIndicator) {
      console.warn('Round indicator not found');
      return;
    }

    // Get actual total vibes from vibe engine
    const actualTotalRounds = totalRounds || vibeEngine.shuffledVibes.length + vibeEngine.usedVibes.size;
    const remainingVibes = vibeEngine.shuffledVibes.length;
    
    // Calculate progress based on actual game state
    const progressPercentage = actualTotalRounds > 0 ? ((actualTotalRounds - remainingVibes) / actualTotalRounds) * 100 : 0;
    
    // Update data attribute for CSS targeting
    roundIndicator.setAttribute('data-round', currentRound.toString());
    
    // Update text to show actual progress
    const roundText = roundIndicator.querySelector('.round-text');
    if (roundText) {
      roundText.textContent = `Round ${currentRound} of ${actualTotalRounds}`;
    }
    
    // Update progress bar width
    const progressBar = roundIndicator.querySelector('.round-progress');
    if (progressBar) {
      progressBar.style.width = `${progressPercentage}%`;
    }
    
    // Update dots based on actual progress
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

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 DOM Content Loaded - Starting Recipe Swipe App...');
  
  try {
    // Initialize services first
    console.log('🔧 Initializing services...');
    await window.recipeApp.services.favorites.initialize();
    await window.recipeApp.services.userPreferences.initialize();
    console.log('✅ Services initialized');
    
    // Step 1: Basic setup first
    console.log('📦 Step 1: Basic setup...');
    vibeEngine.reset();
    
    // Step 2: Try to load user data (optional)
    try {
      await window.recipeApp.api.getUserData();
      console.log('✅ User data loaded');
    } catch (error) {
      console.warn('⚠️ Failed to load user data:', error.message);
      console.log('🎯 Continuing with default state...');
    }
    
    // Step 3: Create first vibe card with working swipe
    console.log('🎯 Step 2: Creating first vibe card...');
    const firstVibe = vibeEngine.getNextVibe();
    if (firstVibe) {
      console.log('🎯 Creating first vibe card:', firstVibe.name);
      
      // Store current vibe in state manager
      globalStateManager.setState({ currentVibe: firstVibe });
      
      const container = document.querySelector('.card-container') || document.querySelector('.mobile-card-container');
      if (container) {
        console.log('✅ Container found:', container.className);
        
        // Create vibe card using component system
        const card = new VibeCard(container, { vibe: firstVibe });
        card.mount();
        
        console.log('✅ First card created successfully');
        
        // Add working swipe functionality
        const cardElement = container.querySelector('.vibe-card') || container.querySelector('.mobile-vibe-card');
        if (cardElement) {
          // Use our working SwipeUtils
          SwipeUtils.addSwipeHandler(
            cardElement, 
            () => handleSwipe('left'),   // onSwipeLeft
            () => handleSwipe('right')   // onSwipeRight
          );
          
          // Fallback click handler
          cardElement.addEventListener('click', () => {
            console.log('👆 Card clicked - simulating swipe right');
            handleSwipe('right');
          });
          
          // Add keyboard handlers
          document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight') handleSwipe('right');
            if (e.key === 'ArrowLeft') handleSwipe('left');
          });
        }
        
      } else {
        console.error('❌ No container found for vibe cards');
      }
    } else {
      console.error('❌ No vibes available');
    }
    
    console.log('✅ Recipe Swipe App initialized successfully!');
    
  } catch (error) {
    console.error('❌ Failed to initialize app:', error);
    
    // Show error in a user-friendly way
    document.body.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        font-family: 'Noto Sans', sans-serif;
        background: #f5f5f5;
        color: #333;
        text-align: center;
        padding: 20px;
      ">
        <div style="
          max-width: 500px;
          background: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        ">
          <h1 style="margin: 0 0 20px 0; color: #d32f2f;">⚠️ Application Error</h1>
          <p style="margin: 0 0 20px 0; line-height: 1.5;">
            The application failed to start properly.
          </p>
          <p style="margin: 0 0 20px 0; color: #666; font-size: 0.9em;">
            Error: ${error.message}
          </p>
          <button onclick="location.reload()" style="
            background: #007bff;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 20px;
          ">Reload Application</button>
        </div>
      </div>
    `;
  }
});

// Working swipe handler
function handleSwipe(direction) {
  const currentVibe = globalStateManager.get('currentVibe');
  
  if (!currentVibe) {
    showResult();
    return;
  }
  
  console.log(`👆 Swipe ${direction}: ${currentVibe.name}`);
  
  if (direction === 'right') {
    // Add to profile
    const currentProfile = globalStateManager.get('vibeProfile');
    const updatedProfile = [...currentProfile, currentVibe];
    globalStateManager.setState({
      vibeProfile: updatedProfile
    });
    console.log(`❤️ Added ${currentVibe.name} to profile`);
    
    // Update round progress indicator
    updateRoundProgress(updatedProfile.length);
  }
  
  // Show next card
  showNextCard();
}

function showNextCard() {
  const container = document.querySelector('.card-container') || document.querySelector('.mobile-card-container');
  if (!container) return;
  
  const nextVibe = vibeEngine.getNextVibe();
  if (nextVibe) {
    console.log(`🔄 Loading next vibe: ${nextVibe.name}`);
    
    // Store current vibe in state manager
    globalStateManager.setState({ currentVibe: nextVibe });
    
    // Clear container and create new card
    container.innerHTML = '';
    const card = new VibeCard(container, { vibe: nextVibe });
    card.mount();
    
    // Add event listeners
    const cardElement = container.querySelector('.vibe-card') || container.querySelector('.mobile-vibe-card');
    if (cardElement) {
      // Use our working SwipeUtils
      SwipeUtils.addSwipeHandler(
        cardElement, 
        () => handleSwipe('left'),   // onSwipeLeft
        () => handleSwipe('right')   // onSwipeRight
      );
      
      // Fallback click handler
      cardElement.addEventListener('click', () => {
        handleSwipe('right');
      });
    }
    
  } else {
    showResult();
  }
}

function showResult() {
  const container = document.querySelector('.card-container') || document.querySelector('.mobile-card-container');
  if (!container) return;
  
  const profile = globalStateManager.get('vibeProfile');
  console.log('🎉 Showing result with profile:', profile);
  
  // Check if we should generate recipe or just show summary
  if (profile.length > 0) {
    // Show ingredients input and recipe generation
    showRecipeGeneration(container, profile);
  } else {
    // Show simple summary
    showSimpleResult(container);
  }
}

function showRecipeGeneration(container, profile) {
  console.log('🎯 showRecipeGeneration called with profile:', profile);
  console.log('🔍 Platform detection:', isMobile() ? 'Mobile' : 'Web');
  
  if (isMobile()) {
    // Mobile-specific handling
    console.log('🔍 DOM elements check:');
    console.log('- mobileContainer:', document.querySelector('.mobile-container'));
    console.log('- resultContainer:', document.querySelector('.mobile-result'));
    console.log('- mobile-recipe-card:', document.getElementById('mobile-recipe-card'));
    
    // Hide main container and show result container
    const mobileContainer = document.querySelector('.mobile-container');
    const resultContainer = document.querySelector('.mobile-result');
    
    if (mobileContainer) {
      mobileContainer.style.display = 'none';
      console.log('✅ Hidden mobile container');
    } else {
      console.warn('⚠️ mobile-container not found');
    }
    
    if (resultContainer) {
      resultContainer.classList.add('show');
      console.log('✅ Showed result container');
    } else {
      console.warn('⚠️ mobile-result not found');
    }
    
    // Use the result container instead of the card container
    let recipeCard = document.getElementById('mobile-recipe-card');
    if (!recipeCard) {
      console.error('❌ mobile-recipe-card not found - creating it dynamically');
      
      // Create the element dynamically if it doesn't exist
      const resultContent = document.querySelector('.mobile-result-content');
      if (resultContent) {
        recipeCard = document.createElement('div');
        recipeCard.className = 'mobile-recipe-card';
        recipeCard.id = 'mobile-recipe-card';
        resultContent.appendChild(recipeCard);
        console.log('✅ Created mobile-recipe-card dynamically');
      } else {
        console.error('❌ mobile-result-content not found either');
        return;
      }
    }
    
    // Get the recipe card (either original or dynamically created)
    const finalRecipeCard = document.getElementById('mobile-recipe-card');
    console.log('📱 Using recipe card:', finalRecipeCard);
    
    // Create vibe summary using your beautiful old structure
    const vibeSummary = profile.length > 0 
      ? `<div class="mobile-vibe-summary">
          <h2>🎯 Your Vibe Profile</h2>
          <div class="mobile-selected-vibes">
              ${profile.map(vibe => `<span class="mobile-vibe-tag">${vibe.emoji} ${vibe.name}</span>`).join('')}
          </div>
          <p style="color: #666; margin-top: 10px;">Ready for your personalized recipe?</p>
         </div>`
      : `<div class="mobile-vibe-summary">
          <h2>🍳 Ready to Cook!</h2>
          <p style="color: #666;">Let's find you a delicious recipe!</p>
         </div>`;
    
    finalRecipeCard.innerHTML = `
      ${vibeSummary}
      <div class="ingredients-container">
          <h2>🏡 What do you have at home?</h2>
          <p class="ingredients-subtitle">Optional: Add ingredients you'd like to use</p>
          <textarea class="ingredients-input" placeholder="chicken breast, rice, garlic, spinach..." rows="3"></textarea>
          <div class="ingredients-actions">
              <button class="add-ingredients-btn" type="button">
    <span class="btn-icon"></span>
    <span class="btn-text">Add Ingredients</span>
</button>
          </div>
          <div class="ingredients-confirmation"></div>
      </div>
      <button class="japandi-btn japandi-btn-primary mobile-generate-btn" type="button">🍳 Generate My Recipe</button>
    `;
    
    // Setup event listeners using your old approach
    const addBtn = finalRecipeCard.querySelector('.add-ingredients-btn');
    const ingredientsInput = finalRecipeCard.querySelector('.ingredients-input');
    const confirmation = finalRecipeCard.querySelector('.ingredients-confirmation');
    const generateBtn = finalRecipeCard.querySelector('.mobile-generate-btn');

    addBtn.addEventListener('click', () => {
      const rawValue = ingredientsInput.value.trim();
      if (rawValue) {
        const newItems = rawValue
          .split(',')
          .map(item => item.trim().toLowerCase())
          .filter(item => item.length > 0);

        const existingItems = globalStateManager.get('ingredientsAtHome')
          ? globalStateManager.get('ingredientsAtHome').split(',').map(item => item.trim().toLowerCase())
          : [];

        const combined = [...existingItems, ...newItems];
        const uniqueItems = [...new Set(combined)];
        
        globalStateManager.setState({ ingredientsAtHome: uniqueItems.join(', ') });

        ingredientsInput.value = '';

        confirmation.textContent = `✅ Added: ${newItems.join(', ')}`;
        confirmation.style.color = '#4CAF50';
        confirmation.classList.add('show');
        setTimeout(() => confirmation.classList.remove('show'), 3000);
      } else {
        confirmation.textContent = '⚠️ Please enter ingredients first';
        confirmation.style.color = '#c9a66b';
        confirmation.classList.add('show');
        setTimeout(() => confirmation.classList.remove('show'), 3000);
      }
    });

    generateBtn.addEventListener('click', () => {
      try {
        generateRecipe();
      } catch (error) {
        console.error('Error in generate button handler:', error);
      }
    });
    
    console.log('✅ Recipe generation UI rendered with beautiful styling');
  } else {
    // Web-specific handling (original working version)
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
        <h2 style="font-size: 28px; margin-bottom: 15px;">🎉 Your Vibe Profile</h2>
        <div style="margin-bottom: 20px;">
          ${profile.map(vibe => `<span style="margin: 5px; font-size: 24px;">${vibe.emoji}</span>`).join('')}
        </div>
        <p style="font-size: 16px; margin-bottom: 25px;">Ready for your personalized recipe!</p>
        
        <div style="margin-bottom: 20px; text-align: left;">
          <label style="display: block; margin-bottom: 10px; font-size: 14px;">What do you have at home? (optional)</label>
          <textarea id="ingredients-input" placeholder="chicken, rice, garlic, spinach..." style="
            width: 100%;
            padding: 10px;
            border: none;
            border-radius: 8px;
            resize: vertical;
            min-height: 60px;
            font-family: inherit;
            margin-bottom: 10px;
          "></textarea>
          <button id="add-ingredients-btn" onclick="addIngredients()" style="
            background: rgba(255,255,255,0.2);
            color: white;
            border: 1px solid rgba(255,255,255,0.3);
            padding: 8px 16px;
            border-radius: 15px;
            font-size: 12px;
            cursor: pointer;
            margin-bottom: 15px;
          ">+ Add Ingredients</button>
          <div id="ingredients-confirmation" style="font-size: 12px; margin-top: 5px; min-height: 16px;"></div>
        </div>
        
        <button onclick="generateRecipe()" style="
          background: white;
          color: #667eea;
          border: none;
          padding: 15px 30px;
          border-radius: 25px;
          font-size: 18px;
          font-weight: bold;
          cursor: pointer;
          margin-top: 15px;
          transition: all 0.3s ease;
        ">🍳 Generate My Recipe</button>
        
        <button onclick="location.reload()" style="
          background: transparent;
          color: white;
          border: 2px solid white;
          padding: 10px 20px;
          border-radius: 20px;
          font-size: 14px;
          cursor: pointer;
          margin-left: 10px;
        ">Start Over</button>
      </div>
    `;
    
    console.log('✅ Recipe generation UI rendered for web');
  }
}

function showSimpleResult(container) {
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

// Add ingredients function
function addIngredients() {
  console.log('🎯 addIngredients() called');
  
  const input = document.getElementById('ingredients-input');
  const confirmation = document.getElementById('ingredients-confirmation');
  
  if (!input || !confirmation) {
    console.error('❌ Could not find ingredients input or confirmation div');
    return;
  }
  
  const rawValue = input.value.trim();
  console.log('📝 Raw input value:', rawValue);
  
  if (rawValue) {
    const newItems = rawValue.split(',').map(item => item.trim().toLowerCase()).filter(item => item.length > 0);
    console.log('🥘 New items to add:', newItems);
    
    const existingItems = globalStateManager.get('ingredientsAtHome')?.split(',').map(item => item.trim().toLowerCase()) || [];
    console.log('🏠 Existing items:', existingItems);
    
    const combined = [...existingItems, ...newItems];
    const uniqueItems = [...new Set(combined)];
    
    globalStateManager.setState({ ingredientsAtHome: uniqueItems.join(', ') });
    console.log('✅ Updated ingredientsAtHome:', uniqueItems.join(', '));
    
    input.value = '';
    confirmation.textContent = `✅ Added: ${newItems.join(', ')}`;
    confirmation.style.color = '#4CAF50';
    
    console.log('✅ Ingredients added successfully');
    
    setTimeout(() => {
      confirmation.textContent = '';
    }, 3000);
  } else {
    console.log('⚠️ No ingredients to add');
  }
}

// Recipe generation function
async function generateRecipe() {
  console.log('🎯 generateRecipe() called');
  console.log('🔍 Platform detection:', isMobile() ? 'Mobile' : 'Web');
  
  const profile = globalStateManager.get('vibeProfile');
  const ingredients = document.getElementById('ingredients-input')?.value || globalStateManager.get('ingredientsAtHome') || '';
  
  console.log('🍳 Generating recipe with profile:', profile);
  console.log('🥘 Using ingredients:', ingredients);
  
  // Get appropriate container for both platforms
  const container = document.querySelector('.card-container') || document.querySelector('.mobile-card-container');
  
  // Move progressInterval outside try-catch so it's accessible in both
  let progressInterval = null;
  
  try {
    if (isMobile()) {
      // Mobile loading state
      let recipeCard = document.getElementById('mobile-recipe-card');
      if (!recipeCard) {
        console.error('❌ mobile-recipe-card not found for loading state - creating it dynamically');
        
        // Create the element dynamically if it doesn't exist
        const resultContent = document.querySelector('.mobile-result-content');
        if (resultContent) {
          recipeCard = document.createElement('div');
          recipeCard.className = 'mobile-recipe-card';
          recipeCard.id = 'mobile-recipe-card';
          resultContent.appendChild(recipeCard);
          console.log('✅ Created mobile-recipe-card dynamically for loading');
        } else {
          console.error('❌ mobile-result-content not found either');
          return;
        }
      }
      
      recipeCard.innerHTML = `
        <div class="mobile-recipe-loading-container">
          <div class="loading-icon">🍳</div>
          <div class="loading-title">Creating Your Recipe</div>
          <div class="loading-subtitle">This may take 30+ seconds...</div>
          <div class="loading-progress">
            <div class="loading-dots">
              <span class="loading-dot"></span>
              <span class="loading-dot"></span>
              <span class="loading-dot"></span>
            </div>
          </div>
        </div>
        <div class="mobile-recipe-skeleton">
          <div class="skeleton-line skeleton-title"></div>
          <div class="skeleton-line skeleton-subtitle"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line short"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line short"></div>
          <div class="skeleton-line"></div>
        </div>
      `;
    } else {
      // Web loading state
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
          <div style="font-size: 48px; margin-bottom: 20px;">⏳</div>
          <h2 style="font-size: 24px; margin-bottom: 15px;">Generating Recipe...</h2>
          <p style="font-size: 16px;">This may take 30+ seconds</p>
          <div style="font-size: 12px; margin-top: 10px; opacity: 0.8;">Debug: Calling API with 60 second timeout...</div>
          <div id="progress-container" style="margin-top: 20px;">
            <div style="width: 200px; height: 4px; background: rgba(255,255,255,0.3); border-radius: 2px; margin: 0 auto;">
              <div id="progress-bar" style="width: 0%; height: 100%; background: white; border-radius: 2px; transition: width 1s linear;"></div>
            </div>
            <div id="progress-text" style="font-size: 12px; margin-top: 10px; opacity: 0.8;">0%</div>
          </div>
        </div>
      `;
      
      // Start progress animation
      let progress = 0;
      progressInterval = setInterval(() => {
        progress = Math.min(progress + 2, 95);
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        if (progressBar) progressBar.style.width = progress + '%';
        if (progressText) progressText.textContent = progress + '%';
      }, 600);
    }
    
    // Build prompt
    const prompt = PromptBuilder.generatePersonalizedPrompt(
      profile,
      globalStateManager.get('preferences') || {},
      ingredients
    );
    
    console.log('🎯 Generated prompt:', prompt);
    
    // Create a custom API service with longer timeout for this call
    const customApiService = new (class extends apiService.constructor {
      constructor() {
        super();
        this.defaultHeaders = {
          'Content-Type': 'application/json'
        };
      }
      
      async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
          headers: { ...this.defaultHeaders, ...options.headers },
          ...options
        };
        
        try {
          // Emit request start event
          globalEventBus.emit('api:request:start', { endpoint, config });
          
          // Create timeout promise (60 seconds for recipe generation)
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), 60000);
          });
          
          // Make request with timeout
          const response = await Promise.race([
            fetch(url, config),
            timeoutPromise
          ]);
          
          // Emit response event
          globalEventBus.emit('api:response', { endpoint, status: response.status });
          
          // Handle HTTP errors
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
          }
          
          return await response.json();
          
        } catch (error) {
          // Emit error event
          globalEventBus.emit('api:error', { endpoint, error });
          throw error;
        }
      }
    })();
    
    // Try to generate recipe with extended timeout
    console.log('📡 Calling custom API service with 60 second timeout...');
    const recipeResponse = await customApiService.generateRecipe(prompt);
    console.log('✅ Recipe generated successfully:', recipeResponse);
    
    // Extract recipe text from response
    let recipeText = '';
    if (typeof recipeResponse === 'string') {
      recipeText = recipeResponse;
    } else if (recipeResponse && recipeResponse.recipe) {
      recipeText = recipeResponse.recipe;
    } else if (recipeResponse && typeof recipeResponse === 'object') {
      // Try to find a text property in the response
      recipeText = recipeResponse.text || recipeResponse.content || recipeResponse.data || JSON.stringify(recipeResponse);
    }
    
    console.log('📝 Extracted recipe text:', recipeText);
    
    // Clear progress interval
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
    
    // Format and display recipe
    const formattedRecipe = RecipeFormatter.format(recipeText);
    displayRecipe(container, formattedRecipe, recipeText);
    
  } catch (error) {
    // Clear progress interval
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
    
    console.error('❌ Failed to generate recipe:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack
    });
    
    // Show error with platform-specific styling
    if (isMobile()) {
      // Mobile error styling
      let recipeCard = document.getElementById('mobile-recipe-card');
      if (!recipeCard) {
        console.error('❌ mobile-recipe-card not found for error display - creating it dynamically');
        
        // Create the element dynamically if it doesn't exist
        const resultContent = document.querySelector('.mobile-result-content');
        if (resultContent) {
          recipeCard = document.createElement('div');
          recipeCard.className = 'mobile-recipe-card';
          recipeCard.id = 'mobile-recipe-card';
          resultContent.appendChild(recipeCard);
          console.log('✅ Created mobile-recipe-card dynamically for error');
        } else {
          console.error('❌ mobile-result-content not found either');
          return;
        }
      }
      
      recipeCard.innerHTML = `
        <div class="mobile-vibe-summary">
          <h2>⚠️ Recipe Generation Failed</h2>
          <p style="color: #666; margin-bottom: 15px;">${error.message}</p>
          <p style="color: #999; font-size: 14px; margin-bottom: 20px;">Make sure your backend server is running on port 3000</p>
        </div>
        <div class="mobile-recipe-actions">
          <button class="japandi-btn japandi-btn-subtle" onclick="tryAgain()" type="button">Try Again</button>
          <button class="japandi-btn japandi-btn-primary" onclick="showMockRecipe()" type="button">Show Mock Recipe</button>
        </div>
      `;
    } else {
      // Web error styling
      const container = document.querySelector('.card-container') || document.querySelector('.mobile-card-container');
      container.innerHTML = `
        <div style="
          text-align: center; 
          padding: 40px; 
          color: white;
          font-family: 'Noto Sans', sans-serif;
          background: linear-gradient(135deg, #f44336 0%, #e91e63 100%);
          border-radius: 15px;
          margin: 0 auto;
          max-width: 400px;
        ">
          <h2 style="font-size: 24px; margin-bottom: 15px;">⚠️ Recipe Generation Failed</h2>
          <p style="font-size: 16px; margin-bottom: 20px;">${error.message}</p>
          <p style="font-size: 14px; margin-bottom: 25px;">Make sure your backend server is running on port 3000</p>
          <div style="font-size: 12px; margin-bottom: 20px; opacity: 0.8;">
            Debug: Check browser console for more details
          </div>
          <div style="margin: 20px 0;">
            <button onclick="tryAgain()" style="
              background: white;
              color: #f44336;
              border: none;
              padding: 12px 24px;
              border-radius: 25px;
              font-size: 16px;
              cursor: pointer;
              margin: 5px;
            ">Try Again</button>
            <button onclick="showMockRecipe()" style="
              background: transparent;
              color: white;
              border: 2px solid white;
              padding: 10px 20px;
              border-radius: 20px;
              font-size: 14px;
              cursor: pointer;
              margin: 5px;
            ">Show Mock Recipe</button>
          </div>
        </div>
      `;
    }
  }
}

function displayRecipe(container, formattedRecipe, rawRecipe) {
  console.log('🎭 displayRecipe called with:', {
    formattedRecipe,
    rawRecipe: rawRecipe?.substring(0, 100) + '...'
  });

  console.log('🔍 Platform detection:', isMobile() ? 'Mobile' : 'Web');

  if (!formattedRecipe || !formattedRecipe.html) {
    console.error('❌ No formatted recipe HTML available');
    return;
  }

  // ----------------------------
  // MOBILE VERSION
  // ----------------------------
  if (isMobile()) {

    // Get or create mobile recipe card safely
    let recipeCard = document.getElementById('mobile-recipe-card');

    if (!recipeCard) {
      const resultContent = document.querySelector('.mobile-result-content');
      if (!resultContent) {
        console.error('❌ mobile-result-content not found');
        return;
      }

      recipeCard = document.createElement('div');
      recipeCard.className = 'mobile-recipe-card';
      recipeCard.id = 'mobile-recipe-card';
      resultContent.appendChild(recipeCard);

      console.log('✅ Created mobile-recipe-card dynamically');
    }

    // Detect sections safely
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = formattedRecipe.html;

    const hasIngredients = !!tempDiv.querySelector('[data-recipe-section="ingredients"]');
    const hasInstructions = !!tempDiv.querySelector('[data-recipe-section="instructions"]');

    // ----------------------------
    // Render layout
    // ----------------------------
    recipeCard.innerHTML = `
      <div class="mobile-recipe-title">
        <h2>${formattedRecipe.title}</h2>
      </div>
      
      ${hasIngredients && hasInstructions ? `
        <div class="mobile-recipe-toggle" role="tablist">
          <button 
            type="button"
            class="mobile-recipe-toggle-btn active"
            data-target="ingredients"
            role="tab"
            aria-selected="true">
            Ingredients
          </button>
          <button 
            type="button"
            class="mobile-recipe-toggle-btn"
            data-target="instructions"
            role="tab"
            aria-selected="false">
            Instructions
          </button>
        </div>
      ` : ''}

      <div class="mobile-recipe-content">
        ${formattedRecipe.html}
      </div>

      <div class="scroll-to-top" id="scroll-to-top" title="Scroll to top">
        ↑
      </div>

      <div class="mobile-recipe-actions">
        <button class="mobile-reset-btn japandi-btn japandi-btn-subtle" type="button">
          🔄 Start Over
        </button>
        <button class="save-favorite-btn japandi-btn japandi-btn-primary" type="button">
          ⭐ Save Favorite
        </button>
      </div>
    `;

    const content = recipeCard.querySelector('.mobile-recipe-content');

    // ----------------------------
    // TOGGLE FUNCTIONALITY
    // ----------------------------
    if (hasIngredients && hasInstructions) {
      const toggleBtns = recipeCard.querySelectorAll('.mobile-recipe-toggle-btn');
      const sections = content.querySelectorAll('[data-recipe-section]');

      // Set initial positions and show ingredients by default
      sections.forEach(section => {
        if (section.dataset.recipeSection === 'ingredients') {
          section.classList.add('is-active');
        } else {
          section.style.transform = 'translateX(100%)';
        }
      });

      toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const target = btn.dataset.target;
          const currentActive = content.querySelector('.recipe-section.is-active');
          const targetSection = content.querySelector(`[data-recipe-section="${target}"]`);

          if (!targetSection || currentActive === targetSection) return;

          // Update button states
          toggleBtns.forEach(b => {
            const isActive = b.dataset.target === target;
            b.classList.toggle('active', isActive);
            b.setAttribute('aria-selected', isActive);
          });

          // Smooth transition: slide out current, slide in new
          currentActive.classList.remove('is-active');
          currentActive.classList.add('prev-active');
          
          // Slide in new section
          targetSection.style.transform = 'translateX(100%)';
          targetSection.classList.add('is-active');
          
          // Force reflow for smooth animation
          targetSection.offsetHeight;
          
          targetSection.style.transform = 'translateX(0)';
          
          // Clean up previous section after transition
          setTimeout(() => {
            currentActive.classList.remove('prev-active');
            currentActive.style.transform = 'translateX(100%)';
          }, 500);

          // Smooth scroll to top of recipe content
          content.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        });
      });
    }

    // ----------------------------
    // SAVE FAVORITE
    // ----------------------------
    const saveBtn = recipeCard.querySelector('.save-favorite-btn');
    const resetBtn = recipeCard.querySelector('.mobile-reset-btn');

    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        try {
          saveBtn.disabled = true;
          saveBtn.classList.add('is-loading');
          saveBtn.textContent = 'Saving...';

          await apiService.saveFavorite({
            recipeText: rawRecipe,
            title: formattedRecipe.title || 'Untitled Recipe'
          });

          saveBtn.textContent = '✅ Saved!';
          setTimeout(() => {
            saveBtn.textContent = '⭐ Save Favorite';
            saveBtn.disabled = false;
            saveBtn.classList.remove('is-loading');
          }, 2000);

        } catch (error) {
          console.error('❌ Failed to save favorite:', error);
          saveBtn.textContent = '❌ Failed';
          setTimeout(() => {
            saveBtn.textContent = '⭐ Save Favorite';
            saveBtn.disabled = false;
            saveBtn.classList.remove('is-loading');
          }, 2000);
        }
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        location.reload();
      });
    }

    // ----------------------------
    // SCROLL TO TOP FUNCTIONALITY
    // ----------------------------
    const scrollToTopBtn = recipeCard.querySelector('#scroll-to-top');
    const recipeContent = recipeCard.querySelector('.mobile-recipe-content');

    if (scrollToTopBtn && recipeContent) {
      // Show/hide scroll-to-top button based on scroll position
      recipeContent.addEventListener('scroll', () => {
        if (recipeContent.scrollTop > 100) {
          scrollToTopBtn.classList.add('visible');
        } else {
          scrollToTopBtn.classList.remove('visible');
        }
      });

      // Scroll to top when clicked
      scrollToTopBtn.addEventListener('click', () => {
        recipeContent.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      });
    }

  } else {

    // ----------------------------
    // WEB VERSION
    // ----------------------------
    container.innerHTML = `
      <div class="web-recipe-wrapper">
        ${formattedRecipe.html}
        <div class="web-recipe-actions">
          <button onclick="location.reload()" class="primary-btn">
            🔄 Start Over
          </button>
        </div>
      </div>
    `;
  }
}

// Mock recipe function for testing without backend
function showMockRecipe() {
  console.log('🎭 Showing mock recipe for testing...');
  
  const mockRecipeText = `
Quick Healthy Chicken Stir-Fry
===

Ingredients:
• 2 chicken breasts, sliced thin
• 2 cups mixed vegetables (bell peppers, broccoli, carrots)
• 2 cloves garlic, minced
• 2 tbsp soy sauce
• 1 tbsp olive oil
• 1 tsp ginger, grated
• 2 cups cooked rice

Instructions:
1. Heat olive oil in a large skillet over medium-high heat
2. Add chicken slices and cook for 5-6 minutes until golden
3. Add garlic and ginger, stir for 30 seconds until fragrant
4. Add mixed vegetables and stir-fry for 3-4 minutes until crisp-tender
5. Add soy sauce and toss everything together
6. Serve immediately over hot rice

Perfect for a healthy, quick weeknight dinner that's packed with fresh vegetables!
  `.trim();
  
  console.log('📝 Mock recipe text created:', mockRecipeText);
  
  const container = document.querySelector('.card-container') || document.querySelector('.mobile-card-container');
  const formattedRecipe = RecipeFormatter.format(mockRecipeText);
  console.log('🎨 Formatted recipe:', formattedRecipe);
  
  displayRecipe(container, formattedRecipe, mockRecipeText);
}

// Expose functions to global scope for HTML onclick handlers
window.addIngredients = addIngredients;
window.generateRecipe = generateRecipe;
window.tryAgain = generateRecipe; // Retry generation
window.showMockRecipe = showMockRecipe; // Show mock recipe for testing
window.showFavorites = showFavorites;
window.showPreferences = showPreferences;
window.logout = logout;

// Expose navigation globally for HTML onclick handlers
window.nav = navigationService;

// Mobile Navigation Functions
function showFavorites() {
  console.log('🌟 showFavorites() called!');
  navigationService.go('favorites');
}

function showPreferences() {
  console.log('⚙️ showPreferences() called!');
  navigationService.go('preferences');
}

function logout() {
  console.log('🚪 logout() called!');
  try {
    // Clear user data and redirect to login/home
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/'; // Adjust based on your app's login route
  } catch (error) {
    console.error('❌ Failed to logout:', error);
  }
}

// FAB Menu Toggle
document.addEventListener('DOMContentLoaded', () => {
  const fab = document.querySelector('.mobile-fab');
  const fabMenu = document.querySelector('.mobile-fab-menu');
  const fabOverlay = document.querySelector('.fab-overlay');
  const fabItems = document.querySelectorAll('.fab-item');
  
  if (fab && fabMenu && fabOverlay) {
    const closeMenu = () => {
      fabMenu.classList.remove('show');
      fabOverlay.classList.remove('show');
    };
    
    fab.addEventListener('click', () => {
      const isOpen = fabMenu.classList.contains('show');
      
      if (isOpen) {
        closeMenu();
      } else {
        fabMenu.classList.add('show');
        fabOverlay.classList.add('show');
      }
    });
    
    // Close menu when clicking overlay
    fabOverlay.addEventListener('click', closeMenu);
    
    // Close menu when clicking any menu item
    fabItems.forEach(item => {
      item.addEventListener('click', closeMenu);
    });
  }
});

console.log('🎯 Functions exposed to global scope:', {
  addIngredients: typeof window.addIngredients,
  generateRecipe: typeof window.generateRecipe,
  tryAgain: typeof window.tryAgain,
  showMockRecipe: typeof window.showMockRecipe,
  showFavorites: typeof window.showFavorites,
  showPreferences: typeof window.showPreferences,
  logout: typeof window.logout
});
