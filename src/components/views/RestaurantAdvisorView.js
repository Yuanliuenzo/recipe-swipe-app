/* global L */
/**
 * RestaurantAdvisorView
 *
 * Full-screen restaurant discovery UI with:
 *   - Leaflet map with vibe-matched pins
 *   - Ranked result list
 *   - Refinement bar: neighborhood pills + NL search input
 *   - Streaming "Why this place?" LLM explanations
 *
 * Techniques:
 *   RAG — embedding cosine similarity for base ranking
 *   Hybrid retrieval — structured geo/cuisine filters + semantic re-ranking
 *   Slot-filling — NL input parsed for neighborhood/cuisine signals
 *   Streaming LLM — SSE explanations
 */

const AMSTERDAM_CENTER = [52.3676, 4.9041];
const AMSTERDAM_ZOOM = 13;
const SCORE_HIGH = 0.82;
const SCORE_MED = 0.78;

// Known neighborhood centers for geo-filtering
const NEIGHBORHOODS = [
  { name: "Centrum", center: [52.3728, 4.8936], radius: 1200 },
  { name: "Jordaan", center: [52.3752, 4.8826], radius: 800 },
  { name: "De Pijp", center: [52.354, 4.8971], radius: 900 },
  { name: "Oud-West", center: [52.3639, 4.8737], radius: 900 },
  { name: "Oud-Zuid", center: [52.3465, 4.872], radius: 1000 },
  { name: "Oost", center: [52.3618, 4.9257], radius: 1200 },
  { name: "Noord", center: [52.4007, 4.9236], radius: 1500 },
  { name: "Westerpark", center: [52.3855, 4.8682], radius: 900 },
  { name: "De Baarsjes", center: [52.3692, 4.858], radius: 800 },
  { name: "Watergraafsmeer", center: [52.3497, 4.9365], radius: 1000 }
];

// Cuisine keyword map for client-side NL parsing
const CUISINE_KEYWORDS = {
  japanese: [
    "japanese",
    "sushi",
    "ramen",
    "izakaya",
    "yakitori",
    "japanese food"
  ],
  italian: [
    "italian",
    "pasta",
    "pizza",
    "trattoria",
    "risotto",
    "italian food"
  ],
  french: ["french", "bistro", "brasserie", "french food"],
  indonesian: ["indonesian", "nasi", "rijsttafel", "satay", "indonesian food"],
  chinese: ["chinese", "dim sum", "peking", "cantonese"],
  thai: ["thai", "pad thai", "curry", "thai food"],
  indian: ["indian", "curry", "tandoor", "masala", "indian food"],
  vietnamese: ["vietnamese", "pho", "banh mi", "vietnamese food"],
  turkish: ["turkish", "kebab", "meze", "turkish food"],
  moroccan: ["moroccan", "tagine", "couscous", "moroccan food"],
  spanish: ["spanish", "tapas", "paella", "spanish food"],
  greek: ["greek", "mezze", "gyros", "greek food"],
  american: ["burger", "burgers", "bbq", "american", "steak"],
  seafood: ["seafood", "fish", "oysters", "shellfish"],
  vegetarian: ["vegetarian", "vegan", "plant-based", "veggie"]
};

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseNLSlots(text) {
  const lower = text.toLowerCase();
  const slots = { neighborhood: null, cuisine: null };

  // Neighborhood detection
  for (const n of NEIGHBORHOODS) {
    if (lower.includes(n.name.toLowerCase())) {
      slots.neighborhood = n.name;
      break;
    }
  }

  // Cuisine detection
  for (const [cuisine, keywords] of Object.entries(CUISINE_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      slots.cuisine = cuisine;
      break;
    }
  }

  return slots;
}

export class RestaurantAdvisorView {
  constructor(container, { query = [], neighborhood = null } = {}) {
    this.container = container;
    this.query = query;
    this.map = null;
    this.markers = new Map();
    this.restaurants = [];
    this.explainAbortController = null;
    this._lastQueryKey = null;
    this._browseMode = false;
    this._browseOffset = 0;
    this._browseTotal = null;
    this._browseHasMore = false;

    // Refinement state — seeded from questionnaire
    this.activeNeighborhood = neighborhood;
    this.activeNL = "";
    this._nlDebounceTimer = null;
  }

  updateQuery(query) {
    this.query = query;
  }

