import { DeviceUtils } from './utils/DeviceUtils.js';
import { globalEventBus } from './core/EventBus.js';
import { globalStateManager } from './core/StateManager.js';

// Platform-specific apps
import { WebApp } from './platforms/web/WebApp.js';
import { MobileApp } from './platforms/mobile/MobileApp.js';

// Unified application class with platform detection
export class App {
  constructor() {
    this.isInitialized = false;
    this.platformApp = null;
    this.errorBoundary = null;
  }
  
  // Initialize the application
  async initialize() {
    if (this.isInitialized) {
      console.warn('App already initialized');
      return;
    }
    
    try {
      console.log('🚀 Starting Recipe Swipe Application...');
      console.log('📱 Device:', DeviceUtils.getDeviceType());
      console.log('🖥️ User Agent:', navigator.userAgent);
      
      // Setup error boundary
      this.setupErrorBoundary();
      
      // Detect platform and create appropriate app
      const platform = this.detectPlatform();
      console.log('🌐 Detected platform:', platform);
      
      // Create platform-specific app
      this.platformApp = this.createPlatformApp(platform);
      
      // Initialize platform app
      await this.platformApp.initialize();
      
      // Setup global error handling
      this.setupGlobalErrorHandling();
      
      // Setup performance monitoring
      this.setupPerformanceMonitoring();
      
      this.isInitialized = true;
      
      console.log('✅ Recipe Swipe Application initialized successfully!');
      globalEventBus.emit('app:ready', { platform, app: this.platformApp });
      
    } catch (error) {
      console.error('❌ Failed to initialize application:', error);
      this.handleCriticalError(error);
    }
  }
  
  // Detect the current platform
  detectPlatform() {
    // Check device type
    const deviceType = DeviceUtils.getDeviceType();
    
    // Additional checks for specific platforms
    const userAgent = navigator.userAgent || '';
    
    // Tablet detection
    const isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(userAgent);
    
    if (isTablet) {
      return 'tablet';
    }
    
    return deviceType;
  }
  
  // Create platform-specific app instance
  createPlatformApp(platform) {
    switch (platform) {
      case 'mobile':
        console.log('📱 Creating MobileApp instance');
        return new MobileApp();
        
      case 'desktop':
        console.log('🖥️ Creating WebApp instance');
        return new WebApp();
        
      case 'tablet':
        console.log('📱 Creating MobileApp instance for tablet');
        return new MobileApp(); // Use mobile app for tablets
        
      default:
        console.warn('Unknown platform, defaulting to WebApp');
        return new WebApp();
    }
  }
  
  // Setup error boundary
  setupErrorBoundary() {
    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.handleError(event.reason, 'UnhandledPromiseRejection');
    });
    
    // Catch uncaught errors
    window.addEventListener('error', (event) => {
      console.error('Uncaught error:', event.error);
      this.handleError(event.error, 'UncaughtError');
    });
  }
  
  // Setup global error handling
  setupGlobalErrorHandling() {
    // Listen for app-level errors
    globalEventBus.on('app:error', (error) => {
      this.handleError(error.error, error.context || 'App');
    });
    
    // Listen for component errors
    globalEventBus.on('component:error', (error) => {
      this.handleError(error.error, `Component:${error.componentId}`);
    });
  }
  
  // Handle errors with fallback UI
  handleError(error, context = 'Unknown') {
    console.error(`Error in ${context}:`, error);
    
    // Try to show user-friendly error message
    try {
      this.showUserError(error, context);
    } catch (fallbackError) {
      console.error('Failed to show error UI:', fallbackError);
      // Last resort - alert
      alert(`An error occurred: ${error.message}`);
    }
  }
  
  // Show user-friendly error message
  showUserError(error, context) {
    // Create error modal if possible
    if (window.recipeApp && window.recipeApp.components && window.recipeApp.components.AlertModal) {
      const modal = new window.recipeApp.components.AlertModal(document.body, {
        title: 'Something went wrong',
        content: this.getErrorMessage(error, context)
      });
      modal.mount();
      modal.open();
    } else {
      // Fallback to alert
      alert(this.getErrorMessage(error, context));
    }
  }
  
  // Get user-friendly error message
  getErrorMessage(error, context) {
    // Don't expose technical details to users
    const userFriendlyMessages = {
      'NetworkError': 'Unable to connect. Please check your internet connection.',
      'ValidationError': 'Invalid information provided. Please try again.',
      'AuthenticationError': 'Please log in again to continue.',
      'RecipeGenerationError': 'Unable to generate recipe right now. Please try again.',
      'UnhandledPromiseRejection': 'Something unexpected happened. Please refresh the page.',
      'UncaughtError': 'An unexpected error occurred. Please refresh the page.',
      'Component': 'A component failed to load. Please refresh the page.'
    };
    
    return userFriendlyMessages[context] || 'An unexpected error occurred. Please try again.';
  }
  
  // Handle critical errors that prevent app initialization
  handleCriticalError(error) {
    console.error('Critical application error:', error);
    
    // Show critical error message
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
  
  // Setup performance monitoring
  setupPerformanceMonitoring() {
    // Monitor app performance
    if ('performance' in window) {
      // Log performance metrics
      setTimeout(() => {
        const perfData = performance.getEntriesByType('navigation')[0];
        if (perfData) {
          console.log('📊 Performance Metrics:', {
            domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
            loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
            platform: this.detectPlatform()
          });
        }
      }, 2000);
    }
    
    // Monitor memory usage (if available)
    if ('memory' in performance) {
      setInterval(() => {
        const memory = performance.memory;
        if (memory.usedJSHeapSize > 50 * 1024 * 1024) { // 50MB threshold
          console.warn('⚠️ High memory usage detected:', {
            used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + 'MB',
            total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + 'MB'
          });
        }
      }, 10000); // Check every 10 seconds
    }
  }
  
  // Get current platform app
  getPlatformApp() {
    return this.platformApp;
  }
  
  // Get current platform
  getPlatform() {
    return this.detectPlatform();
  }
  
  // Check if app is initialized
  getIsInitialized() {
    return this.isInitialized;
  }
  
  // Restart application
  async restart() {
    console.log('🔄 Restarting application...');
    
    // Cleanup current app
    if (this.platformApp && this.platformApp.destroy) {
      this.platformApp.destroy();
    }
    
    // Reset state
    globalStateManager.reset();
    
    // Reinitialize
    await this.initialize();
  }
  
  // Get application info
  getAppInfo() {
    return {
      platform: this.getPlatform(),
      deviceType: DeviceUtils.getDeviceType(),
      isTouchDevice: DeviceUtils.isTouchDevice(),
      isMobile: DeviceUtils.isMobile(),
      userAgent: navigator.userAgent,
      viewport: DeviceUtils.getViewportSize(),
      pixelRatio: DeviceUtils.getPixelRatio(),
      isInitialized: this.isInitialized,
      version: '2.0.0' // App version
    };
  }
}

// Global app instance
let globalApp = null;

// Application initialization function
export async function initializeApp() {
  if (globalApp) {
    console.warn('App already initialized');
    return globalApp;
  }
  
  globalApp = new App();
  await globalApp.initialize();
  
  return globalApp;
}

// Get global app instance
export function getApp() {
  return globalApp;
}

// Export for direct use
// export { App }; // Removed duplicate export
