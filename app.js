// ---------------------------
// Web-Specific Swipe Implementation
// ---------------------------

const container = document.getElementById("card-container");
const resultEl = document.getElementById("result");

// Create global glow overlays once
const likeGlow = document.createElement("div");
likeGlow.classList.add("swipe-glow", "like-glow");
likeGlow.innerHTML = '<div class="glow-icon">✓</div>';
document.body.appendChild(likeGlow);

const nopeGlow = document.createElement("div");
nopeGlow.classList.add("swipe-glow", "nope-glow");
nopeGlow.innerHTML = '<div class="glow-icon">✗</div>';
document.body.appendChild(nopeGlow);

// ---------------------------
// Create Vibe Card for Swipe Deck
// ---------------------------

function createCard(vibe) {
    const card = document.createElement("div");
    card.classList.add("card", "vibe-card");
    card.style.backgroundImage = `url('${vibe.image}')`;
    card.style.backgroundSize = "cover";
    card.style.backgroundPosition = "center";
    card.style.border = `2px solid ${vibe.color}50`;
    card.style.top = `${currentVibeRound * 5}px`;

    const overlay = document.createElement("div");
    overlay.classList.add("overlay", "vibe-overlay");
    overlay.style.background = `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7))`;
    overlay.innerHTML = `
        <div class="vibe-emoji">${vibe.emoji}</div>
        <div class="vibe-name">${vibe.name}</div>
        <div class="vibe-description">${vibe.description}</div>
    `;
    card.appendChild(overlay);

    return card;
}

// ---------------------------
// Drag & Swipe (Mouse-based for Web)
// ---------------------------

function initSwipe(card, vibe) {
    let isDragging = false;
    let startX = 0;
    let currentX = 0;

    // Mouse events
    card.addEventListener("mousedown", e => {
        isDragging = true;
        startX = e.clientX;
        card.style.transition = "none";
    });

    document.addEventListener("mousemove", e => {
        if (!isDragging) return;
        currentX = e.clientX - startX;
        updateCardPosition(card, currentX);
    });

    document.addEventListener("mouseup", () => {
        if (!isDragging) return;
        isDragging = false;
        card.style.transition = "transform 0.3s ease";

        if (currentX > 120) {
            // User likes this vibe - add to profile
            vibeProfile.push(vibe);
            animateOff(card, 500);
        } else if (currentX < -120) {
            // User rejects this vibe - don't add to profile
            animateOff(card, -500);
        } else {
            card.style.transform = "translateX(0px) rotate(0deg)";
        }
        
        // Reset glows
        likeGlow.style.opacity = 0;
        nopeGlow.style.opacity = 0;
        currentX = 0;
    });
}

function updateCardPosition(card, currentX) {
    card.style.transform = `translateX(${currentX}px) rotate(${currentX * 0.05}deg)`;

    // Progressive glow based on swipe distance
    const maxDistance = 200;
    const likeIntensity = Math.max(0, Math.min(1, currentX / maxDistance));
    const nopeIntensity = Math.max(0, Math.min(1, -currentX / maxDistance));

    likeGlow.style.opacity = likeIntensity * 0.6;
    nopeGlow.style.opacity = nopeIntensity * 0.6;
}

function animateOff(card, distance) {
    card.style.transform = `translateX(${distance}px) rotate(${distance * 0.05}deg)`;
    setTimeout(() => {
        card.remove();
        showNextCard();
    }, 300);
}

// ---------------------------
// Deck Logic
// ---------------------------

function showNextCard() {
    if (currentVibeRound >= maxVibeRounds) {
        showResult();
        return;
    }

    currentVibeRound++;
    const vibe = getNextVibe();
    const card = createCard(vibe);
    container.appendChild(card);
    initSwipe(card, vibe);
}

// ---------------------------
// Final Result with Flip Card & Sparkles
// ---------------------------

