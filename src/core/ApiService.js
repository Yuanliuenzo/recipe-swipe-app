import { CONFIG } from "./Config.js";
import { globalEventBus } from "./EventBus.js";

class ApiService {
  constructor(baseUrl = "") {
    this.baseUrl = baseUrl;
    this.defaultHeaders = { "Content-Type": "application/json" };
  }

  // Generic request with timeout & error handling
  async request(endpoint, options = {}, timeoutMs = CONFIG.API_TIMEOUT) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: { ...this.defaultHeaders, ...options.headers },
      ...options
    };

    try {
      globalEventBus.emit("api:request:start", { endpoint, config });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), timeoutMs)
      );

      const response = await Promise.race([fetch(url, config), timeoutPromise]);

      globalEventBus.emit("api:response", {
        endpoint,
        status: response.status
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      globalEventBus.emit("api:error", { endpoint, error });
      throw error;
    }
  }

  // HTTP helpers
  async get(endpoint, timeoutMs) {
    return this.request(endpoint, { method: "GET" }, timeoutMs);
  }
  async post(endpoint, data, timeoutMs) {
    return this.request(
      endpoint,
      { method: "POST", body: JSON.stringify(data) },
      timeoutMs
    );
  }
  async patch(endpoint, data, timeoutMs) {
    return this.request(
      endpoint,
      { method: "PATCH", body: JSON.stringify(data) },
      timeoutMs
    );
  }
  async delete(endpoint, timeoutMs) {
    return this.request(endpoint, { method: "DELETE" }, timeoutMs);
  }

  // Recipe-specific APIs
  async generateRecipe(prompt, timeoutMs = 90000) {
    return this.post(CONFIG.ENDPOINTS.GENERATE_RECIPE, { prompt }, timeoutMs);
  }

  async generateRecipeSuggestions(prompt, count = 5, timeoutMs = 120000) {
    return this.post(
      CONFIG.ENDPOINTS.GENERATE_RECIPE,
      { prompt, count, suggestions: true },
      timeoutMs
    );
  }

  /**
   * Stream a full recipe via SSE, calling onToken for each token received.
   * Returns the complete assembled text when done.
   *
   * @param {string} prompt
   * @param {(token: string, fullText: string) => void} [onToken]
   * @returns {Promise<string>} full recipe text
   */
  async streamRecipe(prompt, onToken) {
    const res = await fetch("/api/streamRecipe", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });

    if (!res.ok) {
      throw new Error(`Stream HTTP ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop(); // keep incomplete trailing line

      for (const line of lines) {
        if (!line.startsWith("data: ")) {
          continue;
        }
        const data = line.slice(6).trim();
        if (data === "[DONE]") {
          return fullText;
        }
        try {
          const { token, error } = JSON.parse(data);
          if (error) {
            throw new Error(error);
          }
          if (token) {
            fullText += token;
            onToken?.(token, fullText);
          }
        } catch (e) {
          if (e.message !== "Unexpected end of JSON input") {
            throw e;
          }
        }
      }
    }

    return fullText;
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

  // Favorites
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

  // Preferences
  async getPreferences() {
    return this.get(CONFIG.ENDPOINTS.PREFERENCES);
  }
  async updatePreferences(preferences) {
    return this.patch(CONFIG.ENDPOINTS.PREFERENCES, preferences);
  }
}

// Global API instance
export const apiService = new ApiService();
