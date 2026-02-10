import { Component } from './Component.js';
import { globalEventBus } from '../core/EventBus.js';

// Error boundary component for catching and handling component errors
export class ErrorBoundary extends Component {
  constructor(container, props = {}) {
    super(container, {
      fallback: null,
      onError: null,
      showErrorDetails: false,
      maxRetries: 3,
      ...props
    });
    
    this.hasError = false;
    this.retryCount = 0;
    this.errorInfo = null;
  }
  
  render() {
    if (this.hasError) {
      return this.renderErrorState();
    }
    
    // Render children normally
    const { children } = this.props;
    return typeof children === 'string' ? children : (children || '');
  }
  
  renderErrorState() {
    const { fallback, showErrorDetails } = this.props;
    const { error, errorInfo, retryCount } = this;
    
    return `
      <div class="error-boundary" data-component-id="${this.id}">
        <div class="error-content">
          <div class="error-icon">⚠️</div>
          <div class="error-message">
            <h3>Something went wrong</h3>
            <p>${this.getUserFriendlyMessage(error)}</p>
          </div>
          
          ${showErrorDetails ? `
            <details class="error-details">
              <summary>Error Details</summary>
              <div class="error-technical">
                <p><strong>Error:</strong> ${error?.message || 'Unknown error'}</p>
                <p><strong>Component:</strong> ${errorInfo?.componentId || 'Unknown'}</p>
                <p><strong>Retry Count:</strong> ${retryCount}/${this.props.maxRetries}</p>
                ${error?.stack ? `<p><strong>Stack:</strong> <pre>${error.stack}</pre></p>` : ''}
              </div>
            </details>
          ` : ''}
          
          <div class="error-actions">
            ${retryCount < this.props.maxRetries ? `
              <button class="error-btn error-btn-primary" onclick="window.location.reload()">
                🔄 Retry
              </button>
            ` : ''}
            
            ${fallback ? `
              <button class="error-btn error-btn-secondary" onclick="window.location.reload()">
                🏠 Go Home
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }
  
  // Get user-friendly error message
  getUserFriendlyMessage(error) {
    if (!error) return 'An unknown error occurred';
    
    // Common error patterns and user-friendly messages
    const errorPatterns = {
      'network': 'Unable to connect to the server. Please check your internet connection.',
      'fetch': 'Failed to load data. Please try again.',
      'recipe': 'Unable to generate recipe. Please try again.',
      'authentication': 'Please log in again to continue.',
      'permission': 'Permission denied. Please check your settings.',
      'quota': 'Storage quota exceeded. Please free up some space.'
    };
    
    const errorMessage = error.message || '';
    
    for (const [pattern, message] of Object.entries(errorPatterns)) {
      if (errorMessage.toLowerCase().includes(pattern)) {
        return message;
      }
    }
    
    return 'An unexpected error occurred. Please try again.';
  }
  
  // Capture error in child components
  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
    
    this.hasError = true;
    this.errorInfo = errorInfo;
    this.retryCount++;
    
    // Emit error event
    globalEventBus.emit('error-boundary:error', {
      error,
      errorInfo,
      componentId: this.id,
      retryCount: this.retryCount
    });
    
    // Call error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo, this.retryCount);
    }
    
    // Re-render with error state
    this.forceUpdate();
  }
  
  // Reset error state
  reset() {
    this.hasError = false;
    this.retryCount = 0;
    this.errorInfo = null;
    this.forceUpdate();
  }
  
  // Retry the failed operation
  retry() {
    if (this.retryCount < this.props.maxRetries) {
      this.reset();
    }
  }
  
  // Get error information
  getErrorInfo() {
    return {
      hasError: this.hasError,
      error: this.error,
      errorInfo: this.errorInfo,
      retryCount: this.retryCount
    };
  }
}

// Higher-order component that wraps other components with error boundary
export function withErrorBoundary(WrappedComponent, errorBoundaryProps = {}) {
  return class ErrorBoundaryWrapper extends Component {
    constructor(container, props = {}) {
      super(container, props);
      
      this.wrappedComponent = null;
      this.errorBoundary = null;
    }
    
    render() {
      return `<div data-error-boundary-wrapper="${this.id}"></div>`;
    }
    
    onMount() {
      // Create error boundary
      this.errorBoundary = new ErrorBoundary(this.getElement(), {
        ...errorBoundaryProps,
        children: '<div data-wrapped-component></div>',
        onError: (error, errorInfo, retryCount) => {
          console.error('Error in wrapped component:', error);
          
          // Emit error for global handling
          globalEventBus.emit('component:error', {
            error,
            componentId: this.id,
            wrappedComponent: WrappedComponent.name
          });
        }
      });
      
      this.errorBoundary.mount();
      
      // Create wrapped component
      try {
        const wrappedContainer = this.find('[data-wrapped-component]');
        this.wrappedComponent = new WrappedComponent(wrappedContainer, this.props);
        this.wrappedComponent.mount();
      } catch (error) {
        this.errorBoundary.componentDidCatch(error, {
          componentId: this.id,
          wrappedComponent: WrappedComponent.name
        });
      }
    }
    
    onUnmount() {
      if (this.wrappedComponent && this.wrappedComponent.unmount) {
        this.wrappedComponent.unmount();
      }
      
      if (this.errorBoundary && this.errorBoundary.unmount) {
        this.errorBoundary.unmount();
      }
    }
    
    // Forward methods to wrapped component
    getWrappedComponent() {
      return this.wrappedComponent;
    }
  };
}

// Global error boundary setup
export function setupGlobalErrorBoundary() {
  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Global unhandled rejection:', event.reason);
    globalEventBus.emit('global:error', {
      type: 'unhandledRejection',
      error: event.reason
    });
  });
  
  // Catch uncaught errors
  window.addEventListener('error', (event) => {
    console.error('Global uncaught error:', event.error);
    globalEventBus.emit('global:error', {
      type: 'uncaughtError',
      error: event.error,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });
  
  console.log('Global error boundary setup complete');
}
