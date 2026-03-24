import { Card } from "./Card.js";
import { CONFIG } from "../../core/Config.js";

const isMobile = () =>
  window.location.pathname.includes("mobile.html") ||
  document.querySelector(".mobile-container") !== null;

// Axis card: shows a question, full-bleed image, and two labeled swipe directions.
// Swipe RIGHT = swipeRight.label, swipe LEFT = swipeLeft.label.
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
      console.warn("VibeCard: No card data provided");
      return `<div class="vibe-card error">No card data</div>`;
    }

    const { id, image, question, swipeRight, swipeLeft } = this.vibe;
    const cls = isMobile() ? "mobile-vibe-card" : "vibe-card";

    const leftLabel = swipeLeft?.label ?? "";
    const rightLabel = swipeRight?.label ?? "";

    return `
      <div class="${cls}"
           data-component-id="${this.id}"
           data-vibe-name="${id}"
           style="background-image: url('${image}');
                  background-size: cover;
                  background-position: center;
                  top: ${(this.round - 1) * 5}px;">
        <div class="vibe-card-gradient"></div>
        ${question ? `<div class="vibe-card-question">${question}</div>` : ""}
        <div class="vibe-card-options">
          <div class="vibe-card-option vibe-card-option--left">← ${leftLabel}</div>
          <div class="vibe-card-option vibe-card-option--right">${rightLabel} →</div>
        </div>
      </div>
    `;
  }

  onMount() {
    super.onMount();
    const el = this.find(`[data-component-id="${this.id}"]`);
    if (el) {
      setTimeout(
        () => {
          el.style.opacity = "1";
          el.style.transform = "translateY(0) scale(1)";
        },
        (this.round - 1) * 100
      );
    }
  }

  // Public API (kept for backward compat)
  getVibe() {
    return this.vibe;
  }
  getVibeName() {
    return this.vibe?.id ?? "";
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
    this.animateOut(direction, direction === "right" ? 500 : -500);
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
