// Favorites Service
// Manages user favorites with state management and API integration

export class FavoritesService {
  constructor(stateManager, apiService) {
    this.stateManager = stateManager;
    this.api = apiService;
  }
  
  async initialize() {
    try {
      console.log('🔧 Initializing Favorites Service...');
      
      // Load favorites from state or API
      const state = this.stateManager.getState();
      if (!state.favorites) {
        await this.loadFavorites();
      }
      
      console.log('✅ Favorites Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Favorites Service:', error);
      throw error;
    }
  }
  
  async loadFavorites() {
    try {
      const data = await this.api.getUserData();
      const favorites = data.favorites || [];
      
      this.stateManager.setState({ favorites });
      console.log('❤️ Favorites loaded:', favorites.length);
      return favorites;
    } catch (error) {
      console.error('❌ Failed to load favorites:', error);
      throw error;
    }
  }
  
  async saveFavorites(favorites) {
    try {
      await this.api.updateFavorites(favorites);
      this.stateManager.setState({ favorites });
      console.log('💾 Favorites saved:', favorites.length);
      return favorites;
    } catch (error) {
      console.error('❌ Failed to save favorites:', error);
      throw error;
    }
  }
  
  getFavorites() {
    return this.stateManager.get('favorites') || [];
  }
  
  async addFavorite(recipe) {
    try {
      const favorites = this.getFavorites();
      
      // Check if already exists
      const exists = favorites.some(f => 
        f.id === recipe.id || f.title === recipe.title
      );
      
      if (exists) {
        this.showAlert('Recipe already in favorites!');
        return favorites;
      }
      
      // Add unique ID if not present
      const favoriteWithId = {
        ...recipe,
        id: recipe.id || Date.now().toString(),
        addedAt: new Date().toISOString()
      };
      
      const updated = [...favorites, favoriteWithId];
      await this.saveFavorites(updated);
      
      this.showAlert('Recipe added to favorites!');
      return updated;
    } catch (error) {
      console.error('❌ Failed to add favorite:', error);
      throw error;
    }
  }
  
  async removeFavorite(recipeId) {
    try {
      const favorites = this.getFavorites();
      const updated = favorites.filter(f => f.id !== recipeId);
      
      await this.saveFavorites(updated);
      this.showAlert('Recipe removed from favorites!');
      return updated;
    } catch (error) {
      console.error('❌ Failed to remove favorite:', error);
      throw error;
    }
  }
  
  isFavorite(recipeId) {
    const favorites = this.getFavorites();
    return favorites.some(f => f.id === recipeId);
  }
  
  // Show favorites modal
  showFavorites() {
    try {
      const favorites = this.getFavorites();
      
      const modal = document.createElement('div');
      modal.className = 'favorites-modal';
      modal.innerHTML = `
        <div class="modal-content">
          <h2>My Favorites</h2>
          <div class="favorites-list">
            ${favorites.length === 0 ? 
              '<p>No favorites yet. Start swiping to add some!</p>' :
              favorites.map((recipe, index) => `
                <div class="favorite-item">
                  <h3>${recipe.title || 'Recipe ' + (index + 1)}</h3>
                  <p>${recipe.description || 'Delicious recipe'}</p>
                  <div class="favorite-actions">
                    <button onclick="window.recipeApp.services.favorites.viewRecipe('${recipe.id || index}')">View</button>
                    <button onclick="window.recipeApp.services.favorites.removeFavorite('${recipe.id || index}')">Remove</button>
                  </div>
                </div>
              `).join('')
            }
          </div>
          <div class="modal-actions">
            <button onclick="this.closest('.favorites-modal').remove()">Close</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
    } catch (error) {
      console.error('❌ Failed to show favorites:', error);
      throw error;
    }
  }
  
  viewRecipe(recipeId) {
    try {
      const favorites = this.getFavorites();
      const recipe = favorites.find(f => f.id === recipeId);
      
      if (recipe) {
        // Close modal
        document.querySelector('.favorites-modal')?.remove();
        
        // Show recipe details
        this.showRecipeDetails(recipe);
      }
    } catch (error) {
      console.error('❌ Failed to view recipe:', error);
      this.showAlert('Failed to view recipe');
    }
  }
  
  showRecipeDetails(recipe) {
    try {
      const modal = document.createElement('div');
      modal.className = 'recipe-details-modal';
      modal.innerHTML = `
        <div class="modal-content">
          <h2>${recipe.title || 'Recipe Details'}</h2>
          <div class="recipe-details">
            ${recipe.description ? `<p>${recipe.description}</p>` : ''}
            ${recipe.ingredients ? `<h4>Ingredients:</h4><p>${recipe.ingredients}</p>` : ''}
            ${recipe.instructions ? `<h4>Instructions:</h4><p>${recipe.instructions}</p>` : ''}
          </div>
          <div class="modal-actions">
            <button onclick="this.closest('.recipe-details-modal').remove()">Close</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
    } catch (error) {
      console.error('❌ Failed to show recipe details:', error);
      throw error;
    }
  }
  
  // Show alert message
  showAlert(message) {
    try {
      const modal = document.createElement('div');
      modal.className = 'alert-modal';
      modal.innerHTML = `
        <div class="modal-content">
          <p>${message}</p>
          <button onclick="this.closest('.alert-modal').remove()">OK</button>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Auto-remove after 3 seconds
      setTimeout(() => {
        modal.remove();
      }, 3000);
      
    } catch (error) {
      console.error('❌ Failed to show alert:', error);
      alert(message); // Fallback
    }
  }
}
