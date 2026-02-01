// ---------------------------
// Mobile-Specific Touch Interactions
// ---------------------------

const container = document.getElementById("mobile-card-container");
const resultEl = document.getElementById("mobile-result");
const currentRoundEl = document.querySelector(".current-round");
const totalRoundsEl = document.querySelector(".total-rounds");

// Global dragging state for mobile
let isDragging = false;

// Initialize round counter
totalRoundsEl.textContent = maxVibeRounds;

// Create swipe indicators
const likeIndicator = document.createElement("div");
likeIndicator.classList.add("mobile-swipe-indicator", "like");
likeIndicator.textContent = "✓";
document.body.appendChild(likeIndicator);

const nopeIndicator = document.createElement("div");
nopeIndicator.classList.add("mobile-swipe-indicator", "nope");
nopeIndicator.textContent = "✗";
document.body.appendChild(nopeIndicator);

// ---------------------------
// Mobile Card Creation
// ---------------------------

function createMobileCard(vibe) {
    const card = document.createElement("div");
    card.classList.add("mobile-vibe-card");
    card.style.backgroundImage = `url('${vibe.image}')`;
    card.style.backgroundSize = "cover";
    card.style.backgroundPosition = "center";
    card.style.border = `3px solid ${vibe.color}80`;

    const overlay = document.createElement("div");
    overlay.classList.add("mobile-vibe-card-overlay");
    overlay.innerHTML = `
        <div class="mobile-vibe-emoji">${vibe.emoji}</div>
        <div class="mobile-vibe-name">${vibe.name}</div>
        <div class="mobile-vibe-description">${vibe.description}</div>
    `;
    card.appendChild(overlay);

    return card;
}

// ---------------------------
// Mobile Touch Swipe Logic
// ---------------------------

function initMobileSwipe(card, vibe) {
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    let isDragging = false;
    let gestureLocked = false;
    let isHorizontalGesture = true;
    let startTime = 0;

    // Touch start
    card.addEventListener("touchstart", (e) => {
        isDragging = true;
        gestureLocked = false;
        isHorizontalGesture = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startTime = Date.now();
        card.classList.add("dragging");
        card.style.transition = "none";
    }, { passive: false });

    // Touch move
    card.addEventListener("touchmove", (e) => {
        if (!isDragging) return;

        if (!gestureLocked) {
            const dx = e.touches[0].clientX - startX;
            const dy = e.touches[0].clientY - startY;
            if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
                gestureLocked = true;
                isHorizontalGesture = Math.abs(dx) >= Math.abs(dy);
            }
        }

        if (!isHorizontalGesture) {
            isDragging = false;
            card.classList.remove("dragging");
            card.style.transition = "transform 0.2s ease-out";
            card.style.transform = "translateX(0) translateY(0) rotate(0) scale(1)";
            likeIndicator.classList.remove("show");
            nopeIndicator.classList.remove("show");
            return;
        }

        e.preventDefault();

        currentX = e.touches[0].clientX - startX;
        currentY = e.touches[0].clientY - startY;

        // Apply transform with rotation based on swipe direction
        const rotation = currentX * 0.1;
        const scale = Math.max(0.95, 1 - Math.abs(currentX) / 1000);
        card.style.transform = `translateX(${currentX}px) translateY(${currentY * 0.1}px) rotate(${rotation}deg) scale(${scale})`;

        // Show swipe indicators based on direction
        const threshold = 80;
        if (currentX > threshold) {
            likeIndicator.classList.add("show");
            nopeIndicator.classList.remove("show");
        } else if (currentX < -threshold) {
            nopeIndicator.classList.add("show");
            likeIndicator.classList.remove("show");
        } else {
            likeIndicator.classList.remove("show");
            nopeIndicator.classList.remove("show");
        }
    }, { passive: false });

    // Touch end
    card.addEventListener("touchend", (e) => {
        if (!isDragging) return;

        isDragging = false;
        card.classList.remove("dragging");
        card.style.transition = "transform 0.3s ease-out";

        const endTime = Date.now();
        const timeDiff = endTime - startTime;
        const velocity = Math.abs(currentX / timeDiff);

        // Determine swipe action based on distance and velocity
        const swipeThreshold = 100;
        const velocityThreshold = 0.5;

        if (currentX > swipeThreshold || (currentX > 50 && velocity > velocityThreshold)) {
            // Like - swipe right
            vibeProfile.push(vibe);
            animateMobileCardOff(card, 500, true);
        } else if (currentX < -swipeThreshold || (currentX < -50 && velocity > velocityThreshold)) {
            // Nope - swipe left
            animateMobileCardOff(card, -500, false);
        } else {
            // Return to center
            card.style.transform = "translateX(0) translateY(0) rotate(0) scale(1)";
        }

        // Reset indicators
        likeIndicator.classList.remove("show");
        nopeIndicator.classList.remove("show");

        // Reset variables
        currentX = 0;
        currentY = 0;
    }, { passive: true });
}

