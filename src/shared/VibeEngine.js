import { VIBES, CONFIG } from "../core/Config.js";
import { globalEventBus } from "../core/EventBus.js";

// Vibe management and shuffling logic
export class VibeEngine {
  constructor() {
    this.vibes = [...VIBES];
    this.shuffledVibes = [];
    this.usedVibes = new Set();
    this.currentRound = 0;
  }

  // Get next unique vibe
  getNextVibe() {
    // Check if we've reached max rounds
    if (this.currentRound >= CONFIG.MAX_VIBE_ROUNDS) {
      return null;
    }

    // Reshuffle if we've used all vibes
    if (this.shuffledVibes.length === 0) {
      this.shuffleVibes();
    }

    const vibe = this.shuffledVibes.shift();
    if (vibe) {
      this.usedVibes.add(vibe.name);
      this.currentRound++;

      // Emit events
      globalEventBus.emit("vibe:selected", { vibe, round: this.currentRound });
      globalEventBus.emit("round:changed", { round: this.currentRound });
    }

    return vibe;
  }

  // Shuffle vibes that haven't been used
  shuffleVibes() {
    this.shuffledVibes = this.vibes
      .filter(vibe => !this.usedVibes.has(vibe.name))
      .sort(() => Math.random() - 0.5);

    globalEventBus.emit("vibes:shuffled", { count: this.shuffledVibes.length });
  }

  // Reset for new game
  reset() {
    this.shuffledVibes = [];
    this.usedVibes.clear();
    this.currentRound = 0;

    globalEventBus.emit("vibe:reset");
  }

  // Check if max rounds reached
  isMaxRoundsReached() {
    return this.currentRound >= CONFIG.MAX_VIBE_ROUNDS;
  }

  // Get current round number
  getCurrentRound() {
    return this.currentRound;
  }

  // Get max rounds
  getMaxRounds() {
    return CONFIG.MAX_VIBE_ROUNDS;
  }

  // Get all vibes
  getAllVibes() {
    return [...this.vibes];
  }

  // Get vibes by name
  getVibeByName(name) {
    return this.vibes.find(vibe => vibe.name === name);
  }

  // Add vibe to profile (for tracking selections)
  addToProfile(vibe) {
    globalEventBus.emit("vibe:added-to-profile", { vibe });
  }

  // Get remaining vibes count
  getRemainingCount() {
    return this.shuffledVibes.length;
  }

  // Force reshuffle (for testing or manual reset)
  forceReshuffle() {
    this.usedVibes.clear();
    this.shuffleVibes();
  }
}
