import { CONFIG } from './Config.js';
import { globalEventBus } from './EventBus.js';

// Centralized API service with error handling and timeout management
export class ApiService {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    };
  }
  
  // Generic request method with timeout and error handling
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: { ...this.defaultHeaders, ...options.headers },
      ...options
    };
    
    try {
      // Emit request start event
      globalEventBus.emit('api:request:start', { endpoint, config });
      
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), CONFIG.API_TIMEOUT);
      });
      
      // Make request with timeout
      const response = await Promise.race([
        fetch(url, config),
        timeoutPromise
      ]);
      
      // Emit response event
      globalEventBus.emit('api:response', { endpoint, status: response.status });
      
      // Handle HTTP errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
      
    } catch (error) {
      // Emit error event
      globalEventBus.emit('api:error', { endpoint, error });
      throw error;
    }
  }
  
  // GET request
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }
  
  // POST request
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  // PATCH request
  async patch(endpoint, data) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }
  
  // DELETE request
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
  
  // Recipe-specific API methods
  async generateRecipe(prompt) {
    return this.post(CONFIG.ENDPOINTS.GENERATE_RECIPE, { prompt });
  }
  
  // User authentication
  async login(username, password) {
    return this.post(CONFIG.ENDPOINTS.LOGIN, { username, password });
  }
  
  async logout() {
    return this.post(CONFIG.ENDPOINTS.LOGOUT);
  }
  
  // User data
  async getUserData() {
    return this.get(CONFIG.ENDPOINTS.ME);
  }
  
  // Favorites management
  async getFavorites() {
    return this.get(CONFIG.ENDPOINTS.FAVORITES);
  }
  
  async saveFavorite(favorite) {
    return this.post(CONFIG.ENDPOINTS.FAVORITES, favorite);
  }
  
  async updateFavorite(id, updates) {
    return this.patch(`${CONFIG.ENDPOINTS.FAVORITES}/${id}`, updates);
  }
  
  async deleteFavorite(id) {
    return this.delete(`${CONFIG.ENDPOINTS.FAVORITES}/${id}`);
  }
  
  // Preferences management
  async getPreferences() {
    return this.get(CONFIG.ENDPOINTS.PREFERENCES);
  }
  
  async updatePreferences(preferences) {
    return this.patch(CONFIG.ENDPOINTS.PREFERENCES, preferences);
  }
}

// Global API service instance
export const apiService = new ApiService();
