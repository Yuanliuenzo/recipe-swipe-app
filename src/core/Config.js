// Centralized configuration and constants
export const CONFIG = {
  // App settings
  MAX_VIBE_ROUNDS: 2,
  API_TIMEOUT: 5000, // 5 seconds for regular API calls
  
  // Swipe thresholds
  SWIPE_THRESHOLD: 120,
  SWIPE_VELOCITY_THRESHOLD: 0.5,
  
  // Animation settings
  ANIMATION_DURATION: 300,
  ENTRANCE_DELAY: 50,
  
  // UI settings
  MAX_FAVORITES: 20,
  
  // API endpoints
  ENDPOINTS: {
    GENERATE_RECIPE: '/api/generateRecipe',
    FAVORITES: '/api/favorites',
    ME: '/api/me',
    PREFERENCES: '/api/preferences',
    LOGIN: '/login',
    LOGOUT: '/logout'
  },
  
  // Device detection
  MOBILE_REGEX: /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
};

// Vibe definitions - moved from shared.js
export const VIBES = [
  { 
    name: "Cozy Night In", 
    emoji: "🛋️",
    description: "Comfort food, warm blankets, Netflix marathon",
    prompt: "comforting, hearty, perfect for staying in on a cold night",
    color: "#8B7355",
    image: "/images/cozy_night.jpg"
  },
  { 
    name: "Healthy & Fresh", 
    emoji: "🥗",
    description: "Light, nutritious, energizing",
    prompt: "healthy, fresh, light but satisfying, packed with vegetables",
    color: "#7CB342",
    image: "/images/healthy_fresh.jpg"
  },
  { 
    name: "Spicy Adventure", 
    emoji: "🌶️",
    description: "Bold flavors, exotic ingredients, heat",
    prompt: "spicy, adventurous, bold flavors, exciting and intense",
    color: "#D32F2F",
    image: "/images/spicy_adventure.jpg"
  },
  { 
    name: "Quick & Easy", 
    emoji: "⚡",
    description: "Minimal effort, maximum flavor, under 30 mins",
    prompt: "quick, easy, minimal cleanup, perfect for busy weeknights",
    color: "#1976D2",
    image: "/images/quick_easy.jpg"
  },
  { 
    name: "Romantic Dinner", 
    emoji: "🕯️",
    description: "Elegant, impressive, date night worthy",
    prompt: "romantic, elegant, impressive but not too complicated",
    color: "#E91E63",
    image: "/images/romantic_dinner.jpg"
  },
  { 
    name: "Hangover Cure", 
    emoji: "🤕",
    description: "Soothing, greasy, restorative",
    prompt: "comforting, greasy, perfect for curing a hangover",
    color: "#FF6F00",
    image: "/images/hangover_cure.jpg"
  },
  { 
    name: "Summer Vibes", 
    emoji: "☀️",
    description: "Grilling, fresh, light, outdoor friendly",
    prompt: "fresh, summery, perfect for grilling or outdoor dining",
    color: "#FFB300",
    image: "/images/summer_vibes.jpg"
  },
  { 
    name: "Comfort Food Classic", 
    emoji: "🍲",
    description: "Nostalgic, hearty, like mom used to make",
    prompt: "classic comfort food, nostalgic, hearty and satisfying",
    color: "#6D4C41",
    image: "/images/comfort_food.jpg"
  }
];

// Default preferences
export const DEFAULT_PREFERENCES = {
  diet: 'None',
  budget: 'No',
  seasonalKing: 'No'
};
