import { Card } from "./Card.js";
import { CONFIG } from "../../core/Config.js";

// Platform detection
const isMobile = () => {
  return (
    window.location.pathname.includes("mobile.html") ||
    document.querySelector(".mobile-container") !== null
  );
};

// Image-based mood card — shows photo + evocative caption, no explicit labels
export class VibeCard extends Card {
  constructor(container, props = {}) {
    super(container, {
      className: isMobile() ? "mobile-vibe-card" : "vibe-card",
      ...props
    });

    this.vibe = props.vibe; // card object from cards.json
    this.round = props.round || 1;
  }

  render() {
    if (!this.vibe) {
      console.warn("VibeCard: No card data provided");
      return `<div class="vibe-card error">No card data</div>`;
    }

    const { id, image, caption } = this.vibe;
    const cls = isMobile() ? "mobile-vibe-card" : "vibe-card";

    return `
      <div class="${cls}"
           data-component-id="${this.id}"
           data-vibe-name="${id}"
           style="background-image: url('${image}');
                  background-size: cover;
                  background-position: center;
                  top: ${(this.round - 1) * 5}px;">
        <div class="vibe-card-gradient"></div>
        <div class="vibe-card-caption">${caption}</div>
      </div>
    `;
  }

  onMount() {
    super.onMount();

    const cardElement = this.find(`[data-component-id="${this.id}"]`);
    if (cardElement) {
      const delay = (this.round - 1) * 100;
      setTimeout(() => {
        cardElement.style.opacity = "1";
        cardElement.style.transform = "translateY(0) scale(1)";
      }, delay);
    }
  }

  getVibe() {
    return this.vibe;
  }

  // Kept for backward-compat callers
  getVibeName() {
    return this.vibe?.id || "";
  }

  getVibeColor() {
    return "#000";
  }

  showLikeIndicator() {
    this.addSwipeEffect(150, 0, 7.5, 1.05);
  }

  showNopeIndicator() {
    this.addSwipeEffect(-150, 0, -7.5, 1.05);
  }

  swipeOut(direction = "right", callback = null) {
    const distance = direction === "right" ? 500 : -500;
    this.animateOut(direction, distance);
    if (callback) {
      setTimeout(callback, CONFIG.ANIMATION_DURATION);
    }
  }

  resetToCenter() {
    this.resetPosition();
  }

  updateVibe(newVibe) {
    this.vibe = newVibe;
    this.forceUpdate();
  }
}