function animateMobileCardOff(card, distance, isLike) {
    card.style.transform = `translateX(${distance}px) translateY(-50px) rotate(${distance * 0.1}deg) scale(0.8)`;
    card.style.opacity = "0";

    setTimeout(() => {
        card.remove();
        showNextMobileCard();
    }, 300);
}

// ---------------------------
// Mobile Deck Logic
// ---------------------------

function showNextMobileCard() {
    if (currentVibeRound >= maxVibeRounds) {
        showMobileResult();
        return;
    }

    currentVibeRound++;
    currentRoundEl.textContent = currentVibeRound;
    
    const vibe = getNextVibe();
    const card = createMobileCard(vibe);
    container.appendChild(card);
    
    // Add entrance animation
    card.style.opacity = "0";
    card.style.transform = "translateY(50px) scale(0.9)";
    
    setTimeout(() => {
        card.style.transition = "opacity 0.3s ease, transform 0.3s ease";
        card.style.opacity = "1";
        card.style.transform = "translateY(0) scale(1)";
    }, 50);
    
    initMobileSwipe(card, vibe);
}

// ---------------------------
// Mobile Result Display
// ---------------------------

function showMobileResult() {
    // Hide main container
    document.querySelector(".mobile-container").style.display = "none";
    
    // Show result container
    resultEl.classList.add("show");
    
    const recipeCard = document.getElementById("mobile-recipe-card");
    
    // Create vibe summary
    const vibeSummary = vibeProfile.length > 0 
        ? `<div class="mobile-vibe-summary">
            <h2>🎯 Your Vibe Profile</h2>
            <div class="mobile-selected-vibes">
                ${vibeProfile.map(vibe => `<span class="mobile-vibe-tag">${vibe.emoji} ${vibe.name}</span>`).join('')}
            </div>
            <p style="color: #666; margin-top: 10px;">Ready for your personalized recipe?</p>
           </div>`
        : `<div class="mobile-vibe-summary">
            <h2>🍳 Ready to Cook!</h2>
            <p style="color: #666;">Let's find you a delicious recipe!</p>
           </div>`;
    
    recipeCard.innerHTML = `
        ${vibeSummary}
        <div class="ingredients-container">
            <h2>🏡 What do you have at home?</h2>
            <p class="ingredients-subtitle">Optional: Add ingredients you'd like to use</p>
            <textarea class="ingredients-input" placeholder="chicken breast, rice, garlic, spinach..." rows="3"></textarea>
            <div class="ingredients-actions">
                <button class="japandi-btn japandi-btn-subtle add-ingredients-btn" type="button">+ Add Ingredients</button>
            </div>
            <div class="ingredients-confirmation"></div>
        </div>
        <button class="japandi-btn japandi-btn-primary mobile-generate-btn" type="button">🍳 Generate My Recipe</button>
    `;
    
    const addBtn = recipeCard.querySelector('.add-ingredients-btn');
    const ingredientsInput = recipeCard.querySelector('.ingredients-input');
    const confirmation = recipeCard.querySelector('.ingredients-confirmation');
    const generateBtn = recipeCard.querySelector('.mobile-generate-btn');

    addBtn.addEventListener('click', () => {
        const rawValue = ingredientsInput.value.trim();
        if (rawValue) {
            const newItems = rawValue
                .split(',')
                .map(item => item.trim().toLowerCase())
                .filter(item => item.length > 0);

            const existingItems = window.ingredientsAtHome
                ? window.ingredientsAtHome.split(',').map(item => item.trim().toLowerCase())
                : [];

            const combined = [...existingItems, ...newItems];
            const uniqueItems = [...new Set(combined)];
            window.ingredientsAtHome = uniqueItems.join(', ');

            ingredientsInput.value = '';

            confirmation.textContent = `✅ Added: ${newItems.join(', ')}`;
            confirmation.style.color = '#4CAF50';
            confirmation.classList.add('show');
            setTimeout(() => confirmation.classList.remove('show'), 3000);
        } else {
            confirmation.textContent = '⚠️ Please enter ingredients first';
            confirmation.style.color = '#c9a66b';
            confirmation.classList.add('show');
            setTimeout(() => confirmation.classList.remove('show'), 3000);
        }
    });

    generateBtn.addEventListener('click', () => {
        const prompt = generatePersonalizedPrompt();
        generateMobileRecipe(prompt, recipeCard);
    });
}

