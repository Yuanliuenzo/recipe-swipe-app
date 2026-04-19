/**
 * RestaurantQuestionnaireView
 *
 * A focused 2-step questionnaire that replaces the swipe game for restaurant mode.
 * Questions are restaurant-specific (who + occasion) and map to semantic tags
 * that drive the embedding query.
 *
 * Pattern: progressive slot-filling — answers revealed one step at a time,
 * results triggered immediately on the final tap (no submit button needed).
 */

// Maps questionnaire answers to semantic tags for the embedding query
const QUERY_TAGS = {
  party: {
    solo: {
      label: "Just me",
      mood: ["solo", "quiet", "intimate", "restorative"],
      style: ["counter", "personal", "minimal", "peaceful"]
    },
    date: {
      label: "A date",
      mood: ["romantic", "intimate", "warm", "special", "slow"],
      style: ["bistro", "candlelit", "cozy", "restaurant-quality"]
    },
    friends: {
      label: "Friends",
      mood: ["communal", "social", "lively", "generous", "celebratory"],
      style: ["sharing", "feast", "crowd-pleasing", "convivial"]
    },
    family: {
      label: "Family",
      mood: ["warm", "casual", "relaxed", "generous", "comfortable"],
      style: ["family-friendly", "casual", "unfussy", "spacious"]
    }
  },
  occasion: {
    quick: {
      label: "Quick & easy",
      mood: ["efficient", "casual", "practical", "light"],
      style: ["casual", "unfussy", "quick", "simple", "street-food"]
    },
    relaxed: {
      label: "Relaxed dinner",
      mood: ["slow", "comfortable", "content", "restorative", "warm"],
      style: ["sit-down", "rustic", "homey", "unhurried"]
    },
    special: {
      label: "Special night",
      mood: ["celebratory", "indulgent", "treat", "impressive", "memorable"],
      style: ["restaurant-quality", "impressive", "bistro", "elegant"]
    },
    adventurous: {
      label: "Something new",
      mood: ["adventurous", "curious", "excited", "bold", "energetic"],
      style: ["fusion", "world-cuisine", "exotic", "unexpected"]
    }
  }
};

export class RestaurantQuestionnaireView {
  constructor(container, { onComplete }) {
    this.container = container;
    this.onComplete = onComplete;
    this.answers = { party: null, occasion: null, neighborhood: null };
  }

