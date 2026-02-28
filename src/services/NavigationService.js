/* =====================================================
   NAVIGATION SERVICE - STATE-OF-THE-ART MOBILE UX
   Handles smooth, flicker-free navigation between views
   ====================================================== */

export class NavigationService {
  constructor(favoritesService = null, userPreferencesService = null) {
    this.views = {
      main: document.getElementById("view-main"),
      favorites: document.getElementById("view-favorites"),
      preferences: document.getElementById("view-preferences")
    };

    this.current = "main";
    this.isTransitioning = false;

    // Injected services
    this.favoritesService = favoritesService;
    this.userPreferencesService = userPreferencesService;

    // Initialize
    console.log("🧭 Navigation Service initialized");
  }

  async go(view) {
    if (view === this.current || this.isTransitioning) {
      return;
    }

    console.log(`🧭 Navigating: ${this.current} → ${view}`);

    this.isTransitioning = true;

    const from = this.views[this.current];
    const to = this.views[view];

    // Call the appropriate service to render content
    if (view === "favorites" && this.favoritesService) {
      await this.favoritesService.showFavorites();
    } else if (view === "preferences" && this.userPreferencesService) {
      await this.userPreferencesService.showPreferences();
    }

    // Transition
    from.classList.remove("is-active");
    to.classList.add("is-active");

    this.current = view;

    // Small delay to prevent rapid transitions
    setTimeout(() => {
      this.isTransitioning = false;
    }, 300);

    console.log(`✅ Navigation complete: ${view}`);
  }

  getCurrentView() {
    return this.current;
  }

  // Render content into specific views
  renderFavorites(content) {
    const container = document.getElementById("view-favorites");
    container.innerHTML = "";
    container.appendChild(content);
  }

  renderPreferences(content) {
    const container = document.getElementById("view-preferences");
    container.innerHTML = "";
    container.appendChild(content);
  }
}
