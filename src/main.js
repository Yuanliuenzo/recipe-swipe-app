/**
 * Main Entry Point - Clean Unified Architecture
 * Single entry point for all devices with modular design
 */

import { initializeApplication } from './core/Application.js';
import { globalStateManager } from './core/StateManager.js';
import { globalEventBus } from './core/EventBus.js';
import { VIBES, CONFIG, DEFAULT_PREFERENCES } from './core/Config.js';

// Expose core systems globally for backward compatibility
window.recipeApp = {
  stateManager: globalStateManager,
  eventBus: globalEventBus,
  vibes: VIBES,
  maxVibeRounds: CONFIG.MAX_VIBE_ROUNDS,
  preferences: { ...DEFAULT_PREFERENCES },
  services: {} // Will be populated after app initialization
};

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

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 DOM Content Loaded - Starting Recipe Swipe App...');
  
  try {
    // Initialize the unified application
    const app = await initializeApplication();
    
    // Get the unified app and its services
    const unifiedApp = app.getUnifiedApp();
    const serviceRegistry = app.getServiceRegistry();
    
    // Setup FAB menu toggle using proper event handling
    const fab = document.querySelector('.mobile-fab');
    const fabMenu = document.querySelector('.mobile-fab-menu');
    const fabOverlay = document.querySelector('.fab-overlay');
    
    if (fab && fabMenu && fabOverlay) {
      const toggleFabMenu = () => {
        fabMenu.classList.toggle('show');
        fabOverlay.classList.toggle('show');
      };
      
      fab.addEventListener('click', toggleFabMenu);
      fabOverlay.addEventListener('click', toggleFabMenu);
    }
    
    // Setup navigation handlers using the event bus system
    globalEventBus.on('navigation:go', (data) => {
      unifiedApp.navigationService.go(data.view);
    });
    
    // Setup logout handler using event bus
    globalEventBus.on('auth:logout', () => {
      document.cookie = 'profile=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      window.location.reload();
    });
    
    // Expose minimal global API for HTML onclick handlers
    window.nav = {
      go: (view) => globalEventBus.emit('navigation:go', { view })
    };
    
    window.logout = () => {
      globalEventBus.emit('auth:logout');
    };
    
    console.log('✅ Recipe Swipe App initialized successfully!');
    console.log('📱 Device Info:', app.getAppInfo());
    
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

// Export for module usage
export { initializeApplication };