  render() {
    this.container.innerHTML = `
      <div class="restaurant-q-card">
        <div class="restaurant-q-header">
          <h2 class="restaurant-q-title">Find your spot</h2>
          <p class="restaurant-q-subtitle">Amsterdam — tonight</p>
        </div>
        <div class="restaurant-q-body" id="rq-body">
          <div class="rq-step" data-step="party">
            <p class="rq-question">Who's joining you?</p>
            <div class="rq-tiles">
              <button class="rq-tile" data-step="party" data-value="solo">
                <span class="rq-tile-icon">🧘</span>
                <span class="rq-tile-label">Just me</span>
              </button>
              <button class="rq-tile" data-step="party" data-value="date">
                <span class="rq-tile-icon">💑</span>
                <span class="rq-tile-label">A date</span>
              </button>
              <button class="rq-tile" data-step="party" data-value="friends">
                <span class="rq-tile-icon">👥</span>
                <span class="rq-tile-label">Friends</span>
              </button>
              <button class="rq-tile" data-step="party" data-value="family">
                <span class="rq-tile-icon">👨‍👩‍👧</span>
                <span class="rq-tile-label">Family</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.container
      .querySelector("#rq-body")
      .addEventListener("click", e => this._handleTile(e));
  }

  _handleTile(e) {
    const tile = e.target.closest(".rq-tile");
    if (!tile) {
      return;
    }

    const step = tile.dataset.step;
    const value = tile.dataset.value;

    // Mark selected
    this.container
      .querySelectorAll(`.rq-tile[data-step="${step}"]`)
      .forEach(t => t.classList.remove("is-selected"));
    tile.classList.add("is-selected");

    this.answers[step] = value;

    if (step === "party") {
      this._revealStep("occasion");
    } else if (step === "occasion") {
      this._revealStep("neighborhood");
    } else if (step === "neighborhood") {
      this._submit();
    }
  }

  _revealStep(stepName) {
    const body = this.container.querySelector("#rq-body");
    body.querySelector(`[data-step="${stepName}"]`)?.remove();

    const el = document.createElement("div");
    el.className = "rq-step rq-step-reveal";
    el.dataset.step = stepName;
    el.innerHTML =
      stepName === "occasion" ? this._occasionHTML() : this._neighborhoodHTML();

    body.appendChild(el);
    requestAnimationFrame(() => {
      body.scrollTo({ top: body.scrollHeight, behavior: "smooth" });
    });
  }

  _occasionHTML() {
    return `
      <p class="rq-question">What kind of evening?</p>
      <div class="rq-tiles">
        <button class="rq-tile" data-step="occasion" data-value="quick">
          <span class="rq-tile-icon">⚡</span>
          <span class="rq-tile-label">Quick & easy</span>
        </button>
        <button class="rq-tile" data-step="occasion" data-value="relaxed">
          <span class="rq-tile-icon">🕯️</span>
          <span class="rq-tile-label">Relaxed dinner</span>
        </button>
        <button class="rq-tile" data-step="occasion" data-value="special">
          <span class="rq-tile-icon">✨</span>
          <span class="rq-tile-label">Special night</span>
        </button>
        <button class="rq-tile" data-step="occasion" data-value="adventurous">
          <span class="rq-tile-icon">🌍</span>
          <span class="rq-tile-label">Something new</span>
        </button>
      </div>
    `;
  }

  _neighborhoodHTML() {
    return `
      <p class="rq-question">Which part of the city?</p>
      <div class="rq-tiles rq-tiles-neighborhood">
        <button class="rq-tile rq-tile-anywhere" data-step="neighborhood" data-value="anywhere">
          <span class="rq-tile-icon">🗺️</span>
          <span class="rq-tile-label">Anywhere</span>
        </button>
        <button class="rq-tile" data-step="neighborhood" data-value="Centrum">
          <span class="rq-tile-icon">🏙️</span>
          <span class="rq-tile-label">Centrum</span>
        </button>
        <button class="rq-tile" data-step="neighborhood" data-value="Jordaan">
          <span class="rq-tile-icon">🌹</span>
          <span class="rq-tile-label">Jordaan</span>
        </button>
        <button class="rq-tile" data-step="neighborhood" data-value="De Pijp">
          <span class="rq-tile-icon">🎨</span>
          <span class="rq-tile-label">De Pijp</span>
        </button>
        <button class="rq-tile" data-step="neighborhood" data-value="Oud-West">
          <span class="rq-tile-icon">🌿</span>
          <span class="rq-tile-label">Oud-West</span>
        </button>
        <button class="rq-tile" data-step="neighborhood" data-value="Oud-Zuid">
          <span class="rq-tile-icon">🍷</span>
          <span class="rq-tile-label">Oud-Zuid</span>
        </button>
        <button class="rq-tile" data-step="neighborhood" data-value="Oost">
          <span class="rq-tile-icon">☀️</span>
          <span class="rq-tile-label">Oost</span>
        </button>
        <button class="rq-tile" data-step="neighborhood" data-value="Noord">
          <span class="rq-tile-icon">⚓</span>
          <span class="rq-tile-label">Noord</span>
        </button>
      </div>
    `;
  }

  _submit() {
    const { party, occasion, neighborhood } = this.answers;
    if (!party || !occasion || !neighborhood) {
      return;
    }

    const partyTags = QUERY_TAGS.party[party];
    const occasionTags = QUERY_TAGS.occasion[occasion];

    const restaurantQuery = [
      {
        axis: "party",
        label: partyTags.label,
        tags: { mood: partyTags.mood, style: partyTags.style }
      },
      {
        axis: "occasion",
        label: occasionTags.label,
        tags: { mood: occasionTags.mood, style: occasionTags.style }
      }
    ];

    const activeNeighborhood =
      neighborhood === "anywhere" ? null : neighborhood;

    this.onComplete({
      party,
      occasion,
      neighborhood: activeNeighborhood,
      restaurantQuery
    });
  }
}
