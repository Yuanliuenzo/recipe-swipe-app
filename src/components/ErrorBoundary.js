/**
 * Error Boundary Component
 * Catches and handles errors in component trees
 */

class ErrorBoundary {
  constructor(fallbackElement = null, onError = null) {
    this.fallbackElement = fallbackElement;
    this.onError = onError;
    this.hasError = false;
    this.error = null;
    this.errorInfo = null;
  }

  // Wrap a component with error boundary
  wrap(component) {
    return new Proxy(component, {
      apply: (target, thisArg, argumentsList) => {
        try {
          return target.apply(thisArg, argumentsList);
        } catch (error) {
          this.handleError(error, "Component Execution");
          return this.renderFallback();
        }
      },
      get: (target, prop) => {
        const value = target[prop];
        if (typeof value === "function") {
          return (...args) => {
            try {
              return value.apply(target, args);
            } catch (error) {
              this.handleError(error, `Component Method: ${prop}`);
              return this.renderFallback();
            }
          };
        }
        return value;
      }
    });
  }

  // Handle caught errors
  handleError(error, context = "Unknown") {
    this.hasError = true;
    this.error = error;
    this.errorInfo = { context, timestamp: Date.now() };

    console.error(`Error Boundary caught error in ${context}:`, error);

    // Call custom error handler if provided
    if (this.onError) {
      try {
        this.onError(error, context);
      } catch (handlerError) {
        console.error("Error in custom error handler:", handlerError);
      }
    }

    // Emit global error event
    if (window.recipeApp?.eventBus) {
      window.recipeApp.eventBus.emit("component:error", {
        error,
        context,
        componentId: this.constructor.name
      });
    }
  }

  // Render fallback UI
  renderFallback() {
    if (this.fallbackElement) {
      return this.fallbackElement;
    }

    // Default fallback UI
    const fallbackDiv = document.createElement("div");
    fallbackDiv.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 200px;
      padding: 20px;
      background: #fee;
      border: 1px solid #fcc;
      border-radius: 8px;
      color: #c33;
      font-family: 'Noto Sans', sans-serif;
      text-align: center;
    `;

    fallbackDiv.innerHTML = `
      <div>
        <h3 style="margin: 0 0 10px 0;">⚠️ Component Error</h3>
        <p style="margin: 0; font-size: 0.9em;">
          A component failed to render properly.
        </p>
        <button onclick="location.reload()" style="
          margin-top: 10px;
          padding: 8px 16px;
          background: #c33;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        ">Reload Page</button>
      </div>
    `;

    return fallbackDiv;
  }

  // Reset error state
  reset() {
    this.hasError = false;
    this.error = null;
    this.errorInfo = null;
  }

  // Get error information
  getError() {
    return {
      hasError: this.hasError,
      error: this.error,
      errorInfo: this.errorInfo
    };
  }
}

// Factory function for creating error boundaries
function createErrorBoundary(options = {}) {
  const { fallbackElement, onError } = options;
  return new ErrorBoundary(fallbackElement, onError);
}

// Higher-order component wrapper
function _withErrorBoundary(component, options = {}) {
  const boundary = createErrorBoundary(options);
  return boundary.wrap(component);
}

// Global error boundary setup
export function setupGlobalErrorBoundary() {
  // Setup global error handlers
  window.addEventListener("error", event => {
    console.error("Global error caught:", event.error);

    if (window.recipeApp?.eventBus) {
      window.recipeApp.eventBus.emit("app:error", {
        error: event.error,
        context: "GlobalErrorHandler"
      });
    }
  });

  window.addEventListener("unhandledrejection", event => {
    console.error("Unhandled promise rejection:", event.reason);

    if (window.recipeApp?.eventBus) {
      window.recipeApp.eventBus.emit("app:error", {
        error: event.reason,
        context: "UnhandledPromiseRejection"
      });
    }
  });
}
