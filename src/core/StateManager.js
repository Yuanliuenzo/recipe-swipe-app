import { globalEventBus } from './EventBus.js';
import { DEFAULT_PREFERENCES } from './Config.js';

// Centralized state management with reactive updates
export class StateManager {
  constructor() {
    this.state = {
      // User state
      currentUsername: '',
      vibeProfile: [],
      ingredientsAtHome: '',
      favorites: [],
      preferences: { ...DEFAULT_PREFERENCES },
      
      // Game state
      currentVibeRound: 0,
      shuffledVibes: [],
      
      // UI state
      isLoading: false,
      error: null
    };
    
    this.subscribers = new Map();
    this.history = [];
    this.maxHistorySize = 50;
  }
  
  // Get current state
  getState() {
    return { ...this.state };
  }
  
  // Get specific state value
  get(key) {
    return this.state[key];
  }
  
  // Set state with reactive updates
  setState(updates, silent = false) {
    const prevState = { ...this.state };
    
    // Update state
    Object.assign(this.state, updates);
    
    // Add to history
    this.history.push({
      timestamp: Date.now(),
      prevState,
      nextState: { ...this.state },
      updates
    });
    
    // Trim history if needed
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
    
    // Notify subscribers
    if (!silent) {
      Object.keys(updates).forEach(key => {
        const subscribers = this.subscribers.get(key);
        if (subscribers) {
          subscribers.forEach(callback => {
            try {
              callback(this.state[key], prevState[key]);
            } catch (error) {
              console.error(`Error in state subscriber for "${key}":`, error);
            }
          });
        }
      });
      
      // Emit global state change event
      globalEventBus.emit('state:changed', {
        updates,
        prevState,
        nextState: { ...this.state }
      });
    }
  }
  
  // Subscribe to state changes
  subscribe(key, callback) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key).add(callback);
    
    // Return unsubscribe function
    return () => {
      const subscribers = this.subscribers.get(key);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.subscribers.delete(key);
        }
      }
    };
  }
  
  // Reset state to initial values
  reset(keys = null) {
    if (keys) {
      const updates = {};
      keys.forEach(key => {
        if (key === 'preferences') {
          updates[key] = { ...DEFAULT_PREFERENCES };
        } else if (key === 'currentVibeRound') {
          updates[key] = 0;
        } else if (key === 'vibeProfile') {
          updates[key] = [];
        } else {
          updates[key] = '';
        }
      });
      this.setState(updates);
    } else {
      this.setState({
        currentVibeRound: 0,
        vibeProfile: [],
        ingredientsAtHome: '',
        shuffledVibes: [],
        isLoading: false,
        error: null
      });
    }
  }
  
  // Get state history
  getHistory(limit = 10) {
    return this.history.slice(-limit);
  }
  
  // Debug method to log current state
  debug() {
    console.log('Current State:', this.state);
    console.log('Subscribers:', Array.from(this.subscribers.keys()));
    console.log('History size:', this.history.length);
  }
}

// Global state manager instance
export const globalStateManager = new StateManager();
