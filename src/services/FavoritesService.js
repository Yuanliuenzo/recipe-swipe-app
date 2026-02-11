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
      // Try to fetch from the favorites API endpoint
      const response = await fetch('/api/favorites');
      const { favorites } = await response.json();
      
      this.stateManager.setState({ favorites });
      console.log('❤️ Favorites loaded from API:', favorites.length);
      return favorites;
    } catch (error) {
      console.error('❌ Failed to load favorites from API, falling back to user data:', error);
      
      // Fallback to user data API
      try {
        const data = await this.api.getUserData();
        const fallbackFavorites = data.favorites || [];
        this.stateManager.setState({ favorites: fallbackFavorites });
        console.log('❤️ Favorites loaded from fallback:', fallbackFavorites.length);
        return fallbackFavorites;
      } catch (fallbackError) {
        console.error('❌ Failed to load favorites from fallback:', fallbackError);
        this.stateManager.setState({ favorites: [] });
        return [];
      }
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
      // Try API first
      const response = await fetch(`/api/favorites/${recipeId}`, { method: 'DELETE' });
      
      // Update local state
      const favorites = this.getFavorites();
      const updated = favorites.filter(f => f.id !== recipeId);
      this.stateManager.setState({ favorites });
      
      this.showAlert('Recipe removed from favorites!');
      return updated;
    } catch (error) {
      console.error('❌ Failed to remove favorite:', error);
      throw error;
    }
  }
  
  async updateFavorite(recipeId, updates) {
    try {
      // Try API first
      const response = await fetch(`/api/favorites/${recipeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      // Update local state
      const favorites = this.getFavorites();
      const updated = favorites.map(f => 
        f.id === recipeId ? { ...f, ...updates } : f
      );
      this.stateManager.setState({ favorites });
      
      console.log('💾 Favorite updated:', recipeId, updates);
      return updated;
    } catch (error) {
      console.error('❌ Failed to update favorite:', error);
      throw error;
    }
  }
  
  isFavorite(recipeId) {
    const favorites = this.getFavorites();
    return favorites.some(f => f.id === recipeId);
  }
  
  // Show favorites full screen
  async showFavorites() {
    try {
      // Load fresh favorites from API
      const favorites = await this.loadFavorites();
      
      // Hide main container and show favorites
      const mobileContainer = document.querySelector('.mobile-container');
      const mobileResult = document.querySelector('.mobile-result');
      
      if (mobileContainer) {
        mobileContainer.style.display = 'none';
      }
      
      // Create favorites full screen
      const favoritesScreen = document.createElement('div');
      favoritesScreen.className = 'mobile-preferences-fullscreen';
      favoritesScreen.innerHTML = `
        <button class="mobile-floating-back-btn" onclick="window.recipeApp.services.favorites.closeFavorites()">
          <span class="floating-back-icon">←</span>
          <span class="floating-back-text">Back</span>
        </button>
        <div class="mobile-preferences-header">
          <h2>⭐ My Favorites</h2>
        </div>
        <div class="mobile-preferences-content">
          <div class="mobile-favorites-list"></div>
        </div>
      `;
      
      document.body.appendChild(favoritesScreen);
      
      const gridContainer = favoritesScreen.querySelector('.mobile-favorites-list');
      
      if (!favorites || favorites.length === 0) {
        gridContainer.innerHTML = '<div class="mobile-empty-favorites">No favorites yet. Start swiping to add some!</div>';
        return;
      }
      
      // Import RecipeFormatter if needed
      const { RecipeFormatter } = window.recipeApp;
      
      favorites.forEach(fav => {
        const formattedRecipe = RecipeFormatter.format(fav.recipeText || fav.description || 'Delicious recipe', true);
        const hasIngredients = typeof formattedRecipe === 'string' ? false : formattedRecipe.hasIngredients;
        const hasInstructions = typeof formattedRecipe === 'string' ? false : formattedRecipe.hasInstructions;
        const showToggle = hasIngredients && hasInstructions;
        const recipeHtml = typeof formattedRecipe === 'string' ? formattedRecipe : formattedRecipe.html;
        
        const card = document.createElement('div');
        card.className = 'mobile-favorite-card';
        card.innerHTML = `
          <div class="mobile-favorite-header">
            <h3 class="mobile-favorite-title">${fav.title || 'Recipe ' + fav.id}</h3>
            <button class="mobile-delete-favorite-btn" data-id="${fav.id}">🗑️</button>
          </div>
          <div class="mobile-favorite-preview">
            ${fav.note ? `<div class="mobile-favorite-note-preview">${fav.note}</div>` : ''}
          </div>
          <div class="mobile-favorite-details" style="display: none;">
            ${showToggle ? `
              <div class="mobile-recipe-toggle" role="tablist" aria-label="Recipe sections">
                <button type="button" class="mobile-recipe-toggle-btn active" data-target="ingredients">Ingredients</button>
                <button type="button" class="mobile-recipe-toggle-btn" data-target="instructions">Instructions</button>
              </div>
            ` : ''}
            <div class="mobile-recipe-content">${recipeHtml}</div>
            <div class="mobile-favorite-footer">
              <div class="mobile-favorite-rating">
                ${Array.from({length:5}, (_, i) => `<button class="mobile-star-btn ${i < (fav.rating ?? -1) ? 'active' : ''}" data-id="${fav.id}" data-rating="${i+1}">${i < (fav.rating ?? -1) ? '⭐' : '☆'}</button>`).join('')}
              </div>
              <textarea class="mobile-favorite-note" placeholder="Add a note..." data-id="${fav.id}">${fav.note ?? ''}</textarea>
              <button class="mobile-save-note-btn" data-id="${fav.id}">💾 Save Note</button>
            </div>
          </div>
        `;
        
        // Add click to open modal (instead of expand)
        card.addEventListener('click', (e) => {
          if (e.target.closest('.mobile-delete-favorite-btn') || 
              e.target.closest('.mobile-star-btn') || 
              e.target.closest('.mobile-save-note-btn') ||
              e.target.closest('.mobile-favorite-note') ||
              e.target.closest('.mobile-recipe-toggle-btn')) {
            return; // Don't open modal if clicking on interactive elements
          }
          
          this.openFavoriteModal(fav);
        });
        
        gridContainer.appendChild(card);
      });
      
      // Add event handlers
      favoritesScreen.querySelectorAll('.mobile-delete-favorite-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          if (!confirm('Delete this favorite?')) return;
          await this.removeFavorite(id);
          this.closeFavorites();
          await this.showFavorites(); // refresh
        });
      });
      
      favoritesScreen.querySelectorAll('.mobile-star-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const rating = parseInt(btn.dataset.rating);
          await this.updateFavorite(id, { rating });
          this.closeFavorites();
          await this.showFavorites(); // refresh
        });
      });
      
      favoritesScreen.querySelectorAll('.mobile-save-note-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const noteEl = favoritesScreen.querySelector(`.mobile-favorite-note[data-id="${id}"]`);
          const note = noteEl.value.trim();
          await this.updateFavorite(id, { note });
          btn.textContent = '✅ Saved';
          setTimeout(() => btn.textContent = '💾 Save Note', 1500);
        });
      });
      
    } catch (error) {
      console.error('❌ Failed to show favorites:', error);
      this.showAlert('Failed to load favorites');
    }
  }
  
  // Open favorite as modal (looks like generated recipe)
  openFavoriteModal(favorite) {
    try {
      // Import RecipeFormatter
      const { RecipeFormatter } = window.recipeApp;
      
      // Format the recipe
      const formattedRecipe = RecipeFormatter.format(favorite.recipeText || favorite.description || 'Delicious recipe', false);
      const hasIngredients = typeof formattedRecipe === 'string' ? false : formattedRecipe.hasIngredients;
      const hasInstructions = typeof formattedRecipe === 'string' ? false : formattedRecipe.hasInstructions;
      const showToggle = hasIngredients && hasInstructions;
      const recipeHtml = typeof formattedRecipe === 'string' ? formattedRecipe : formattedRecipe.html;
      
      // Create modal overlay
      const modalOverlay = document.createElement('div');
      modalOverlay.className = 'favorite-modal-overlay';
      modalOverlay.innerHTML = `
        <div class="mobile-result show">
          <div class="mobile-result-content">
            <div class="mobile-recipe-card favorite-modal-card">
              <button class="favorite-modal-close" onclick="window.recipeApp.services.favorites.closeFavoriteModal()">×</button>
              <h2>${favorite.title || 'Favorite Recipe'}</h2>
              ${favorite.note ? `<div class="favorite-note-display">${favorite.note}</div>` : ''}
              ${showToggle ? `
                <div class="mobile-recipe-toggle" role="tablist" aria-label="Recipe sections">
                  <button type="button" class="mobile-recipe-toggle-btn active" data-target="ingredients">Ingredients</button>
                  <button type="button" class="mobile-recipe-toggle-btn" data-target="instructions">Instructions</button>
                </div>
              ` : ''}
              <div class="mobile-recipe-content">${recipeHtml}</div>
              <div class="mobile-recipe-actions">
                <div class="mobile-favorite-rating">
                  ${Array.from({length:5}, (_, i) => `<button class="mobile-star-btn ${i < (favorite.rating ?? -1) ? 'active' : ''}" data-id="${favorite.id}" data-rating="${i+1}">${i < (favorite.rating ?? -1) ? '⭐' : '☆'}</button>`).join('')}
                </div>
                <textarea class="mobile-favorite-note" placeholder="Add a note..." data-id="${favorite.id}">${favorite.note ?? ''}</textarea>
                <div class="japandi-btn-group">
                  <button class="japandi-btn" onclick="window.recipeApp.services.favorites.updateFavoriteNote('${favorite.id}')">💾 Save Note</button>
                  <button class="japandi-btn" onclick="window.recipeApp.services.favorites.removeFavorite('${favorite.id}')">🗑️ Remove</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(modalOverlay);
      
      // Set up toggle functionality
      if (showToggle) {
        const toggleBtns = modalOverlay.querySelectorAll('.mobile-recipe-toggle-btn');
        const contentEl = modalOverlay.querySelector('.mobile-recipe-content');
        
        const setActive = (target) => {
          contentEl.querySelectorAll('[data-recipe-section]').forEach((el) => {
            el.classList.remove('is-active');
          });
          
          const targetSection = contentEl.querySelector(`[data-recipe-section="${target}"]`);
          if (targetSection) {
            targetSection.classList.add('is-active');
            contentEl.scrollTo({
              top: 0,
              behavior: 'smooth'
            });
          }
          
          toggleBtns.forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.target === target);
          });
        };
        
        toggleBtns.forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            setActive(btn.dataset.target);
          });
        });
        
        setTimeout(() => setActive('ingredients'), 100);
      }
      
      // Add star rating functionality
      modalOverlay.querySelectorAll('.mobile-star-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const rating = parseInt(btn.dataset.rating);
          await this.updateFavorite(id, { rating });
          this.closeFavoriteModal();
          this.openFavoriteModal(favorite); // refresh modal
        });
      });
      
    } catch (error) {
      console.error('❌ Failed to open favorite modal:', error);
      this.showAlert('Failed to open recipe');
    }
  }
  
  // Close favorite modal
  closeFavoriteModal() {
    const modalOverlay = document.querySelector('.favorite-modal-overlay');
    if (modalOverlay) {
      modalOverlay.remove();
    }
  }
  
  // Update favorite note from modal
  async updateFavoriteNote(id) {
    try {
      const modalOverlay = document.querySelector('.favorite-modal-overlay');
      const noteEl = modalOverlay.querySelector(`.mobile-favorite-note[data-id="${id}"]`);
      const note = noteEl.value.trim();
      await this.updateFavorite(id, { note });
      
      const saveBtn = modalOverlay.querySelector(`button[onclick*="updateFavoriteNote"]`);
      saveBtn.textContent = '✅ Saved';
      setTimeout(() => saveBtn.textContent = '💾 Save Note', 1500);
    } catch (error) {
      console.error('❌ Failed to update note:', error);
      this.showAlert('Failed to save note');
    }
  }
  
  // Close favorites screen
  closeFavorites() {
    const favoritesScreen = document.querySelector('.mobile-preferences-fullscreen');
    const mobileContainer = document.querySelector('.mobile-container');
    
    if (favoritesScreen) {
      favoritesScreen.remove();
    }
    
    if (mobileContainer) {
      mobileContainer.style.display = '';
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
