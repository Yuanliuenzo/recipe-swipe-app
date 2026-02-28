// Favorites Service
// Clean, modern, maintainable implementation

import { RecipeDisplayComponent } from "../components/RecipeDisplayComponent.js";

export class FavoritesService {
  constructor(
    stateManager,
    apiService,
    navigationService = null,
    recipeFormatter = null
  ) {
    this.stateManager = stateManager;
    this.api = apiService;
    this.navigationService = navigationService;
    this.recipeFormatter = recipeFormatter;
    this.initialized = false;
  }

  /* =====================================================
     INITIALIZATION
  ===================================================== */

  async initialize() {
    if (this.initialized) {
      return;
    }
    await this.loadFavorites();
    this.initialized = true;
  }

  async loadFavorites() {
    try {
      const res = await fetch("/api/favorites", { credentials: "include" });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();

      const favorites = data.favorites || [];
      this.stateManager.setState({ favorites });

      return favorites;
    } catch (err) {
      console.error("❌ Failed to load favorites:", err);
      this.stateManager.setState({ favorites: [] });
      return [];
    }
  }

  async saveFavorites(favorites) {
    await this.api.updateFavorites(favorites);
    this.stateManager.setState({ favorites });
    return favorites;
  }

  getFavorites() {
    return this.stateManager.get("favorites") || [];
  }

  isFavorite(id) {
    return this.getFavorites().some(f => f.id === id);
  }

  /* =====================================================
     CRUD
  ===================================================== */

  async addFavorite(recipe) {
    const favorites = this.getFavorites();

    if (favorites.some(f => f.id === recipe.id)) {
      this.showAlert("Already in favorites");
      return favorites;
    }

    const newFav = {
      ...recipe,
      id: recipe.id || crypto.randomUUID(),
      addedAt: new Date().toISOString(),
      rating: recipe.rating || 0,
      note: recipe.note || ""
    };

    const updated = [...favorites, newFav];
    await this.saveFavorites(updated);

    this.showAlert("Added to favorites");
    return updated;
  }

  async removeFavorite(id) {
    await fetch(`/api/favorites/${id}`, {
      method: "DELETE",
      credentials: "include"
    });

    const updated = this.getFavorites().filter(f => f.id !== id);
    this.stateManager.setState({ favorites: updated });

    return updated;
  }

  async updateFavorite(id, updates) {
    await fetch(`/api/favorites/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(updates)
    });

    const updated = this.getFavorites().map(f =>
      f.id === id ? { ...f, ...updates } : f
    );

    this.stateManager.setState({ favorites: updated });
    return updated;
  }

  /* =====================================================
     FULL SCREEN FAVORITES LIST
  ===================================================== */

  async showFavorites() {
    console.log("🔧 showFavorites() called");

    const favorites = await this.loadFavorites();

    // Create favorites content
    const screen = document.createElement("div");
    screen.className = "mobile-favorites-screen";

    screen.innerHTML = `
      <div class="mobile-favorites-header">
        <button class="mobile-favorites-close" onclick="nav.go('main')">←</button>
        <h2>My Favorites</h2>
      </div>
      <div class="mobile-favorites-list"></div>
    `;

    // Add close handler
    screen
      .querySelector(".mobile-favorites-close")
      .addEventListener("click", () => {
        if (this.navigationService) {
          this.navigationService.go("main");
        }
      });

    const list = screen.querySelector(".mobile-favorites-list");

    if (!favorites.length) {
      list.innerHTML =
        '<div class="mobile-empty-favorites">No favorites yet.</div>';
    } else {
      favorites.forEach(fav => {
        const card = document.createElement("div");
        card.className = "mobile-favorite-card";
        card.innerHTML = `
          <div class="mobile-favorite-header">
            <h3 class="mobile-favorite-title">${fav.title}</h3>
          </div>
        `;
        card.addEventListener("click", () => this.openFavoriteModal(fav));
        list.appendChild(card);
      });
    }

    // Render into the favorites view
    if (this.navigationService) {
      this.navigationService.renderFavorites(screen);
    }
    console.log("✅ Favorites screen rendered");
  }

  closeFavorites() {
    document.querySelector(".mobile-favorites-screen")?.remove();
    document.body.classList.remove("app--overlay-open");
  }

  /* =====================================================
     BOTTOM SHEET MODAL (STATE OF THE ART)
     ===================================================== */

  openFavoriteModal(favorite) {
    const modal = document.createElement("div");
    modal.className = "favorite-bottom-sheet";

    // Create custom footer for modal
    const customFooter = `
      <div class="favorite-footer-content">
        <button class="japandi-btn japandi-btn-subtle favorite-delete-btn">🗑️ Remove</button>
        
        <div class="favorite-rating">
          ${[1, 2, 3, 4, 5]
            .map(
              i => `
            <button class="star ${i <= (favorite.rating || 0) ? "active" : ""}" data-rating="${i}">
              ★
            </button>
          `
            )
            .join("")}
        </div>
      </div>
    `;

    // Generate modal HTML using RecipeDisplayComponent
    const { html, setupToggleLogic } = RecipeDisplayComponent.generateModalHTML(
      favorite,
      { customFooter }
    );

    modal.innerHTML = `
      <div class="favorite-sheet-overlay"></div>
      ${html}
    `;

    document.body.appendChild(modal);
    document.body.classList.add("app--overlay-open");

    // Setup toggle logic
    const container = modal.querySelector(".favorite-sheet-container");
    setupToggleLogic(container);

    // Close handlers
    const close = () => {
      modal.remove();
      document.body.classList.remove("app--overlay-open");
    };

    modal
      .querySelector(".favorite-sheet-close")
      .addEventListener("click", close);

    modal
      .querySelector(".favorite-sheet-overlay")
      .addEventListener("click", close);

    // Rating functionality
    modal.querySelectorAll(".star").forEach(btn => {
      btn.addEventListener("click", async () => {
        const rating = parseInt(btn.dataset.rating);
        await this.updateFavorite(favorite.id, { rating });

        modal.querySelectorAll(".star").forEach(star => {
          star.classList.toggle(
            "active",
            parseInt(star.dataset.rating) <= rating
          );
        });
      });
    });

    // Delete functionality
    modal
      .querySelector(".favorite-delete-btn")
      .addEventListener("click", async () => {
        await this.removeFavorite(favorite.id);
        close();
        this.showAlert("Removed from favorites");
        // Refresh the favorites list to show the updated items
        this.showFavorites();
      });
  }

  /* =====================================================
     ALERT
  ===================================================== */

  showAlert(message) {
    const modal = document.createElement("div");
    modal.className = "alert-modal";
    modal.innerHTML = `
      <div class="modal-content">
        <p>${message}</p>
      </div>
    `;
    document.body.appendChild(modal);

    setTimeout(() => modal.remove(), 2000);
  }
}