async function showResult() {
    // Hide swipe deck & title
    container.style.display = "none";
    document.querySelector("h1").style.display = "none";

    // Clear and show result container
    resultEl.innerHTML = "";
    resultEl.style.display = "flex";
    resultEl.style.flexDirection = "column";
    resultEl.style.justifyContent = "center";
    resultEl.style.alignItems = "center";
    resultEl.style.height = "100vh";
    resultEl.style.margin = 0;

    // Create personalized prompt based on user's vibe profile
    const personalizedPrompt = generatePersonalizedPrompt();
    console.log("Generated personalized prompt:", personalizedPrompt);

    // Sparkle container (behind card)
    const sparkleContainer = document.createElement("div");
    sparkleContainer.id = "sparkle-container";
    resultEl.appendChild(sparkleContainer);

    // Flip card wrapper
    const wrapper = document.createElement("div");
    wrapper.classList.add("recipe-card-wrapper");

    // Front (vibe summary)
    const front = document.createElement("div");
    front.classList.add("card-face", "front");
    
    // Create vibe summary content
    const vibeSummary = vibeProfile.length > 0 
        ? `<div class="vibe-summary">
            <h2>🎯 Your Vibe Profile</h2>
            <div class="selected-vibes">
                ${vibeProfile.map(vibe => `<span class="vibe-tag">${vibe.emoji} ${vibe.name}</span>`).join('')}
            </div>
            <p class="vibe-description">Ready for your personalized recipe?</p>
           </div>`
        : `<div class="vibe-summary">
            <h2>🍳 Ready to Cook!</h2>
            <p>Let's find you a delicious recipe!</p>
           </div>`;
    
    front.innerHTML = vibeSummary;

    // Back (ingredients input with elegant Japandi styling)
    const back = document.createElement("div");
    back.classList.add("card-face", "back");
    back.innerHTML = `
        <div class="ingredients-container">
            <h2>🏡 What do you have at home?</h2>
            <p class="ingredients-subtitle">Optional: Add ingredients you'd like to use</p>
            <textarea class="ingredients-input" placeholder="chicken breast, rice, garlic, spinach..." rows="3"></textarea>
            <div class="ingredients-actions">
                <button class="japandi-btn japandi-btn-subtle add-ingredients-btn">+ Add Ingredients</button>
            </div>
            <div class="ingredients-confirmation"></div>
            <button class="japandi-btn japandi-btn-primary generate-btn">🍳 Generate My Recipe</button>
        </div>
    `;

    // Add event listeners
    const generateBtn = back.querySelector('.generate-btn');
    const addBtn = back.querySelector('.add-ingredients-btn');
    const ingredientsInput = back.querySelector('.ingredients-input');
    const confirmation = back.querySelector('.ingredients-confirmation');

    console.log("Event listeners setup - addBtn:", addBtn);
    console.log("Event listeners setup - generateBtn:", generateBtn);
    console.log("Event listeners setup - ingredientsInput:", ingredientsInput);

    if (!addBtn) {
        console.error("Add button not found!");
        return;
    }

    addBtn.addEventListener('click', (e) => {
        console.log("ADD BUTTON CLICKED!"); // This should definitely show up
        e.stopPropagation();
        const rawValue = ingredientsInput.value.trim();
        console.log("Add clicked. rawValue:", JSON.stringify(rawValue));
        console.log("Current ingredientsAtHome before:", JSON.stringify(window.ingredientsAtHome));
        
        if (rawValue) {
            // Split new ingredients by commas, clean each, and filter empty
            const newItems = rawValue.split(',')
                .map(item => item.trim().toLowerCase())
                .filter(item => item.length > 0);
            
            // Split existing ingredients (if any) and dedupe
            const existingItems = window.ingredientsAtHome
                ? window.ingredientsAtHome.split(',').map(item => item.trim().toLowerCase())
                : [];
            
            // Combine and dedupe
            const combined = [...existingItems, ...newItems];
            const uniqueItems = [...new Set(combined)];
            
            // Update ingredientsAtHome with cleaned, unique list
            window.ingredientsAtHome = uniqueItems.join(', ');
            
            // Clear the textarea for next entry
            ingredientsInput.value = '';
            
            // Show confirmation
            confirmation.textContent = `✅ Added: ${newItems.join(', ')}`;
            confirmation.style.color = '#4CAF50';
            confirmation.classList.add('show');
            
            setTimeout(() => {
                confirmation.classList.remove('show');
            }, 3000);
            
            console.log("newItems:", newItems);
            console.log("existingItems:", existingItems);
            console.log("uniqueItems:", uniqueItems);
            console.log("Ingredients saved after:", JSON.stringify(window.ingredientsAtHome));
            
        } else {
            confirmation.textContent = '⚠️ Please enter ingredients first';
            confirmation.style.color = '#c9a66b';
            confirmation.classList.add('show');
            
            setTimeout(() => {
                confirmation.classList.remove('show');
            }, 3000);
        }
    });

    generateBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent card flip
        console.log("Generating with ingredientsAtHome:", JSON.stringify(window.ingredientsAtHome));
        console.log("window.ingredientsAtHome type:", typeof window.ingredientsAtHome);
        console.log("window.ingredientsAtHome length:", window.ingredientsAtHome ? window.ingredientsAtHome.length : 'null');
        
        // Regenerate the prompt with current ingredients
        const currentPrompt = generatePersonalizedPrompt();
        console.log("Regenerated prompt with ingredients:", currentPrompt);
        
        generatePersonalizedRecipe(currentPrompt);
    });

    // Prevent flip when clicking/focusing the textarea
    ingredientsInput.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    ingredientsInput.addEventListener('focus', (e) => {
        e.stopPropagation();
    });

    wrapper.appendChild(front);
    wrapper.appendChild(back);
    resultEl.appendChild(wrapper);

    // Click to flip
    wrapper.addEventListener("click", () => wrapper.classList.toggle("flipped"));

    // Add sparkles around card
    setTimeout(() => {
        const rect = wrapper.getBoundingClientRect();
        const containerRect = resultEl.getBoundingClientRect();
        const centerX = rect.left - containerRect.left + rect.width / 2;
        const centerY = rect.top - containerRect.top + rect.height / 2;

        for (let i = 0; i < 40; i++) {
            const sparkle = document.createElement("div");
            sparkle.classList.add("sparkle");

            const size = 4 + Math.random() * 16;
            const angle = Math.random() * Math.PI * 2;
            const radius = 80 + Math.random() * 180;

            const x = centerX + radius * Math.cos(angle) - size/2;
            const y = centerY + radius * Math.sin(angle) - size/2;

            sparkle.style.left = `${x}px`;
            sparkle.style.top = `${y}px`;
            sparkle.style.width = `${size}px`;
            sparkle.style.height = `${size}px`;
            sparkle.style.transform = `rotate(${Math.random() * 360}deg)`;
            sparkle.style.animationDelay = `${Math.random() * 2}s`;
            sparkle.style.animationDuration = `${1.5 + Math.random() * 1.5}s`;

            sparkleContainer.appendChild(sparkle);
        }
    }, 100);
}

