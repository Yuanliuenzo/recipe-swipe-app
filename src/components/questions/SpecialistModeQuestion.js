/**
 * Specialist Mode Question Component
 * Optional opt-in specialist modes for users with specific intent
 */

export class SpecialistModeQuestion {
  constructor(container, { onAnswer, stateManager }) {
    this.container = container;
    this.onAnswer = onAnswer;
    this.stateManager = stateManager;
    this.selectedOption = "surprise-me"; // Default option
    this.options = []; // Will be set dynamically
  }

  render(questionConfig = {}) {
    // Get options from question config or use defaults
    this.options = questionConfig.options || this.getFallbackOptions();

    this.container.innerHTML = `
      <div class="specialist-mode-question">
        <div class="question-header">
          <h2>Any specific craving?</h2>
          <p class="question-subtitle">Choose a specialty or keep exploring with "Surprise Me"</p>
        </div>
        
        <div class="specialist-options-grid">
          ${this.generateSpecialistOptions()}
        </div>
        
        <div class="question-actions">
          <button class="japandi-btn japandi-btn-secondary skip-btn">
            Skip for now
          </button>
          <button class="japandi-btn japandi-btn-primary continue-btn">
            Continue →
          </button>
        </div>
      </div>
    `;

    this.setupInteractions();
  }

  getFallbackOptions() {
    return [
      {
        id: "surprise-me",
        label: "Surprise Me",
        icon: "🎲",
        color: "#E0E0E0",
        default: true
      },
      { id: "quick-easy", label: "Quick & Easy", icon: "⚡", color: "#00C851" },
      {
        id: "healthy-fresh",
        label: "Healthy & Fresh",
        icon: "🥗",
        color: "#4CAF50"
      },
      {
        id: "comfort-food",
        label: "Comfort Food",
        icon: "🍲",
        color: "#FF6347"
      },
      {
        id: "global-flavors",
        label: "Global Flavors",
        icon: "🌍",
        color: "#33B5E5"
      },
      {
        id: "sweet-treats",
        label: "Sweet Treats",
        icon: "🍰",
        color: "#FFB6C1"
      }
    ];
  }

  generateSpecialistOptions() {
    return this.options
      .map(
        option => `
      <div class="specialist-option ${option.default ? "selected" : ""}" 
           data-option="${option.id}" 
           style="--option-color: ${option.color || "#E0E0E0"}">
        <div class="specialist-option-icon">${option.icon}</div>
        <div class="specialist-option-label">${option.label}</div>
      </div>
    `
      )
      .join("");
  }

  setupInteractions() {
    const options = this.container.querySelectorAll(".specialist-option");
    const continueBtn = this.container.querySelector(".continue-btn");
    const skipBtn = this.container.querySelector(".skip-btn");

    // Handle option selection
    options.forEach(option => {
      option.addEventListener("click", () => {
        this.selectOption(option);
      });
    });

    // Handle continue button
    if (continueBtn) {
      continueBtn.addEventListener("click", () => {
        const selectedOption = this.container.querySelector(
          ".specialist-option.selected"
        );
        if (selectedOption) {
          const optionData = {
            id: this.selectedOption,
            label:
              selectedOption.querySelector(".specialist-option-label")
                ?.textContent || "Surprise Me"
          };
          this.onAnswer("specialist-mode", optionData);
        }
      });
    }

    // Handle skip button
    if (skipBtn) {
      skipBtn.addEventListener("click", () => {
        this.onAnswer("specialist-mode", {
          id: "surprise-me",
          label: "Surprise Me"
        });
      });
    }
  }

  selectOption(optionElement) {
    // Remove previous selection
    this.container.querySelectorAll(".specialist-option").forEach(opt => {
      opt.classList.remove("selected");
    });

    // Add selection to clicked option
    optionElement.classList.add("selected");
    this.selectedOption = optionElement.dataset.option;

    // Add subtle animation
    optionElement.style.transform = "scale(1.05)";
    setTimeout(() => {
      optionElement.style.transform = "scale(1)";
    }, 150);
  }

  destroy() {
    this.container.innerHTML = "";
  }
}
