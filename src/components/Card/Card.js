import { Component } from "../Component.js";
import { DomUtils } from "../../utils/DomUtils.js";

// Base Card component
export class Card extends Component {
  constructor(container, props = {}) {
    super(container, {
      title: "",
      subtitle: "",
      image: "",
      color: "#000",
      className: "",
      onClick: null,
      ...props
    });
  }

  render() {
    const { title, subtitle, image, color, className } = this.props;

    return `
      <div class="card ${className}" data-component-id="${this.id}">
        ${
          image
            ? `
          <div class="card-image" style="background-image: url('${image}');">
            <div class="card-overlay" style="background: linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7));">
              ${title ? `<h3 class="card-title">${title}</h3>` : ""}
              ${subtitle ? `<p class="card-subtitle">${subtitle}</p>` : ""}
            </div>
          </div>
        `
            : `
          <div class="card-content">
            ${title ? `<h3 class="card-title">${title}</h3>` : ""}
            ${subtitle ? `<p class="card-subtitle">${subtitle}</p>` : ""}
          </div>
        `
        }
      </div>
    `;
  }

  onMount() {
    // Add click handler if provided
    if (this.props.onClick) {
      const cardElement = this.find(`[data-component-id="${this.id}"]`);
      if (cardElement) {
        this.addEventListener(cardElement, "click", e => {
          this.props.onClick(e, this);
        });
      }
    }

    // Add entrance animation
    const cardElement = this.find(`[data-component-id="${this.id}"]`);
    if (cardElement) {
      cardElement.style.opacity = "0";
      cardElement.style.transform = "translateY(20px) scale(0.95)";
      cardElement.style.transition = "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)";

      requestAnimationFrame(() => {
        cardElement.style.opacity = "1";
        cardElement.style.transform = "translateY(0) scale(1)";
      });
    }
  }

  // Animate card out
  animateOut(direction = "right", distance = 500) {
    const cardElement = this.find(`[data-component-id="${this.id}"]`);
    if (!cardElement) {
      return;
    }

    const rotation = direction === "right" ? distance * 0.05 : -distance * 0.05;
    cardElement.style.transition = "all 0.3s ease-out";
    cardElement.style.transform = `translateX(${distance}px) rotate(${rotation}deg) scale(0.8)`;
    cardElement.style.opacity = "0";
  }

  // Add swipe effect
  addSwipeEffect(x = 0, y = 0, rotation = 0, scale = 1) {
    const cardElement = this.find(`[data-component-id="${this.id}"]`);
    if (!cardElement) {
      return;
    }

    cardElement.style.transform = `translateX(${x}px) translateY(${y}px) rotate(${rotation}deg) scale(${scale})`;
  }

  // Reset card position
  resetPosition() {
    const cardElement = this.find(`[data-component-id="${this.id}"]`);
    if (!cardElement) {
      return;
    }

    cardElement.style.transition = "transform 0.3s ease";
    cardElement.style.transform =
      "translateX(0) translateY(0) rotate(0) scale(1)";
  }

  // Set card border color
  setBorderColor(color) {
    const cardElement = this.find(`[data-component-id="${this.id}"]`);
    if (!cardElement) {
      return;
    }

    cardElement.style.border = `2px solid ${color}50`;
  }
}