// Global function to generate personalized recipe
async function generatePersonalizedRecipe(prompt) {
    console.log("generatePersonalizedRecipe called with prompt:", prompt);
    console.log("generatePersonalizedRecipe - window.ingredientsAtHome:", JSON.stringify(window.ingredientsAtHome));
    
    const back = document.querySelector('.card-face.back');
    const container = back.querySelector('.ingredients-container');
    const button = container.querySelector('.generate-btn');
    
    if (!back || !button) {
        console.error("Could not find back or button");
        return;
    }
    
    // Store ingredients before replacing content
    const storedIngredients = window.ingredientsAtHome;
    console.log("Stored ingredients before content replacement:", storedIngredients);
    
    // Show loading state with spinner
    button.innerHTML = '<span class="loading-spinner"></span> Generating... (this may take 30+ seconds)';
    button.disabled = true;
    
    try {
        console.log("Sending personalized prompt:", prompt);
        
        // Add timeout to handle slow Ollama responses
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout - Ollama is taking too long')), 60000)
        );
        
        const recipeText = await Promise.race([
            fetchLocalRecipe(prompt),
            timeoutPromise
        ]);
        
        console.log("Got personalized recipe text successfully");

        // Format the recipe text with better HTML structure
        const formattedRecipe = formatRecipeText(recipeText);
        const recipeHtml = typeof formattedRecipe === 'string' ? formattedRecipe : formattedRecipe.html;
        const hasIngredients = typeof formattedRecipe === 'string' ? false : formattedRecipe.hasIngredients;
        const hasInstructions = typeof formattedRecipe === 'string' ? false : formattedRecipe.hasInstructions;

        const showToggle = hasIngredients && hasInstructions;

        // Update the container content with generated recipe, maintaining structure
        container.innerHTML = `
            <h2>🍳 Your Personalized Recipe</h2>
            ${showToggle ? `
                <div class="recipe-toggle" role="tablist" aria-label="Recipe sections">
                    <button type="button" class="recipe-toggle-btn active" data-target="ingredients">Ingredients</button>
                    <button type="button" class="recipe-toggle-btn" data-target="instructions">Instructions</button>
                </div>
            ` : ``}
            <div class="recipe-content">${recipeHtml}</div>
            <button class="japandi-btn japandi-btn-primary reset-btn">🔄 Start Over</button>
        `;

        // Restore ingredients after content replacement (in case they got reset)
        if (storedIngredients && !window.ingredientsAtHome) {
            window.ingredientsAtHome = storedIngredients;
            console.log("Restored ingredients after content replacement:", window.ingredientsAtHome);
        }

        if (showToggle) {
            const contentEl = container.querySelector('.recipe-content');
            const toggleBtns = container.querySelectorAll('.recipe-toggle-btn');

            const setActive = (target) => {
                contentEl.querySelectorAll('[data-recipe-section]').forEach((el) => {
                    el.style.display = el.dataset.recipeSection === target ? '' : 'none';
                });

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

            setActive('ingredients');
        }

        // Add event listener to reset button
        const resetBtn = container.querySelector('.reset-btn');
        resetBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            location.reload();
        });
        
    } catch (error) {
        console.error("Failed to fetch personalized recipe:", error);
        button.textContent = 'Try Again';
        button.disabled = false;
    }
}

// ---------------------------
// Start Web App
// ---------------------------

initializeShuffledVibes();
showNextCard();
