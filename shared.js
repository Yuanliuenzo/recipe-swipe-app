// ---------------------------
// Shared Data and API Logic
// ---------------------------

const vibes = [
    { 
        name: "Cozy Night In", 
        emoji: "🛋️",
        description: "Comfort food, warm blankets, Netflix marathon",
        prompt: "comforting, hearty, perfect for staying in on a cold night",
        color: "#8B7355",
        image: "images/cozy_night.jpg"
    },
    { 
        name: "Healthy & Fresh", 
        emoji: "🥗",
        description: "Light, nutritious, energizing",
        prompt: "healthy, fresh, light but satisfying, packed with vegetables",
        color: "#7CB342",
        image: "images/healthy_fresh.jpg"
    },
    { 
        name: "Spicy Adventure", 
        emoji: "🌶️",
        description: "Bold flavors, exotic ingredients, heat",
        prompt: "spicy, adventurous, bold flavors, exciting and intense",
        color: "#D32F2F",
        image: "images/spicy_adventure.jpg"
    },
    { 
        name: "Quick & Easy", 
        emoji: "⚡",
        description: "Minimal effort, maximum flavor, under 30 mins",
        prompt: "quick, easy, minimal cleanup, perfect for busy weeknights",
        color: "#1976D2",
        image: "images/quick_easy.jpg"
    },
    { 
        name: "Romantic Dinner", 
        emoji: "🕯️",
        description: "Elegant, impressive, date night worthy",
        prompt: "romantic, elegant, impressive but not too complicated",
        color: "#E91E63",
        image: "images/romantic_dinner.jpg"
    },
    { 
        name: "Hangover Cure", 
        emoji: "🤕",
        description: "Soothing, greasy, restorative",
        prompt: "comforting, greasy, perfect for curing a hangover",
        color: "#FF6F00",
        image: "images/hangover_cure.jpg"
    },
    { 
        name: "Summer Vibes", 
        emoji: "☀️",
        description: "Grilling, fresh, light, outdoor friendly",
        prompt: "fresh, summery, perfect for grilling or outdoor dining",
        color: "#FFB300",
        image: "images/summer_vibes.jpg"
    },
    { 
        name: "Comfort Food Classic", 
        emoji: "🍲",
        description: "Nostalgic, hearty, like mom used to make",
        prompt: "classic comfort food, nostalgic, hearty and satisfying",
        color: "#6D4C41",
        image: "images/comfort_food.jpg"
    }
];

// Shared state (will be loaded from server)
let vibeProfile = [];
let ingredientsAtHome = '';
let favorites = [];
let currentUsername = '';

const maxVibeRounds = 5;
let currentVibeRound = 0;
let shuffledVibes = [];

// Load user state from server
async function loadUserState() {
    try {
        const res = await fetch('/api/me');
        if (!res.ok) throw new Error('Not logged in');
        const data = await res.json();
        vibeProfile = data.vibeProfile || [];
        ingredientsAtHome = data.ingredientsAtHome || '';
        favorites = data.favorites || [];
        currentUsername = data.username || '';
        console.log('Loaded user state:', { currentUsername, vibeProfile, ingredientsAtHome, favorites });
    } catch (e) {
        console.error('Failed to load user state:', e);
        // Fallback: redirect to profile picker
        window.location.href = '/profile-picker.html';
    }
}

// Initialize shuffled vibes once (no repeats)
function initializeShuffledVibes() {
    shuffledVibes = shuffle([...vibes]);
}

// Shuffle helper
function shuffle(array) {
    return array.sort(() => 0.5 - Math.random());
}

// Get next unique vibe (reshuffle if we run out)
function getNextVibe() {
    if (shuffledVibes.length === 0) {
        initializeShuffledVibes();
    }
    return shuffledVibes.shift();
}

