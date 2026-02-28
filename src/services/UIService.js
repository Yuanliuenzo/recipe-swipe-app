// UI Service
// Manages UI interactions, modals, and user feedback

export class UIService {
  constructor(stateManager, eventBus) {
    this.stateManager = stateManager;
    this.eventBus = eventBus;
  }

  initialize() {
    try {
      console.log("🔧 Initializing UI Service...");

      // Set up event listeners
      this.setupEventListeners();

      console.log("✅ UI Service initialized");
    } catch (error) {
      console.error("❌ Failed to initialize UI Service:", error);
      throw error;
    }
  }

  setupEventListeners() {
    // Listen for UI-related events
    this.eventBus.on("ui:show-results", data => this.showResults(data));
    this.eventBus.on("ui:show-error", error => this.showError(error));
    this.eventBus.on("ui:show-success", message => this.showSuccess(message));
    this.eventBus.on("ui:show-loading", options => this.showLoading(options));
    this.eventBus.on("ui:hide-loading", () => this.hideLoading());
  }

  showResults({ recipe, vibes }) {
    try {
      console.log("🍳 Showing recipe results...");

      // Hide swipe container
      const swipeContainer = document.querySelector(
        ".swipe-container, .mobile-container"
      );
      if (swipeContainer) {
        swipeContainer.style.display = "none";
      }

      // Show result container
      const resultContainer = document.querySelector(".result, .mobile-result");
      if (resultContainer) {
        resultContainer.style.display = "block";
        resultContainer.innerHTML = `
          <div class="recipe-display">
            <div class="recipe-header">
              <h2>🍳 Your Personalized Recipe!</h2>
              <div class="selected-vibes">
                ${vibes
                  .map(
                    vibe => `
                  <span class="vibe-tag" style="background-color: ${vibe.color}">
                    ${vibe.emoji} ${vibe.name}
                  </span>
                `
                  )
                  .join("")}
              </div>
            </div>
            <div class="recipe-content">
              ${recipe.formatted || recipe}
            </div>
            <div class="recipe-actions">
              <button onclick="window.recipeApp.services.favorites.addFavorite(${JSON.stringify(recipe).replace(/"/g, "&quot;")})" class="btn-primary">
                ❤️ Save to Favorites
              </button>
              <button onclick="window.recipeApp.services.swipe.reset()" class="btn-secondary">
                🔄 Start New Round
              </button>
              <button onclick="window.location.reload()" class="btn-tertiary">
                🏠 Back to Start
              </button>
            </div>
          </div>
        `;
      }
    } catch (error) {
      console.error("❌ Failed to show results:", error);
      this.showError("Failed to display recipe results");
    }
  }

  showError(message) {
    this.showAlert(message, "error");
  }

  showSuccess(message) {
    this.showAlert(message, "success");
  }

  showAlert(message, type = "info") {
    try {
      // Remove existing alerts
      document.querySelectorAll(".alert-modal").forEach(el => el.remove());

      const modal = document.createElement("div");
      modal.className = `alert-modal alert-${type}`;
      modal.innerHTML = `
        <div class="modal-content">
          <div class="alert-icon">
            ${type === "error" ? "❌" : type === "success" ? "✅" : "ℹ️"}
          </div>
          <p>${message}</p>
          <button onclick="this.closest('.alert-modal').remove()">OK</button>
        </div>
      `;

      document.body.appendChild(modal);

      // Auto-remove after appropriate time
      const timeout = type === "error" ? 5000 : 3000;
      setTimeout(() => {
        if (modal.parentNode) {
          modal.remove();
        }
      }, timeout);
    } catch (error) {
      console.error("❌ Failed to show alert:", error);
      alert(message); // Fallback
    }
  }

