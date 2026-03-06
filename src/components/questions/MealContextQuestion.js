/**
 * Meal Context Question Component
 * Visual grid for meal occasion + hunger level
 * Target: Under 3 seconds total interaction time
 */

export class MealContextQuestion {
  constructor(container, { onAnswer, stateManager }) {
    this.container = container;
    this.onAnswer = onAnswer;
    this.stateManager = stateManager;
    this.selectedOption = null;
  }

  render() {
    this.container.innerHTML = `
      <div class="meal-context-question">
        <div class="question-header">
          <h2>What are you in the mood for?</h2>
          <p class="question-subtitle">Tap what feels right</p>
        </div>
        
        <div class="meal-options-grid">
          ${this.generateMealOptions()}
        </div>
        
        <div class="question-actions">
          <button class="japandi-btn japandi-btn-primary continue-btn" disabled>
            Continue →
          </button>
        </div>
      </div>
    `;

    this.setupInteractions();
  }

  generateMealOptions() {
    const options = [
      {
        id: "breakfast-light",
        label: "Light Breakfast",
        icon: "☀️🥐",
        color: "#FFE5B4"
      },
      {
        id: "breakfast-hearty",
        label: "Hearty Breakfast",
        icon: "🍳🥓",
        color: "#FFA500"
      },
      {
        id: "lunch-light",
        label: "Light Lunch",
        icon: "🥗☀️",
        color: "#90EE90"
      },
      {
        id: "lunch-hearty",
        label: "Hearty Lunch",
        icon: "🍔🍟",
        color: "#FF6347"
      },
      {
        id: "dinner-light",
        label: "Light Dinner",
        icon: "🐟🥗",
        color: "#87CEEB"
      },
      {
        id: "dinner-hearty",
        label: "Hearty Dinner",
        icon: "🍝🥩",
        color: "#8B4513"
      },
      { id: "snack", label: "Snack", icon: "🍿🍎", color: "#DDA0DD" },
      { id: "dessert", label: "Dessert", icon: "🍰🍨", color: "#FFB6C1" }
    ];

    return options
      .map(
        option => `
      <div class="meal-option" data-option="${option.id}" style="--option-color: ${option.color}">
        <div class="meal-option-icon">${option.icon}</div>
        <div class="meal-option-label">${option.label}</div>
      </div>
    `
      )
      .join("");
  }

  setupInteractions() {
    const options = this.container.querySelectorAll(".meal-option");
    const continueBtn = this.container.querySelector(".continue-btn");

    // Handle option selection
    options.forEach(option => {
      option.addEventListener("click", () => {
        this.selectOption(option);
      });
    });

    // Handle continue button
    if (continueBtn) {
      continueBtn.addEventListener("click", () => {
        if (this.selectedOption) {
          const optionData = {
            id: this.selectedOption,
            label: this.selectedOption
              .replace("-", " ")
              .replace(/\b\w/g, l => l.toUpperCase())
          };
          this.onAnswer("meal-context", optionData);
        }
      });
    }

    // Add keyboard navigation
    this.setupKeyboardNavigation(options, continueBtn);
  }

  selectOption(optionElement) {
    // Remove previous selection
    this.container.querySelectorAll(".meal-option").forEach(opt => {
      opt.classList.remove("selected");
    });

    // Add selection to clicked option
    optionElement.classList.add("selected");
    this.selectedOption = optionElement.dataset.option;

    // Enable continue button
    const continueBtn = this.container.querySelector(".continue-btn");
    continueBtn.disabled = false;

    // Add subtle animation
    optionElement.style.transform = "scale(1.05)";
    setTimeout(() => {
      optionElement.style.transform = "scale(1)";
    }, 150);
  }

  setupKeyboardNavigation(options, continueBtn) {
    let currentIndex = -1;

    this.container.addEventListener("keydown", e => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();

        // Navigate options
        if (currentIndex === -1) {
          currentIndex = 0;
        } else if (e.key === "ArrowRight") {
          currentIndex = (currentIndex + 1) % options.length;
        } else {
          currentIndex = (currentIndex - 1 + options.length) % options.length;
        }

        this.selectOption(options[currentIndex]);
      } else if (e.key === "Enter" && continueBtn && !continueBtn.disabled) {
        continueBtn.click();
      }
    });
  }

  destroy() {
    // Clean up event listeners if needed
    this.container.innerHTML = "";
  }
}