// Generate personalized prompt based on vibe profile
function generatePersonalizedPrompt() {
    console.log("generatePersonalizedPrompt called. ingredientsAtHome:", JSON.stringify(ingredientsAtHome));
    
    if (vibeProfile.length === 0) {
        return "Write me a delicious recipe that would be perfect for any occasion.";
    }

    const vibeDescriptions = vibeProfile.map(vibe => vibe.prompt);
    const combinedVibes = vibeDescriptions.join(", ");
    
    let prompt = `Can you make a recipe for someone that has this vibe:

${combinedVibes}

Please write me a clear, well-formatted recipe that matches these preferences. `;
    
    if (ingredientsAtHome) {
        prompt += `Try to incorporate these ingredients they already have: ${ingredientsAtHome}. `;
    }
    
    prompt += `Structure it exactly like this (follow the formatting rules strictly):

Recipe Name
===

Ingredients:
• [ingredient 1]
• [ingredient 2]
• [ingredient 3]

Instructions:
1. [step 1]
2. [step 2]
3. [step 3]

Formatting rules:
- Use the exact header text "Ingredients:" on its own line.
- Use the exact header text "Instructions:" on its own line.
- Put each ingredient on its own line (prefer starting with "• ").
- Put each instruction on its own line starting with "1.", "2.", etc.
- Do not merge ingredients and instructions into the same paragraph.
- Do not omit the Instructions header.

Keep it concise but complete.`;

    return prompt;
}

// API call to fetch recipe from local server
async function fetchLocalRecipe(prompt) {
    console.log("fetchLocalRecipe called with:", prompt);
    
    try {
        const res = await fetch('/api/generateRecipe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });
        
        console.log("Response status:", res.status);
        
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        console.log("Response data:", data);
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        return data.recipe;
    } catch (error) {
        console.error("Error in fetchLocalRecipe:", error);
        throw error;
    }
}

// Format recipe text for display
function formatRecipeText(recipeText, hideTitle = false) {
    const applyInlineFormatting = (text) => {
        if (typeof text !== 'string') return text;
        return text
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    };

    const introLines = [];
    const ingredientLines = [];
    const instructionLines = [];
    let recipeTitle = '';

    let mode = 'intro';
    const lines = String(recipeText || '').split('\n');
    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        if (line.toLowerCase() === 'ingredients:' || line.toLowerCase().startsWith('ingredients:')) {
            mode = 'ingredients';
            continue;
        }
        if (line.toLowerCase() === 'instructions:' || line.toLowerCase().startsWith('instructions:')) {
            mode = 'instructions';
            continue;
        }

        if (line === '===') continue;

        if (mode === 'ingredients' && /^\d+(\.|\))\s+/.test(line)) {
            mode = 'instructions';
        }

        if (mode === 'intro') {
            // Capture the first line as the recipe title
            if (!recipeTitle) {
                // Remove common prefixes like "Recipe Name:" or "Recipe:"
                let cleanLine = line.replace(/^(Recipe Name:|Recipe:)\s*/i, '').trim();
                if (cleanLine && !cleanLine.toLowerCase().includes('ingredients') && !cleanLine.toLowerCase().includes('instructions')) {
                    recipeTitle = cleanLine;
                } else {
                    introLines.push(line);
                }
            } else {
                introLines.push(line);
            }
        } else if (mode === 'ingredients') {
            ingredientLines.push(line);
        } else if (mode === 'instructions') {
            instructionLines.push(line);
        }
    }

    const hasIngredients = ingredientLines.length > 0;
    const hasInstructions = instructionLines.length > 0;

    let html = '';

    if (recipeTitle && !hideTitle) {
        html += `<h2 class="recipe-title">${applyInlineFormatting(recipeTitle)}</h2>`;
    }

    if (introLines.length) {
        html += `<div class="recipe-intro">${applyInlineFormatting(introLines.join('\n'))}</div>`;
    }

    if (hasIngredients) {
        html += `
            <div class="recipe-section recipe-section-ingredients" data-recipe-section="ingredients">
                <h3>🥘 Ingredients</h3>
                <ul class="ingredients-list">
                    ${ingredientLines
                        .map(item => item.replace(/^[-•]\s*/, ''))
                        .map(item => `<li>${applyInlineFormatting(item)}</li>`)
                        .join('')}
                </ul>
            </div>
        `;
    }

    if (hasInstructions) {
        html += `
            <div class="recipe-section recipe-section-instructions" data-recipe-section="instructions">
                <h3>👨‍🍳 Instructions</h3>
                <ol class="instructions-list">
                    ${instructionLines
                        .map(item => item.replace(/^\d+\.|^\d+\)|^[-•]\s*/g, '').trim())
                        .map(item => `<li>${applyInlineFormatting(item)}</li>`)
                        .join('')}
                </ol>
            </div>
        `;
    }

    if (!html) {
        return {
            html: `<p>${applyInlineFormatting(String(recipeText || ''))}</p>`,
            hasIngredients: false,
            hasInstructions: false
        };
    }

    return { html, hasIngredients, hasInstructions };
}

// Reset game state
function resetGame() {
    vibeProfile = [];
    currentVibeRound = 0;
}
