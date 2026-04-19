/**
 * RestaurantService — frontend service for vibe-matched restaurant discovery.
 *
 * Reads restaurantQuery (from questionnaire) or vibeProfile (from swipe game)
 * out of global state and passes it to RestaurantAdvisorView.
 */

import { RestaurantAdvisorView } from "../components/views/RestaurantAdvisorView.js";
import { globalStateManager } from "../core/StateManager.js";

export class RestaurantService {
  constructor(navigationService) {
    this.navigationService = navigationService;
    this.view = null;
    this.container = document.getElementById("view-restaurants");
  }

  async showRestaurants() {
    if (!this.container) {
      return;
    }

    const restaurantQuery = globalStateManager.get("restaurantQuery");
    const vibeProfile = globalStateManager.get("vibeProfile") || [];
    const query = restaurantQuery || vibeProfile;
    const neighborhood =
      globalStateManager.get("restaurantNeighborhood") ?? null;

    if (!this.view) {
      this.view = new RestaurantAdvisorView(this.container, {
        query,
        neighborhood
      });
    } else {
      this.view.updateQuery(query);
      this.view.activeNeighborhood = neighborhood;
    }

    await this.view.render();
  }
}
