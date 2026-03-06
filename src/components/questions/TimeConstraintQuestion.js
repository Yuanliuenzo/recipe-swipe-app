/**
 * Time Constraint Question Component
 * Optional time constraint for users with urgency
 */

export class TimeConstraintQuestion {
  constructor(container, { onAnswer, stateManager }) {
    this.container = container;
    this.onAnswer = onAnswer;
    this.stateManager = stateManager;
    this.selectedOption = "normal"; // Default option
  }

  render() {
    this.container.innerHTML = `
      <div class="time-constraint-question">
        <div class="question-header">
          <h2>How much time do you have?</h2>
          <p class="question-subtitle">We'll match recipes to your schedule (or skip if no rush)</p>
        </div>
        
        <div class="time-options-grid">
          ${this.generateTimeOptions()}
        </div>
        
        <div class="question-actions">
          <button class="japandi-btn japandi-btn-secondary skip-btn">
            No rush
          </button>
          <button class="japandi-btn japandi-btn-primary continue-btn">
            Continue →
          </button>
        </div>
      </div>
    `;

    this.setupInteractions();
  }

  generateTimeOptions() {
    const options = [
      {
        id: "quick",
        label: "Quick",
        subtitle: "15 minutes",
        icon: "⚡",
        color: "#00C851",
        default: false
      },
      {
        id: "normal",
        label: "Normal",
        subtitle: "30 minutes",
        icon: "⏰",
        color: "#33B5E5",
        default: true
      },
      {
        id: "leisurely",
        label: "Leisurely",
        subtitle: "60+ minutes",
        icon: "🕐",
        color: "#FF8800",
        default: false
      }
    ];

    return options
      .map(
        option => `
      <div class="time-option ${option.default ? "selected" : ""}" 
           data-option="${option.id}" 
           style="--option-color: ${option.color}">
        <div class="time-option-icon">${option.icon}</div>
        <div class="time-option-content">
          <div class="time-option-label">${option.label}</div>
          <div class="time-option-subtitle">${option.subtitle}</div>
        </div>
      </div>
    `
      )
      .join("");
  }

  setupInteractions() {
    const options = this.container.querySelectorAll(".time-option");
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
          ".time-option.selected"
        );
        if (selectedOption) {
          const optionData = {
            id: this.selectedOption,
            label:
              selectedOption.querySelector(".time-option-label")?.textContent ||
              "Normal"
          };
          this.onAnswer("time-constraint", optionData);
        }
      });
    }

    // Handle skip button
    if (skipBtn) {
      skipBtn.addEventListener("click", () => {
        this.onAnswer("time-constraint", { id: "normal", label: "Normal" });
      });
    }
  }

  selectOption(optionElement) {
    // Remove previous selection
    this.container.querySelectorAll(".time-option").forEach(opt => {
      opt.classList.remove("selected");
    });

    // Add selection to clicked option
    optionElement.classList.add("selected");
    this.selectedOption = optionElement.dataset.option;

    // Add subtle animation
    optionElement.style.transform = "scale(1.02)";
    setTimeout(() => {
      optionElement.style.transform = "scale(1)";
    }, 150);
  }

  destroy() {
    this.container.innerHTML = "";
  }
}
