// Centralized configuration and constants
export const CONFIG = {
  // App settings
  MAX_VIBE_ROUNDS: 5,
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
    GENERATE_RECIPE: "/api/generateRecipe",
    FAVORITES: "/api/favorites",
    ME: "/api/me",
    PREFERENCES: "/api/preferences",
    LOGIN: "/login",
    LOGOUT: "/logout"
  },

  // Device detection
  MOBILE_REGEX:
    /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
};

// Vibe definitions — pure emotional/mood vibes only.
// Factual constraints (time, meal type, serving size) live in the questionnaire.
export const VIBES = [
  {
    name: "Cozy & Wrapped Up",
    emoji: "🛋️",
    description: "Warm blankets, candles, a quiet night in",
    prompt: "comforting, warm, hearty, made for a quiet and cosy night in",
    color: "#8B7355",
    image: "/images/cozy_night.jpg"
  },
  {
    name: "Treat Yourself",
    emoji: "💅",
    description: "A little indulgent — you've earned it",
    prompt: "indulgent, a little decadent, rich, celebrating yourself",
    color: "#C2185B",
    image: "/images/romantic_dinner.jpg"
  },
  {
    name: "Nostalgic",
    emoji: "🏡",
    description: "Grandma's kitchen, childhood favourites, familiar warmth",
    prompt: "nostalgic, homey, classic, reminiscent of childhood comfort food",
    color: "#6D4C41",
    image: "/images/comfort_food.jpg"
  },
  {
    name: "Feeling Adventurous",
    emoji: "🌍",
    description: "Something unfamiliar, a new cuisine, excite your palate",
    prompt:
      "adventurous, exotic, inspired by a new cuisine, unexpected flavor combinations",
    color: "#2E7D32",
    image: "/images/spicy_adventure.jpg"
  },
  {
    name: "Bold & Intense",
    emoji: "🔥",
    description: "Spicy, punchy, unapologetically in-your-face",
    prompt: "bold, spicy, intense, punchy flavors, exciting and powerful",
    color: "#D32F2F",
    image: "/images/spicy_adventure.jpg"
  },
  {
    name: "Light & Clean",
    emoji: "🌿",
    description: "Fresh, nourishing — a reset for your body and mind",
    prompt: "light, clean, fresh, nourishing, minimal but satisfying",
    color: "#7CB342",
    image: "/images/healthy_fresh.jpg"
  },
  {
    name: "Impress Someone",
    emoji: "🎭",
    description: "Show off a little — make them say wow",
    prompt:
      "elegant, impressive, restaurant-quality presentation, something special",
    color: "#1565C0",
    image: "/images/romantic_dinner.jpg"
  },
  {
    name: "Sharing is Caring",
    emoji: "🤝",
    description: "Food that brings people together, made to be passed around",
    prompt:
      "communal, shareable, crowd-pleasing, generous and made for sharing",
    color: "#E65100",
    image: "/images/comfort_food.jpg"
  },
  {
    name: "Need a Reset",
    emoji: "🤕",
    description:
      "After a rough night — something gentle, greasy, or restorative",
    prompt: "restorative, soothing, gentle on the stomach, comfort in recovery",
    color: "#FF6F00",
    image: "/images/hangover_cure.jpg"
  },
  {
    name: "Something Sweet",
    emoji: "🍯",
    description: "Craving sweetness — lean into it",
    prompt:
      "sweet, dessert-leaning, indulgent and sugary, satisfying a sweet tooth",
    color: "#F9A825",
    image: "/images/cozy_night.jpg"
  },
  {
    name: "Crispy & Satisfying",
    emoji: "🥨",
    description: "Textures matter — golden, crunchy, deeply satisfying",
    prompt:
      "crispy, crunchy, golden, textured and deeply satisfying to bite into",
    color: "#795548",
    image: "/images/comfort_food.jpg"
  },
  {
    name: "Simple & Honest",
    emoji: "🪵",
    description: "Nothing fancy — just good ingredients, simply done",
    prompt: "simple, honest, minimal ingredients, unfussy and genuinely good",
    color: "#546E7A",
    image: "/images/healthy_fresh.jpg"
  }
];

// Meal type options for Q1 — always shown first
export const MEAL_TYPES = [
  { value: "breakfast", label: "Breakfast", emoji: "🌅" },
  { value: "brunch", label: "Brunch", emoji: "☕" },
  { value: "lunch", label: "Lunch", emoji: "🥙" },
  { value: "dinner", label: "Dinner", emoji: "🍽️" },
  { value: "snack", label: "Snack", emoji: "🍿" }
];

// Adaptive questionnaire flows — Q2 and Q3 depend on meal type.
// q3: { skip: true, default: "..." } means skip Q3 and use the default value.
export const QUESTIONNAIRE_FLOWS = {
  breakfast: {
    q2: {
      label: "Cooking for yourself or others?",
      options: [
        { value: "solo", label: "Just me", emoji: "👤" },
        { value: "couple", label: "A few people", emoji: "👥" },
        { value: "group", label: "The whole household", emoji: "👨‍👩‍👧" }
      ]
    },
    q3: {
      label: "Weekday rush or lazy morning?",
      options: [
        { value: "quick", label: "Quick, I'm rushing", emoji: "⚡" },
        { value: "normal", label: "I've got some time", emoji: "🕐" },
        { value: "leisurely", label: "Lazy morning", emoji: "☕" }
      ]
    }
  },
  brunch: {
    q2: {
      label: "How many joining?",
      options: [
        { value: "solo", label: "Just me", emoji: "👤" },
        { value: "couple", label: "Small group", emoji: "👥" },
        { value: "group", label: "Big gathering", emoji: "🎉" }
      ]
    },
    // Brunch is inherently leisurely — no need to ask
    q3: { skip: true, default: "leisurely" }
  },
  lunch: {
    q2: {
      label: "Eating alone or with others?",
      options: [
        { value: "solo", label: "Solo desk lunch", emoji: "💻" },
        { value: "couple", label: "With a couple of people", emoji: "👥" },
        { value: "group", label: "Group lunch", emoji: "🤝" }
      ]
    },
    q3: {
      label: "How long do you have?",
      options: [
        { value: "quick", label: "Under 20 min", emoji: "⚡" },
        { value: "normal", label: "30–45 min", emoji: "🕐" },
        { value: "leisurely", label: "No rush", emoji: "😌" }
      ]
    }
  },
  dinner: {
    q2: {
      label: "Cooking for?",
      options: [
        { value: "solo", label: "Just me", emoji: "👤" },
        { value: "couple", label: "2–3 people", emoji: "👥" },
        { value: "group", label: "4+ people", emoji: "👨‍👩‍👧" }
      ]
    },
    q3: {
      label: "How much time?",
      options: [
        { value: "quick", label: "Under 20 min", emoji: "⚡" },
        { value: "normal", label: "30–45 min", emoji: "🕐" },
        { value: "leisurely", label: "An hour+", emoji: "🍳" }
      ]
    }
  },
  snack: {
    q2: {
      label: "Just for you or sharing?",
      options: [
        { value: "solo", label: "Just me", emoji: "👤" },
        { value: "group", label: "Sharing with others", emoji: "🤝" }
      ]
    },
    // Snacks are always quick — no need to ask
    q3: { skip: true, default: "quick" }
  }
};

// Default preferences
export const DEFAULT_PREFERENCES = {
  diet: "None",
  budget: "No",
  seasonalKing: "No"
};
