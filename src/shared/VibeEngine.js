import { CONFIG } from "../core/Config.js";
import { globalEventBus } from "../core/EventBus.js";
import CARDS from "../data/cards.js";

// Vibe management and shuffling logic
export class VibeEngine {
  constructor() {
    this.allCards = [...CARDS];
    this.shuffledCards = [];
    this.usedCards = new Set();
    this.currentRound = 0;
  }

  // Skip axis cards that the questionnaire already answered.
  filterCardsByContext(cards, context) {
    if (!context) {
      return cards;
    }
    return cards.filter(card => {
      // Dish format chosen → vessel axis is redundant
      if (
        card.id === "axis-vessel" &&
        context.dishFormat !== null &&
        context.dishFormat !== undefined
      ) {
        return false;
      }
      // Serving size answered → social axis is redundant
      if (card.id === "axis-social" && context.servingSize) {
        return false;
      }
      // Time available answered → effort axis is redundant
      if (card.id === "axis-effort" && context.timeAvailable) {
        return false;
      }
      return true;
    });
  }

  // Get next unique card and preload the one after it
  getNextVibe() {
    if (this.currentRound >= CONFIG.MAX_VIBE_ROUNDS) {
      return null;
    }

    if (this.shuffledCards.length === 0) {
      this.shuffleCards();
    }

    const card = this.shuffledCards.shift();
    if (card) {
      this.usedCards.add(card.id);
      this.currentRound++;

      // Preload next card's image while user views current one
      if (this.shuffledCards[0]?.image) {
        const img = new Image();
        img.src = this.shuffledCards[0].image;
      }

      globalEventBus.emit("vibe:selected", {
        vibe: card,
        round: this.currentRound
      });
      globalEventBus.emit("round:changed", { round: this.currentRound });
    }

    return card;
  }

  // Eagerly preload the first N card images so there's no wait on the opening card
  preloadFirst(n = 4) {
    const toLoad = this.shuffledCards.slice(0, n);
    toLoad.forEach(card => {
      const img = new Image();
      img.src = card.image;
    });
  }

  // Shuffle cards that haven't been used yet
  shuffleCards() {
    this.shuffledCards = this.allCards
      .filter(card => !this.usedCards.has(card.id))
      .sort(() => Math.random() - 0.5);

    globalEventBus.emit("vibes:shuffled", { count: this.shuffledCards.length });
  }

  // Reset for new round, optionally filtering by session context
  reset(sessionContext = null) {
    this.shuffledCards = [];
    this.usedCards.clear();
    this.currentRound = 0;
    this.allCards = this.filterCardsByContext([...CARDS], sessionContext);

    globalEventBus.emit("vibe:reset");
  }

  // ---------- unchanged public API ----------

  isMaxRoundsReached() {
    return this.currentRound >= CONFIG.MAX_VIBE_ROUNDS;
  }

  getCurrentRound() {
    return this.currentRound;
  }

  getMaxRounds() {
    return CONFIG.MAX_VIBE_ROUNDS;
  }

  getAllVibes() {
    return [...this.allCards];
  }

  getVibeByName(name) {
    // Cards no longer have a "name" — kept for backward-compat, returns by id
    return this.allCards.find(c => c.id === name);
  }

  addToProfile(card) {
    globalEventBus.emit("vibe:added-to-profile", { vibe: card });
  }

  getRemainingCount() {
    return this.shuffledCards.length;
  }

  forceReshuffle() {
    this.usedCards.clear();
    this.shuffleCards();
  }
}
