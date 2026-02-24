/**
 * Unified Application Orchestrator
 * Single codebase for all devices - mobile, tablet, and desktop
 */

import { DeviceUtils } from '../utils/DeviceUtils.js';
import { globalEventBus } from './EventBus.js';
import { globalStateManager } from './StateManager.js';

// Core services
import { ServiceRegistry } from './services/ServiceRegistry.js';
import { ComponentRegistry } from './components/ComponentRegistry.js';

// Unified app controller
import { UnifiedApp } from './controllers/UnifiedApp.js';

export class Application {
  constructor() {
    this.isInitialized = false;
    this.unifiedApp = null;
    this.serviceRegistry = new ServiceRegistry();
    this.componentRegistry = new ComponentRegistry();
  }

  async initialize() {
    if (this.isInitialized) {
      console.warn('Application already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing Unified Recipe Swipe Application...');
      
      // 1. Setup error handling
      this.setupErrorBoundary();
      
      // 2. Initialize core services
      await this.serviceRegistry.initialize();
      await this.componentRegistry.initialize();
      
      // 3. Create unified app controller
      this.unifiedApp = new UnifiedApp(this.serviceRegistry, this.componentRegistry);
      
      // 4. Initialize unified app
      await this.unifiedApp.initialize();
      
      // 5. Setup global error handling
      this.setupGlobalErrorHandling();
      
      // 6. Setup performance monitoring
      this.setupPerformanceMonitoring();
      
      this.isInitialized = true;
      
      console.log('✅ Unified Application initialized successfully!');
      globalEventBus.emit('app:ready', { 
        app: this.unifiedApp,
        deviceInfo: DeviceUtils.getDeviceInfo()
      });
      
    } catch (error) {
      console.error('❌ Failed to initialize application:', error);
      this.handleCriticalError(error);
    }
  }

  setupErrorBoundary() {
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.handleError(event.reason, 'UnhandledPromiseRejection');
    });

    window.addEventListener('error', (event) => {
      console.error('Uncaught error:', event.error);
      this.handleError(event.error, 'UncaughtError');
    });
  }

  setupGlobalErrorHandling() {
    globalEventBus.on('app:error', (error) => {
      this.handleError(error.error, error.context || 'App');
    });

    globalEventBus.on('component:error', (error) => {
      this.handleError(error.error, `Component:${error.componentId}`);
    });
  }

  handleError(error, context = 'Unknown') {
    console.error(`Error in ${context}:`, error);
    
    try {
      this.showUserError(error, context);
    } catch (fallbackError) {
      console.error('Failed to show error UI:', fallbackError);
      alert(`An error occurred: ${error.message}`);
    }
  }

  showUserError(error, context) {
    const userFriendlyMessages = {
      'NetworkError': 'Unable to connect. Please check your internet connection.',
      'ValidationError': 'Invalid information provided. Please try again.',
      'AuthenticationError': 'Please log in again to continue.',
      'RecipeGenerationError': 'Unable to generate recipe right now. Please try again.',
      'UnhandledPromiseRejection': 'Something unexpected happened. Please refresh the page.',
      'UncaughtError': 'An unexpected error occurred. Please refresh the page.',
      'Component': 'A component failed to load. Please refresh the page.'
    };
    
    const message = userFriendlyMessages[context] || 'An unexpected error occurred. Please try again.';
    
    // Use unified app's error handling
    if (this.unifiedApp && this.unifiedApp.showError) {
      this.unifiedApp.showError(message);
    } else {
      alert(message);
    }
  }

  handleCriticalError(error) {
    console.error('Critical application error:', error);
    
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

  setupPerformanceMonitoring() {
    if ('performance' in window) {
      setTimeout(() => {
        const perfData = performance.getEntriesByType('navigation')[0];
        if (perfData) {
          console.log('📊 Performance Metrics:', {
            domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
            loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
            deviceInfo: DeviceUtils.getDeviceInfo()
          });
        }
      }, 2000);
    }

    if ('memory' in performance) {
      setInterval(() => {
        const memory = performance.memory;
        if (memory.usedJSHeapSize > 50 * 1024 * 1024) {
          console.warn('⚠️ High memory usage detected:', {
            used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + 'MB',
            total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + 'MB'
          });
        }
      }, 10000);
    }
  }

  // Public API
  getUnifiedApp() {
    return this.unifiedApp;
  }

  getServiceRegistry() {
    return this.serviceRegistry;
  }

  getComponentRegistry() {
    return this.componentRegistry;
  }

  async restart() {
    console.log('🔄 Restarting application...');
    
    if (this.unifiedApp && this.unifiedApp.destroy) {
      this.unifiedApp.destroy();
    }
    
    globalStateManager.reset();
    await this.initialize();
  }

  getAppInfo() {
    return {
      ...DeviceUtils.getDeviceInfo(),
      isInitialized: this.isInitialized,
      version: '2.0.0'
    };
  }
}

// Singleton instance
let globalApplication = null;

export async function initializeApplication() {
  if (globalApplication) {
    console.warn('Application already initialized');
    return globalApplication;
  }
  
  globalApplication = new Application();
  await globalApplication.initialize();
  
  return globalApplication;
}

export function getApplication() {
  return globalApplication;
}
