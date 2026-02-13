// Swipe Service
// Manages swipe interactions, vibe selection, and recipe generation

import { CONFIG } from '../core/Config.js';
import { PromptBuilder } from '../shared/PromptBuilder.js';
import { RecipeFormatter } from '../shared/RecipeFormatter.js';

export class SwipeService {
  constructor(stateManager, eventBus, vibeEngine, apiService, uiService) {
    this.stateManager = stateManager;
    this.eventBus = eventBus;
    this.vibeEngine = vibeEngine;
    this.api = apiService;
    this.uiService = uiService;
  }
  
  initialize() {
    try {
      console.log('🔧 Initializing Swipe Service...');
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Initialize vibe engine
      this.vibeEngine.reset();
      
      console.log('✅ Swipe Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Swipe Service:', error);
      throw error;
    }
  }
  
  setupEventListeners() {
    // Listen for swipe events
    this.eventBus.on('swipe:left', () => this.handleSwipe('left'));
    this.eventBus.on('swipe:right', () => this.handleSwipe('right'));
    this.eventBus.on('vibe:next', () => this.loadNextVibe());
    this.eventBus.on('recipe:generate', () => this.generateRecipe());
  }
  
  async handleSwipe(direction) {
    try {
      const state = this.stateManager.getState();
      const currentVibe = this.vibeEngine.getCurrentVibe();
      
      if (!currentVibe) {
        console.warn('⚠️ No current vibe to handle swipe for');
        return;
      }
      
      console.log(`👆 Swipe ${direction}: ${currentVibe.name}`);
      
      if (direction === 'right') {
        // Like - add to vibe profile
        await this.handleLike(currentVibe);
      } else {
        // Dislike - just move to next
        await this.handleDislike();
      }
      
    } catch (error) {
      console.error('❌ Failed to handle swipe:', error);
      this.eventBus.emit('swipe:error', { error });
    }
  }
  
  async handleLike(vibe) {
    try {
      const state = this.stateManager.getState();
      const updatedProfile = [...(state.vibeProfile || []), vibe];
      
      this.stateManager.setState({ vibeProfile: updatedProfile });
      console.log(`❤️ Added ${vibe.name} to profile (${updatedProfile.length}/${CONFIG.MAX_VIBE_ROUNDS})`);
      
      // Update round progress indicator
      this.uiService.updateRoundProgress(updatedProfile.length, CONFIG.MAX_VIBE_ROUNDS);
      
      // Check if we've reached max rounds
      if (updatedProfile.length >= CONFIG.MAX_VIBE_ROUNDS) {
        await this.generateRecipe();
      } else {
        // Move to next vibe
        this.eventBus.emit('vibe:next');
      }
      
    } catch (error) {
      console.error('❌ Failed to handle like:', error);
      throw error;
    }
  }
  
  async handleDislike() {
    try {
      console.log('👎 Disliked - moving to next vibe');
      this.eventBus.emit('vibe:next');
    } catch (error) {
      console.error('❌ Failed to handle dislike:', error);
      throw error;
    }
  }
  
  async generateRecipe() {
    try {
      console.log('🍳 Generating recipe based on selected vibes...');
      
      const state = this.stateManager.getState();
      const prompt = this.buildPersonalizedPrompt();
      
      const data = await this.api.generateRecipe(prompt);
      const recipe = data.recipe;
      
      if (recipe) {
        // Format recipe for display
        const formattedRecipe = RecipeFormatter.format(recipe);
        
        // Emit recipe ready event
        this.eventBus.emit('recipe:ready', { 
          recipe: { ...recipe, formatted: formattedRecipe }, 
          vibes: state.vibeProfile 
        });
        
        console.log('✅ Recipe generated successfully!');
      } else {
        throw new Error('No recipe returned from API');
      }
      
    } catch (error) {
      console.error('❌ Failed to generate recipe:', error);
      this.eventBus.emit('recipe:error', { error });
      throw error;
    }
  }
  
  buildPersonalizedPrompt() {
    try {
      const state = this.stateManager.getState();
      
      return PromptBuilder.generatePersonalizedPrompt(
        state.vibeProfile || [],
        state.preferences || {},
        state.ingredientsAtHome || ''
      );
    } catch (error) {
      console.error('❌ Failed to build personalized prompt:', error);
      throw error;
    }
  }
  
  async loadNextVibe() {
    try {
      const nextVibe = this.vibeEngine.getNextVibe();
      
      if (nextVibe) {
        console.log(`🔄 Loading next vibe: ${nextVibe.name}`);
        
        // Track current vibe in state manager
        this.stateManager.setState({ currentVibe: nextVibe });
        
        this.eventBus.emit('vibe:loaded', { vibe: nextVibe });
        
        // Auto-create the next card
        this.eventBus.emit('vibe:create-card', { vibe: nextVibe });
      } else {
        console.log('🎯 No more vibes available');
        this.eventBus.emit('vibe:exhausted');
      }
      
    } catch (error) {
      console.error('❌ Failed to load next vibe:', error);
      throw error;
    }
  }
  
  getCurrentVibe() {
    // VibeEngine doesn't have getCurrentVibe, so we need to track current vibe differently
    return this.stateManager.get('currentVibe') || null;
  }
  
  getSelectedVibes() {
    return this.stateManager.get('vibeProfile') || [];
  }
  
  reset() {
    try {
      console.log('🔄 Resetting swipe service...');
      
      // Reset state
      this.stateManager.setState({
        vibeProfile: [],
        currentVibeRound: 0
      });
      
      // Reset vibe engine
      this.vibeEngine.reset();
      
      console.log('✅ Swipe service reset');
    } catch (error) {
      console.error('❌ Failed to reset swipe service:', error);
      throw error;
    }
  }
  
  // Get swipe statistics
  getStats() {
    const state = this.stateManager.getState();
    return {
      selectedVibes: state.vibeProfile?.length || 0,
      currentRound: state.currentVibeRound || 0,
      maxRounds: CONFIG.MAX_VIBE_ROUNDS,
      remainingVibes: CONFIG.MAX_VIBE_ROUNDS - (state.vibeProfile?.length || 0)
    };
  }
}