  showLoading(options = {}) {
    try {
      const { message = "Loading...", overlay = true } = options;

      // Remove existing loading
      this.hideLoading();

      const loading = document.createElement("div");
      loading.className = "loading-overlay";
      loading.innerHTML = `
        <div class="loading-content">
          <div class="loading-spinner"></div>
          <p>${message}</p>
        </div>
      `;

      if (overlay) {
        loading.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        `;
      }

      document.body.appendChild(loading);
    } catch (error) {
      console.error("❌ Failed to show loading:", error);
    }
  }

  hideLoading() {
    try {
      const loading = document.querySelector(".loading-overlay");
      if (loading) {
        loading.remove();
      }
    } catch (error) {
      console.error("❌ Failed to hide loading:", error);
    }
  }

  // Show confirmation dialog
  showConfirm(message, onConfirm, onCancel) {
    try {
      const modal = document.createElement("div");
      modal.className = "confirm-modal";
      modal.innerHTML = `
        <div class="modal-content">
          <div class="confirm-icon">❓</div>
          <p>${message}</p>
          <div class="confirm-actions">
            <button onclick="window.recipeApp.services.ui.confirmAction(true)" class="btn-primary">
              Yes
            </button>
            <button onclick="window.recipeApp.services.ui.confirmAction(false)" class="btn-secondary">
              No
            </button>
          </div>
        </div>
      `;

      // Store callbacks
      this._confirmCallbacks = { onConfirm, onCancel };

      document.body.appendChild(modal);
    } catch (error) {
      console.error("❌ Failed to show confirm:", error);
      // Fallback to browser confirm
      if (confirm(message)) {
        onConfirm?.();
      } else {
        onCancel?.();
      }
    }
  }

  confirmAction(confirmed) {
    try {
      const modal = document.querySelector(".confirm-modal");
      if (modal) {
        modal.remove();
      }

      const callbacks = this._confirmCallbacks;
      if (confirmed && callbacks.onConfirm) {
        callbacks.onConfirm();
      } else if (!confirmed && callbacks.onCancel) {
        callbacks.onCancel();
      }

      this._confirmCallbacks = null;
    } catch (error) {
      console.error("❌ Failed to handle confirm action:", error);
    }
  }

  // Show preferences modal
  showPreferences() {
    this.eventBus.emit("preferences:show");
  }

  // Show favorites modal
  showFavorites() {
    this.eventBus.emit("favorites:show");
  }

  // Animate element
  animateElement(element, animation) {
    try {
      if (!element) return;

      element.classList.add(animation);

      // Remove animation class after animation completes
      const handleAnimationEnd = () => {
        element.classList.remove(animation);
        element.removeEventListener("animationend", handleAnimationEnd);
      };

      element.addEventListener("animationend", handleAnimationEnd);
    } catch (error) {
      console.error("❌ Failed to animate element:", error);
    }
  }

  // Add CSS animations if not present
  ensureAnimations() {
    if (!document.querySelector("#ui-animations")) {
      const style = document.createElement("style");
      style.id = "ui-animations";
      style.textContent = `
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        .slide-in-right { animation: slideInRight 0.3s ease-out; }
        .slide-in-left { animation: slideInLeft 0.3s ease-out; }
        .fade-in { animation: fadeIn 0.3s ease-out; }
        .pulse { animation: pulse 0.3s ease-in-out; }
        
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #007bff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .alert-modal, .confirm-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        }
        
        .modal-content {
          background: white;
          padding: 30px;
          border-radius: 8px;
          max-width: 400px;
          text-align: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        
        .alert-icon, .confirm-icon {
          font-size: 48px;
          margin-bottom: 20px;
        }
        
        .vibe-tag {
          display: inline-block;
          padding: 4px 8px;
          margin: 2px;
          border-radius: 12px;
          color: white;
          font-size: 12px;
          font-weight: bold;
        }
        
        .recipe-actions {
          margin-top: 30px;
          display: flex;
          gap: 10px;
          justify-content: center;
          flex-wrap: wrap;
        }
        
        .btn-primary { background: #007bff; color: white; }
        .btn-secondary { background: #6c757d; color: white; }
        .btn-tertiary { background: #28a745; color: white; }
        
        .btn-primary, .btn-secondary, .btn-tertiary {
          border: none;
          padding: 12px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        }
        
        .btn-primary:hover { background: #0056b3; }
        .btn-secondary:hover { background: #545b62; }
        .btn-tertiary:hover { background: #1e7e34; }
      `;

      document.head.appendChild(style);
    }
  }

  // Update round progress indicator
  updateRoundProgress(currentRound, totalRounds = 5) {
    try {
      const roundIndicator = document.querySelector(".round-indicator");
      if (!roundIndicator) {
        console.warn("Round indicator not found");
        return;
      }

      // Update data attribute for CSS targeting
      roundIndicator.setAttribute("data-round", currentRound.toString());

      // Update text
      const roundText = roundIndicator.querySelector(".round-text");
      if (roundText) {
        roundText.textContent = `Round ${currentRound} of ${totalRounds}`;
      }

      // Update progress bar width
      const progressBar = roundIndicator.querySelector(".round-progress");
      if (progressBar) {
        const progressPercentage = (currentRound / totalRounds) * 100;
        progressBar.style.width = `${progressPercentage}%`;
      }

      // Update dots
      const dots = roundIndicator.querySelectorAll(".round-dot");
      dots.forEach((dot, index) => {
        if (index < currentRound) {
          dot.classList.add("active");
        } else {
          dot.classList.remove("active");
        }
      });

      console.log(`📊 Updated round progress: ${currentRound}/${totalRounds}`);
    } catch (error) {
      console.error("❌ Failed to update round progress:", error);
    }
  }
}
