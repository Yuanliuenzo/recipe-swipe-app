// Axis cards: each card resolves one preference dimension.
// Swipe RIGHT = swipeRight choice, swipe LEFT = swipeLeft choice.
// Both directions are positive signals — left is NOT rejection, it's a preference.
export default [
  {
    id: "axis-warmth",
    axis: "warmth",
    question: "What sounds better right now?",
    image:
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=560&h=800&fit=crop&q=75",
    swipeRight: {
      label: "Warm & comforting",
      tags: {
        mood: ["cozy", "nostalgic", "slow"],
        flavor: ["warm", "rich", "savory"],
        style: ["homey", "comforting"]
      }
    },
    swipeLeft: {
      label: "Fresh & light",
      tags: {
        mood: ["light", "clean", "energetic"],
        flavor: ["fresh", "crisp", "bright"],
        style: ["wholesome", "minimal"]
      }
    }
  },
  {
    id: "axis-boldness",
    axis: "boldness",
    question: "How bold are you feeling?",
    image:
      "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=560&h=800&fit=crop&q=75",
    swipeRight: {
      label: "Spicy & intense",
      tags: {
        mood: ["bold", "adventurous", "energetic"],
        flavor: ["spicy", "punchy", "intense"],
        style: ["bold", "Asian", "street-food"]
      }
    },
    swipeLeft: {
      label: "Gentle & mellow",
      tags: {
        mood: ["gentle", "calm", "restorative"],
        flavor: ["mild", "delicate", "soothing"],
        style: ["subtle", "balanced"]
      }
    }
  },
  {
    id: "axis-effort",
    axis: "effort",
    question: "How much do you want to cook?",
    image:
      "https://images.unsplash.com/photo-1534482421-64566f976cfa?w=560&h=800&fit=crop&q=75",
    swipeRight: {
      label: "Proper cooking, I enjoy it",
      tags: {
        mood: ["creative", "patient", "slow"],
        flavor: ["complex", "layered"],
        style: ["homemade", "rustic", "slow-cooked"]
      }
    },
    swipeLeft: {
      label: "Quick & minimal",
      tags: {
        mood: ["practical", "efficient"],
        flavor: ["simple", "clean"],
        style: ["quick", "simple", "unfussy"]
      }
    }
  },
  {
    id: "axis-social",
    axis: "social",
    question: "Who are you feeding tonight?",
    image:
      "https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=560&h=800&fit=crop&q=75",
    swipeRight: {
      label: "People I care about",
      tags: {
        mood: ["communal", "generous", "warm"],
        flavor: ["rich", "varied"],
        style: ["sharing", "feast", "crowd-pleasing"]
      }
    },
    swipeLeft: {
      label: "Just me tonight",
      tags: {
        mood: ["solo", "quiet", "intimate"],
        flavor: ["simple", "personal"],
        style: ["single-serving", "unfussy", "personal"]
      }
    }
  },
  {
    id: "axis-adventure",
    axis: "adventure",
    question: "Familiar comfort or something new?",
    image:
      "https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=560&h=800&fit=crop&q=75",
    swipeRight: {
      label: "Take me somewhere different",
      tags: {
        mood: ["adventurous", "curious", "excited"],
        flavor: ["exotic", "complex", "unexpected"],
        style: ["fusion", "world-cuisine", "exotic"]
      }
    },
    swipeLeft: {
      label: "Something I know I'll love",
      tags: {
        mood: ["nostalgic", "safe", "content"],
        flavor: ["classic", "familiar", "reliable"],
        style: ["traditional", "classic", "comfort"]
      }
    }
  },
  {
    id: "axis-indulgence",
    axis: "indulgence",
    question: "Treating yourself or keeping it clean?",
    image:
      "https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=560&h=800&fit=crop&q=75",
    swipeRight: {
      label: "A little indulgent, why not",
      tags: {
        mood: ["treat", "indulgent", "celebratory"],
        flavor: ["rich", "decadent", "buttery"],
        style: ["bistro", "restaurant-quality"]
      }
    },
    swipeLeft: {
      label: "Clean and nourishing",
      tags: {
        mood: ["healthy", "mindful", "reset"],
        flavor: ["light", "clean", "nourishing"],
        style: ["plant-based", "wholesome", "balanced"]
      }
    }
  },
  {
    id: "axis-vessel",
    axis: "vessel",
    question: "A bowl or a plate tonight?",
    image:
      "https://images.unsplash.com/photo-1516684732162-798a0062be99?w=560&h=800&fit=crop&q=75",
    swipeRight: {
      label: "Give me a bowl",
      tags: {
        mood: ["cozy", "restorative"],
        flavor: ["brothy", "umami", "warming"],
        style: ["soups", "stews", "Asian", "one-pot"]
      }
    },
    swipeLeft: {
      label: "Something on a plate",
      tags: {
        mood: ["satisfied", "grounded"],
        flavor: ["hearty", "textured", "varied"],
        style: ["main-course", "European", "plated"]
      }
    }
  },
  {
    id: "axis-world",
    axis: "world",
    question: "Which part of the world are you feeling?",
    image:
      "https://images.unsplash.com/photo-1574484284002-952d92456975?w=560&h=800&fit=crop&q=75",
    swipeRight: {
      label: "Asia — umami, depth, clean",
      tags: {
        mood: ["curious", "clean"],
        flavor: ["umami", "aromatic", "balanced"],
        style: ["Asian", "Japanese", "Chinese", "Korean"]
      }
    },
    swipeLeft: {
      label: "Europe — olive oil, herbs, cheese",
      tags: {
        mood: ["warm", "convivial"],
        flavor: ["herby", "bright", "rich"],
        style: ["Mediterranean", "Italian", "French"]
      }
    }
  },
  {
    id: "axis-season",
    axis: "season",
    question: "How does your kitchen feel right now?",
    image:
      "https://images.unsplash.com/photo-1506354666786-959d6d497f1a?w=560&h=800&fit=crop&q=75",
    swipeRight: {
      label: "Dark, spiced, warming",
      tags: {
        mood: ["cozy", "contemplative"],
        flavor: ["spiced", "earthy", "deep"],
        style: ["autumnal", "wintery", "hearty"]
      }
    },
    swipeLeft: {
      label: "Bright, fresh, abundant",
      tags: {
        mood: ["happy", "energetic", "light"],
        flavor: ["bright", "seasonal", "fresh"],
        style: ["summery", "colourful", "vibrant"]
      }
    }
  },
  {
    id: "axis-energy",
    axis: "energy",
    question: "Where's your energy right now?",
    image:
      "https://images.unsplash.com/photo-1530133532239-eda6f53fcf0f?w=560&h=800&fit=crop&q=75",
    swipeRight: {
      label: "Good! Something worth making",
      tags: {
        mood: ["energetic", "accomplished", "celebratory"],
        flavor: ["satisfying", "special"],
        style: ["impressive", "worthy", "proper"]
      }
    },
    swipeLeft: {
      label: "Low… I need a reset",
      tags: {
        mood: ["restorative", "gentle", "comfort"],
        flavor: ["soothing", "simple", "healing"],
        style: ["recovery", "gentle", "minimal"]
      }
    }
  }
];