  async render() {
    const queryKey = JSON.stringify(this.query.map(v => v.label));
    const sameQuery =
      queryKey === this._lastQueryKey && this.restaurants.length > 0;

    this.container.innerHTML = this._buildSkeleton();
    await new Promise(r => requestAnimationFrame(r));

    this._initMap();
    this._bindBackButton();
    this._bindRefinement();

    if (sameQuery) {
      this._renderList(this.container.querySelector("#restaurant-list"));
      this._renderPins();
    } else {
      this._lastQueryKey = queryKey;
      await this._search();
    }
  }

  // ─── Skeleton ────────────────────────────────────────────

  _buildSkeleton() {
    const queryLabels = this.query.map(v => v.label).join(" · ");

    const neighborhoodPills = NEIGHBORHOODS.map(
      n => `
      <button class="refine-pill ${this.activeNeighborhood === n.name ? "is-active" : ""}"
              data-neighborhood="${n.name}">
        ${n.name}
      </button>
    `
    ).join("");

    return `
      <div class="restaurant-view">
        <div class="restaurant-header">
          <button class="restaurant-back-btn">← Back</button>
          <div class="restaurant-header-text">
            <h2 class="restaurant-title">Eat out tonight</h2>
            ${
              queryLabels
                ? `<p class="restaurant-subtitle">${this._escapeHtml(queryLabels)}</p>`
                : `<p class="restaurant-subtitle">Amsterdam restaurants</p>`
            }
            ${
              this._browseTotal !== null
                ? `<p class="restaurant-indexed-count">${this._browseTotal.toLocaleString()} restaurants indexed</p>`
                : ""
            }
          </div>
          <div class="restaurant-view-toggle">
            <button class="view-toggle-btn ${!this._browseMode ? "is-active" : ""}" data-view="matched">
              Vibe matched
            </button>
            <button class="view-toggle-btn ${this._browseMode ? "is-active" : ""}" data-view="browse">
              Browse all
            </button>
          </div>
        </div>

        <div class="refine-bar">
          <div class="refine-pills" id="refine-pills">
            <button class="refine-pill ${!this.activeNeighborhood ? "is-active" : ""}" data-neighborhood="">
              Anywhere
            </button>
            ${neighborhoodPills}
          </div>
          <div class="refine-nl">
            <input
              type="text"
              class="refine-nl-input"
              id="refine-nl-input"
              placeholder="e.g. cozy Japanese in Jordaan…"
              value="${this._escapeHtml(this.activeNL)}"
              autocomplete="off"
            />
            ${
              this.activeNL
                ? `<button class="refine-nl-clear" id="refine-nl-clear">✕</button>`
                : ""
            }
          </div>
        </div>

        <div class="restaurant-map" id="restaurant-map"></div>
        <div class="restaurant-list" id="restaurant-list">
          <div class="restaurant-loading">
            <div class="loading-spinner"></div>
            <p>Finding your spot…</p>
          </div>
        </div>
      </div>
    `;
  }

  // ─── Map ─────────────────────────────────────────────────

  _initMap() {
    const mapEl = this.container.querySelector("#restaurant-map");
    if (!mapEl || !window.L) {
      return;
    }

    if (this.map) {
      this.map.remove();
      this.map = null;
      this.markers.clear();
    }

    this.map = L.map(mapEl, { center: AMSTERDAM_CENTER, zoom: AMSTERDAM_ZOOM });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(this.map);
  }

