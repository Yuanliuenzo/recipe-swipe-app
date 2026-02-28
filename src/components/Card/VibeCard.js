import { Card } from "./Card.js";
import { CONFIG } from "../../core/Config.js";

// Platform detection
const isMobile = () => {
  return (
    window.location.pathname.includes("mobile.html") ||
    document.querySelector(".mobile-container") !== null
  );
};

// Vibe-specific card component
export class VibeCard extends Card {
  constructor(container, props = {}) {
    super(container, {
      className: isMobile() ? "mobile-vibe-card" : "vibe-card",
      ...props
    });

    this.vibe = props.vibe;
    this.round = props.round || 1;
  }

  render() {
    if (!this.vibe) {
      console.warn("VibeCard: No vibe data provided");
      return `<div class="${isMobile() ? "mobile-vibe-card" : "vibe-card"} error">No vibe data</div>`;
    }

    const { name, emoji, description, image, color } = this.vibe;

    if (isMobile()) {
      // Mobile rendering with beautiful styling
      return `
        <div class="${isMobile() ? "mobile-vibe-card" : "vibe-card"}" 
             data-component-id="${this.id}"
             data-vibe-name="${name}"
             style="background-image: url('${image}'); 
                    background-size: cover; 
                    background-position: center;
                    border: 3px solid ${color}80;
                    top: ${(this.round - 1) * 5}px;">
          <div class="mobile-vibe-card-overlay">
            <div class="mobile-vibe-emoji">${emoji}</div>
            <div class="mobile-vibe-name">${name}</div>
            <div class="mobile-vibe-description">${description}</div>
          </div>
        </div>
      `;
    } else {
      // Web rendering (original)
      return `
        <div class="card vibe-card" 
             data-component-id="${this.id}"
             data-vibe-name="${name}"
             style="background-image: url('${image}'); 
                    background-size: cover; 
                    background-position: center;
                    border: 3px solid ${color}80;
                    top: ${(this.round - 1) * 5}px;">
          <div class="overlay vibe-overlay" 
               style="background: linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7));">
            <div class="vibe-emoji">${emoji}</div>
            <div class="vibe-name">${name}</div>
            <div class="vibe-description">${description}</div>
          </div>
        </div>
      `;
    }
  }

  onMount() {
    super.onMount();

    // Add entrance animation with stagger based on round
    const cardElement = this.find(`[data-component-id="${this.id}"]`);
    if (cardElement) {
      const delay = (this.round - 1) * 100;

      setTimeout(() => {
        cardElement.style.opacity = "1";
        cardElement.style.transform = "translateY(0) scale(1)";
      }, delay);
    }
  }

  // Get vibe data
  getVibe() {
    return this.vibe;
  }

  // Get vibe name
  getVibeName() {
    return this.vibe?.name || "";
  }

  // Get vibe color
  getVibeColor() {
    return this.vibe?.color || "#000";
  }

  // Add swipe-specific animations
  showLikeIndicator() {
    this.addSwipeEffect(150, 0, 7.5, 1.05);
  }

  showNopeIndicator() {
    this.addSwipeEffect(-150, 0, -7.5, 1.05);
  }

  // Animate swipe out with direction-specific effects
  swipeOut(direction = "right", callback = null) {
    const distance = direction === "right" ? 500 : -500;
    this.animateOut(direction, distance);

    // Call callback after animation
    if (callback) {
      setTimeout(callback, CONFIG.ANIMATION_DURATION);
    }
  }

  // Reset to neutral position
  resetToCenter() {
    this.resetPosition();
  }

  // Update vibe data
  updateVibe(newVibe) {
    this.vibe = newVibe;
    this.forceUpdate();
  }
}