async function generateMobileRecipe(prompt, recipeCard) {
    const button = recipeCard.querySelector('.mobile-generate-btn');
    
    // Show loading state
    button.innerHTML = '<span class="mobile-loading-spinner"></span> Generating... (this may take 30+ seconds)';
    button.disabled = true;
    
    try {
        // Add timeout for slow Ollama responses
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout - Ollama is taking too long')), 60000)
        );
        
        const recipeText = await Promise.race([
            fetchLocalRecipe(prompt),
            timeoutPromise
        ]);
        
        // Format the recipe using shared formatter
        const formattedRecipe = formatRecipeText(recipeText);
        const recipeHtml = typeof formattedRecipe === 'string' ? formattedRecipe : formattedRecipe.html;
        const hasIngredients = typeof formattedRecipe === 'string' ? false : formattedRecipe.hasIngredients;
        const hasInstructions = typeof formattedRecipe === 'string' ? false : formattedRecipe.hasInstructions;
        
        const showToggle = hasIngredients && hasInstructions;
        
        // Update card with recipe, using mobile-friendly structure
        recipeCard.innerHTML = `
            ${showToggle ? `
                <div class="recipe-toggle" role="tablist" aria-label="Recipe sections">
                    <button type="button" class="recipe-toggle-btn active" data-target="ingredients">Ingredients</button>
                    <button type="button" class="recipe-toggle-btn" data-target="instructions">Instructions</button>
                </div>
            ` : ``}
            <div class="mobile-recipe-content">${recipeHtml}</div>
            <button class="japandi-btn japandi-btn-primary mobile-reset-btn" type="button">🔄 Start Over</button>
        `;
        
        // Set up toggle functionality if both sections exist
        if (showToggle) {
            const contentEl = recipeCard.querySelector('.mobile-recipe-content');
            const toggleBtns = recipeCard.querySelectorAll('.recipe-toggle-btn');
            
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
        const resetBtn = recipeCard.querySelector('.mobile-reset-btn');
        resetBtn.addEventListener('click', () => {
            location.reload();
        });
        
    } catch (error) {
        console.error("Failed to fetch recipe:", error);
        button.textContent = 'Try Again';
        button.disabled = false;
    }
}

// ---------------------------
// Start Mobile App
// ---------------------------

initializeShuffledVibes();
showNextMobileCard();