  _pinIcon(score) {
    const color =
      score === null || score === undefined
        ? "#7a8c9e" // neutral grey-blue for browse mode
        : score >= SCORE_HIGH
          ? "#5a7a50"
          : score >= SCORE_MED
            ? "#c4924a"
            : "#c05a3a";
    return L.divIcon({
      className: "",
      html: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32">
        <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z"
              fill="${color}" stroke="white" stroke-width="1.5"/>
        <circle cx="12" cy="12" r="5" fill="white" opacity="0.9"/>
      </svg>`,
      iconSize: [24, 32],
      iconAnchor: [12, 32],
      popupAnchor: [0, -32]
    });
  }

  // ─── Search ───────────────────────────────────────────────

  async _search() {
    const listEl = this.container.querySelector("#restaurant-list");
    try {
      const res = await fetch("/api/restaurants/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vibeProfile: this.query,
          neighborhood: this.activeNeighborhood
        })
      });

      if (!res.ok) {
        const err = await res.json();
        this._showError(listEl, err.error || "Search failed");
        return;
      }

      const data = await res.json();
      if (data.message) {
        listEl.innerHTML = `<div class="restaurant-empty"><p>${data.message}</p></div>`;
        return;
      }

      this.restaurants = data.restaurants;
      this._applyFiltersAndRender();
    } catch (err) {
      this._showError(listEl, err.message);
    }
  }

  async _browseAll(append = false) {
    const listEl = this.container.querySelector("#restaurant-list");
    if (!append) {
      this._browseOffset = 0;
      this.restaurants = [];
      listEl.innerHTML = `<div class="restaurant-loading"><div class="loading-spinner"></div><p>Loading restaurants…</p></div>`;
    }

    try {
      const res = await fetch(
        `/api/restaurants/all?offset=${this._browseOffset}&limit=30`
      );
      if (!res.ok) {
        this._showError(listEl, "Failed to load restaurants");
        return;
      }

      const data = await res.json();
      this._browseTotal = data.total;
      this._browseHasMore = data.hasMore;
      this._browseOffset += data.restaurants.length;

      if (!data.total) {
        listEl.innerHTML = `<div class="restaurant-empty"><p>No restaurants indexed yet. Run: <code>node scripts/ingest-restaurants.js</code></p></div>`;
        return;
      }

      // Update indexed count in header (now we know the total)
      const countEl = this.container.querySelector(".restaurant-indexed-count");
      if (countEl) {
        countEl.textContent = `${data.total.toLocaleString()} restaurants indexed`;
      } else {
        const subtitleEl = this.container.querySelector(".restaurant-subtitle");
        if (subtitleEl) {
          const badge = document.createElement("p");
          badge.className = "restaurant-indexed-count";
          badge.textContent = `${data.total.toLocaleString()} restaurants indexed`;
          subtitleEl.after(badge);
        }
      }

      const newItems = data.restaurants.map(r => ({ ...r, score: null }));
      this.restaurants = append ? [...this.restaurants, ...newItems] : newItems;
      this._renderBrowseList(listEl);
      this._renderPins(this.restaurants);
    } catch (err) {
      this._showError(listEl, err.message);
    }
  }

  _renderBrowseList(listEl) {
    const cards = this.restaurants
      .map((r, i) => this._buildCard(r, i))
      .join("");
    listEl.innerHTML = `
      <div class="restaurant-list-header">
        <span class="restaurant-count">${this._browseOffset} of ${this._browseTotal.toLocaleString()}</span>
      </div>
      <div class="restaurant-cards">${cards}</div>
      ${this._browseHasMore ? `<button class="load-more-btn japandi-btn">Load more</button>` : ""}
    `;

    listEl.querySelectorAll(".restaurant-card").forEach(card => {
      card.addEventListener("click", () =>
        this._selectRestaurant(card.dataset.restaurantId, this.restaurants)
      );
      card
        .querySelector(".restaurant-explain-btn")
        ?.addEventListener("click", e => {
          e.stopPropagation();
          this._streamExplanation(card.dataset.restaurantId, card);
        });
    });

    listEl.querySelector(".load-more-btn")?.addEventListener("click", () => {
      this._browseAll(true);
    });
  }

  async _refineSearch(nlText) {
    const listEl = this.container.querySelector("#restaurant-list");
    listEl.innerHTML = `<div class="restaurant-loading"><div class="loading-spinner"></div><p>Refining…</p></div>`;

    const slots = parseNLSlots(nlText);

    // If NL mentions a neighborhood, activate that pill
    if (slots.neighborhood && slots.neighborhood !== this.activeNeighborhood) {
      this.activeNeighborhood = slots.neighborhood;
      this._highlightActivePill();
    }

    try {
      const res = await fetch("/api/restaurants/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vibeProfile: this.query,
          nlQuery: nlText,
          neighborhood: this.activeNeighborhood,
          cuisine: slots.cuisine
        })
      });

      if (!res.ok) {
        // Fall back to client-side filter on error
        this._applyFiltersAndRender();
        return;
      }

      const data = await res.json();
      this.restaurants = data.restaurants;
      this._renderList(listEl);
      this._renderPins();
    } catch {
      this._applyFiltersAndRender();
    }
  }

  // ─── Filters ─────────────────────────────────────────────

  _applyFiltersAndRender() {
    let filtered = this.restaurants;

    if (this.activeNeighborhood) {
      const n = NEIGHBORHOODS.find(x => x.name === this.activeNeighborhood);
      if (n) {
        filtered = filtered.filter(r => {
          const km = haversineKm(r.lat, r.lng, n.center[0], n.center[1]);
          return km * 1000 <= n.radius;
        });
      }
    }

    this._renderList(
      this.container.querySelector("#restaurant-list"),
      filtered
    );
    this._renderPins(filtered);
  }

  // ─── Render ───────────────────────────────────────────────

  _renderList(listEl, items) {
    const restaurants = items ?? this.restaurants;

    if (!restaurants.length) {
      listEl.innerHTML = `<div class="restaurant-empty"><p>No restaurants found for this combination. Try a different neighbourhood or search.</p></div>`;
      return;
    }

    listEl.innerHTML = `
      <div class="restaurant-list-header">
        <span class="restaurant-count">${restaurants.length} spots found</span>
      </div>
      <div class="restaurant-cards">
        ${restaurants.map((r, i) => this._buildCard(r, i)).join("")}
      </div>
    `;

    listEl.querySelectorAll(".restaurant-card").forEach(card => {
      card.addEventListener("click", () =>
        this._selectRestaurant(card.dataset.restaurantId, restaurants)
      );
      card
        .querySelector(".restaurant-explain-btn")
        ?.addEventListener("click", e => {
          e.stopPropagation();
          this._streamExplanation(card.dataset.restaurantId, card);
        });
    });
  }

  _buildCard(r, index) {
    const hasScore = r.score !== null && r.score !== undefined;
    const matchLabel = !hasScore
      ? null
      : r.score >= SCORE_HIGH
        ? "Strong match"
        : r.score >= SCORE_MED
          ? "Good match"
          : "Match";
    const matchClass = !hasScore
      ? ""
      : r.score >= SCORE_HIGH
        ? "match-high"
        : r.score >= SCORE_MED
          ? "match-med"
          : "match-low";
    const cuisineDisplay = r.cuisine
      ? r.cuisine.replace(/;/g, " · ")
      : "Restaurant";
    const location = r.neighborhood || r.address || "Amsterdam";
    const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(`${r.name} ${location} Amsterdam`)}`;

    return `
      <div class="restaurant-card" data-restaurant-id="${r.id}">
        <div class="restaurant-card-rank">${index + 1}</div>
        <div class="restaurant-card-body">
          <div class="restaurant-card-top">
            <div class="restaurant-card-info">
              <h3 class="restaurant-card-name">${this._escapeHtml(r.name)}</h3>
              <p class="restaurant-card-meta">${this._escapeHtml(cuisineDisplay)} · ${this._escapeHtml(location)}</p>
            </div>
            ${matchLabel ? `<div class="restaurant-card-score ${matchClass}"><span class="score-label">${matchLabel}</span></div>` : ""}
          </div>
          <div class="restaurant-explain-container" id="explain-${r.id}"></div>
          <div class="restaurant-card-actions">
            <button class="restaurant-explain-btn japandi-btn japandi-btn-secondary">
              Why this place?
            </button>
            <a class="restaurant-maps-link" href="${mapsUrl}" target="_blank" rel="noopener noreferrer">
              📍 Google Maps
            </a>
          </div>
        </div>
      </div>
    `;
  }

  _renderPins(items) {
    if (!this.map) {
      return;
    }
    this.markers.forEach(m => m.remove());
    this.markers.clear();

    const restaurants = items ?? this.restaurants;
    restaurants.forEach(r => {
      const marker = L.marker([r.lat, r.lng], { icon: this._pinIcon(r.score) });
      marker.bindPopup(
        `<strong>${this._escapeHtml(r.name)}</strong><br/><small>${this._escapeHtml(r.cuisine || "Restaurant")}</small>`
      );
      marker.on("click", () => this._selectRestaurant(r.id, restaurants));
      marker.addTo(this.map);
      this.markers.set(r.id, marker);
    });

    if (restaurants.length > 0) {
      this.map.fitBounds(L.latLngBounds(restaurants.map(r => [r.lat, r.lng])), {
        padding: [30, 30],
        maxZoom: 15
      });
    }
  }

  // ─── Interactions ─────────────────────────────────────────

  _bindBackButton() {
    this.container
      .querySelector(".restaurant-back-btn")
      ?.addEventListener("click", () => window.nav?.go("main"));
  }

  _bindRefinement() {
    // Vibe matched / Browse all toggle
    this.container
      .querySelector(".restaurant-view-toggle")
      ?.addEventListener("click", e => {
        const btn = e.target.closest(".view-toggle-btn");
        if (!btn) {
          return;
        }
        const isBrowse = btn.dataset.view === "browse";
        if (isBrowse === this._browseMode) {
          return;
        }
        this._browseMode = isBrowse;
        this.container
          .querySelectorAll(".view-toggle-btn")
          .forEach(b =>
            b.classList.toggle(
              "is-active",
              b.dataset.view === (isBrowse ? "browse" : "matched")
            )
          );
        const listEl = this.container.querySelector("#restaurant-list");
        listEl.innerHTML = `<div class="restaurant-loading"><div class="loading-spinner"></div><p>${isBrowse ? "Loading all restaurants…" : "Finding your spot…"}</p></div>`;
        if (isBrowse) {
          this._browseAll(false);
        } else {
          this._lastQueryKey = null; // force re-search
          this._search();
        }
      });

    // Neighborhood pills
    this.container
      .querySelector("#refine-pills")
      ?.addEventListener("click", e => {
        const pill = e.target.closest(".refine-pill");
        if (!pill) {
          return;
        }
        const neighborhood = pill.dataset.neighborhood || null;
        this.activeNeighborhood = neighborhood || null;
        this._highlightActivePill();

        // If there's an NL query active, re-run refinement; otherwise just filter
        if (this.activeNL) {
          this._refineSearch(this.activeNL);
        } else {
          this._applyFiltersAndRender();
        }
      });

    // NL input with debounce
    const nlInput = this.container.querySelector("#refine-nl-input");
    nlInput?.addEventListener("input", e => {
      this.activeNL = e.target.value;
      clearTimeout(this._nlDebounceTimer);
      if (!this.activeNL.trim()) {
        this._applyFiltersAndRender();
        return;
      }
      this._nlDebounceTimer = setTimeout(() => {
        this._refineSearch(this.activeNL.trim());
      }, 600);
    });

    // Clear NL button
    this.container
      .querySelector("#refine-nl-clear")
      ?.addEventListener("click", () => {
        this.activeNL = "";
        const input = this.container.querySelector("#refine-nl-input");
        if (input) {
          input.value = "";
        }
        this.container.querySelector("#refine-nl-clear")?.remove();
        this._applyFiltersAndRender();
      });
  }

  _highlightActivePill() {
    this.container.querySelectorAll(".refine-pill").forEach(p => {
      const isActive =
        p.dataset.neighborhood === (this.activeNeighborhood || "");
      p.classList.toggle("is-active", isActive);
    });
  }

  _selectRestaurant(id, restaurants) {
    const r = (restaurants || this.restaurants).find(x => x.id === id);
    if (!r) {
      return;
    }

    if (this.map) {
      const marker = this.markers.get(id);
      if (marker) {
        this.map.setView([r.lat, r.lng], 16, { animate: true });
        marker.openPopup();
      }
    }

    const card = this.container.querySelector(`[data-restaurant-id="${id}"]`);
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "nearest" });
      card.classList.add("is-selected");
      setTimeout(() => card.classList.remove("is-selected"), 1500);
    }
  }

  // ─── Streaming explanation ────────────────────────────────

  async _streamExplanation(id, card) {
    if (this.explainAbortController) {
      this.explainAbortController.abort();
    }
    this.explainAbortController = new AbortController();

    const explainEl = card.querySelector(`#explain-${id}`);
    const btn = card.querySelector(".restaurant-explain-btn");
    btn.disabled = true;
    btn.textContent = "Thinking…";
    explainEl.innerHTML = `<div class="explain-text"></div>`;
    const textEl = explainEl.querySelector(".explain-text");

    const vibesParam = encodeURIComponent(JSON.stringify(this.query));
    try {
      const res = await fetch(
        `/api/restaurants/explain/${encodeURIComponent(id)}?vibes=${vibesParam}`,
        { signal: this.explainAbortController.signal }
      );
      if (!res.ok) {
        throw new Error("Explanation failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) {
            continue;
          }
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") {
            break;
          }
          try {
            const { token, error } = JSON.parse(payload);
            if (error) {
              throw new Error(error);
            }
            if (token) {
              textEl.textContent += token;
            }
          } catch {
            /* skip */
          }
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        textEl.textContent = "Could not generate explanation.";
      }
    } finally {
      btn.disabled = false;
      btn.textContent = "Why this place?";
    }
  }

  // ─── Helpers ──────────────────────────────────────────────

  _showError(listEl, message) {
    listEl.innerHTML = `
      <div class="restaurant-empty">
        <p>⚠️ ${this._escapeHtml(message)}</p>
        <p><small>Make sure Ollama is running with nomic-embed-text pulled.</small></p>
      </div>
    `;
  }

  _escapeHtml(str) {
    if (!str) {
      return "";
    }
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  destroy() {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    if (this.explainAbortController) {
      this.explainAbortController.abort();
    }
    clearTimeout(this._nlDebounceTimer);
    this.markers.clear();
    this.container.innerHTML = "";
  }
}
