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
    // Entrance animation state
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px) scale(0.95)';
    card.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';

    const overlay = document.createElement("div");
    overlay.classList.add("overlay", "vibe-overlay");
    overlay.style.background = `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7))`;
    overlay.innerHTML = `
        <div class="vibe-emoji">${vibe.emoji}</div>
        <div class="vibe-name">${vibe.name}</div>
        <div class="vibe-description">${vibe.description}</div>
    `;
    card.appendChild(overlay);

    // Trigger entrance animation after appending to DOM
    requestAnimationFrame(() => {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0) scale(1)';
    });

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
        console.log("Current ingredientsAtHome before:", JSON.stringify(ingredientsAtHome));
        
        if (rawValue) {
            // Split new ingredients by commas, clean each, and filter empty
            const newItems = rawValue.split(',')
                .map(item => item.trim().toLowerCase())
                .filter(item => item.length > 0);
            
            // Split existing ingredients (if any) and dedupe
            const existingItems = ingredientsAtHome
                ? ingredientsAtHome.split(',').map(item => item.trim().toLowerCase())
                : [];
            
            // Combine and dedupe
            const combined = [...existingItems, ...newItems];
            const uniqueItems = [...new Set(combined)];
            
            // Update ingredientsAtHome with cleaned, unique list
            ingredientsAtHome = uniqueItems.join(', ');
            
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
            console.log("Ingredients saved after:", JSON.stringify(ingredientsAtHome));
            
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
        console.log("Generating with ingredientsAtHome:", JSON.stringify(ingredientsAtHome));
        console.log("ingredientsAtHome type:", typeof ingredientsAtHome);
        console.log("ingredientsAtHome length:", ingredientsAtHome ? ingredientsAtHome.length : 'null');
        
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
    console.log("generatePersonalizedRecipe - ingredientsAtHome:", JSON.stringify(ingredientsAtHome));
    
    const back = document.querySelector('.card-face.back');
    const container = back.querySelector('.ingredients-container');
    const button = container.querySelector('.generate-btn');
    
    if (!back || !button) {
        console.error("Could not find back or button");
        return;
    }
    
    // Store ingredients before replacing content
    const storedIngredients = ingredientsAtHome;
    console.log("Stored ingredients before content replacement:", storedIngredients);
    
    // Show loading state with spinner
    button.innerHTML = '<span class="loading-spinner"></span> Generating... (this may take 30+ seconds)';
    button.disabled = true;

    // Show skeleton loading in the container
    container.innerHTML = `
        <h2>🍳 Your Personalized Recipe</h2>
        <div class="recipe-loading-status">Generating your recipe...</div>
        <div class="recipe-skeleton">
            <div class="skeleton-line skeleton-title"></div>
            <div class="skeleton-line skeleton-subtitle"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line short"></div>
        </div>
    `;
    
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
            <div class="recipe-action-bar">
                <button class="action-btn primary save-favorite-btn" type="button">
                    <span class="action-icon">⭐</span>
                    <span class="action-text">Save to Favorites</span>
                </button>
                <button class="action-btn secondary back-to-swipe-btn" type="button">
                    <span class="action-icon">🔄</span>
                    <span class="action-text">Back to Swiping</span>
                </button>
            </div>
        `;

        // Restore ingredients after content replacement (in case they got reset)
        if (storedIngredients && !ingredientsAtHome) {
            ingredientsAtHome = storedIngredients;
            console.log("Restored ingredients after content replacement:", ingredientsAtHome);
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

        // Add event listener to save favorite button
        const saveBtn = container.querySelector('.save-favorite-btn');
        saveBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const titleEl = container.querySelector('.recipe-title');
            const title = titleEl ? titleEl.textContent.trim() : 'Untitled Recipe';
            try {
                saveBtn.disabled = true;
                saveBtn.querySelector('.action-text').textContent = 'Saving...';
                const res = await fetch('/api/favorites', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        recipeText: recipeText,
                        title,
                        rating: null,
                        note: null
                    })
                });
                if (!res.ok) throw new Error('Failed to save');
                saveBtn.querySelector('.action-text').textContent = 'Saved!';
                // Show success message with next steps
                const successMsg = document.createElement('div');
                successMsg.className = 'save-success-message';
                successMsg.innerHTML = `
                    <div class="success-content">
                        <strong>Recipe saved!</strong><br>
                        <small>View your favorites from the profile menu or swipe for more recipes.</small>
                    </div>
                `;
                container.insertBefore(successMsg, container.querySelector('.recipe-action-bar').nextSibling);
                setTimeout(() => {
                    saveBtn.querySelector('.action-text').textContent = 'Save to Favorites';
                    saveBtn.disabled = false;
                    successMsg.remove();
                }, 4000);
            } catch (err) {
                console.error('Save favorite error:', err);
                saveBtn.querySelector('.action-text').textContent = 'Save to Favorites';
                saveBtn.disabled = false;
            }
        });

        // Add event listener to back to swiping button
        container.querySelector('.back-to-swipe-btn').addEventListener('click', () => {
            location.reload();
        });
        
    } catch (error) {
        console.error("Failed to fetch personalized recipe:", error);
        button.textContent = 'Try Again';
        button.disabled = false;
    }
}

// ---------------------------
// Favorites Screen
// ---------------------------

async function showFavoritesScreen() {
    // Hide the swipe container and show full-screen favorites
    const swipeContainer = document.querySelector('.swipe-container');
    const resultContainer = document.getElementById('container');
    const header = document.querySelector('.header');
    
    if (swipeContainer) swipeContainer.style.display = 'none';
    if (resultContainer) resultContainer.style.display = 'none';
    
    header.innerHTML = `
        <h1>🍳 Recipe Swipe</h1>
        <div class="unified-dropdown">
            <button class="unified-btn">👤 ${window.currentUser?.username || 'Profile'}</button>
            <div class="unified-dropdown-content">
                <button class="unified-dropdown-item back-to-swiping-btn">← Back to Swiping</button>
                <button class="unified-dropdown-item favorites-btn">⭐ My Favorites</button>
                <button class="unified-dropdown-item switch-profile-btn">🔄 Switch Profile</button>
                <button class="unified-dropdown-item logout-btn">🚪 Logout</button>
            </div>
        </div>
    `;
    
    // Create full-screen favorites container
    const favoritesContainer = document.createElement('div');
    favoritesContainer.className = 'favorites-fullscreen';
    favoritesContainer.innerHTML = `
        <div class="favorites-header">
            <h2>⭐ My Favorites</h2>
            <button class="japandi-btn japandi-btn-subtle back-to-main-btn">← Back to Swiping</button>
        </div>
        <div class="favorites-grid"></div>
    `;
    document.body.appendChild(favoritesContainer);
    
    const gridContainer = favoritesContainer.querySelector('.favorites-grid');
    
    // Re-attach dropdown events
    const wrapper = header.querySelector('.unified-dropdown');
    const btn = wrapper.querySelector('.unified-btn');
    const dropdown = wrapper.querySelector('.unified-dropdown-content');
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
    });
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });
    wrapper.querySelector('.back-to-swiping-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.remove('show');
        
        // Start exit animation for favorites
        favoritesContainer.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        favoritesContainer.style.opacity = '0';
        favoritesContainer.style.transform = 'translateY(30px) scale(0.98)';
        
        setTimeout(() => {
            // Clean up
            favoritesContainer.remove();
            
            // Show main containers
            if (swipeContainer) swipeContainer.style.display = '';
            if (resultContainer) resultContainer.style.display = '';
            
            // Restore the original header content
            addHeaderControls();
        }, 350);
    });
    
    wrapper.querySelector('.favorites-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.remove('show');
        // Already on favorites screen
    });
    wrapper.querySelector('.switch-profile-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        window.location.href = '/profile-picker.html';
    });
    wrapper.querySelector('.logout-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
            await fetch('/logout', { method: 'POST' });
            window.location.href = '/profile-picker.html';
        } catch (error) {
            console.error('Logout error:', error);
            // Fallback: clear client-side cookie anyway
            document.cookie = 'profile=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            window.location.href = '/profile-picker.html';
        }
    });
    
    // Back button
    favoritesContainer.querySelector('.back-to-main-btn').addEventListener('click', () => {
        favoritesContainer.remove();
        if (swipeContainer) swipeContainer.style.display = '';
        if (resultContainer) resultContainer.style.display = '';
    });
    
    try {
        const res = await fetch('/api/favorites');
        const { favorites } = await res.json();
        if (!favorites || favorites.length === 0) {
            gridContainer.innerHTML = '<p class="empty-favorites">No favorites yet. Swipe and save some recipes!</p>';
            return;
        }
        favorites.forEach(fav => {
            const card = document.createElement('div');
            card.className = 'favorite-card';
            card.innerHTML = `
                <div class="favorite-header">
                    <h3 class="favorite-title">${fav.title}</h3>
                    <div class="favorite-meta">
                        <span class="favorite-date">${new Date(fav.createdAt).toLocaleDateString()}</span>
                        <button class="delete-favorite-btn" data-id="${fav.id}">🗑️</button>
                    </div>
                </div>
                <div class="favorite-body">${fav.recipeText}</div>
                <div class="favorite-footer">
                    <div class="favorite-rating">
                        ${Array.from({length:5}, (_, i) => `<button class="star-btn ${i < (fav.rating ?? -1) ? 'active' : ''}" data-id="${fav.id}" data-rating="${i+1}">${i < (fav.rating ?? -1) ? '⭐' : '☆'}</button>`).join('')}
                    </div>
                    <textarea class="favorite-note" placeholder="Add a note..." data-id="${fav.id}">${fav.note ?? ''}</textarea>
                    <button class="save-note-btn" data-id="${fav.id}">💾 Save Note</button>
                </div>
            `;
            gridContainer.appendChild(card);
        });
        // Delete handlers
        container.querySelectorAll('.delete-favorite-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                if (!confirm('Delete this favorite?')) return;
                await fetch(`/api/favorites/${id}`, { method: 'DELETE' });
                showFavoritesScreen(); // refresh
            });
        });
        // Rating handlers
        container.querySelectorAll('.star-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const rating = parseInt(btn.dataset.rating);
                await fetch(`/api/favorites/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rating })
                });
                showFavoritesScreen();
            });
        });
        // Note handlers
        container.querySelectorAll('.save-note-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const noteEl = container.querySelector(`.favorite-note[data-id="${id}"]`);
                const note = noteEl.value.trim();
                await fetch(`/api/favorites/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ note })
                });
                btn.textContent = '✅ Saved';
                setTimeout(() => btn.textContent = '💾 Save Note', 1500);
            });
        });
    } catch (err) {
        console.error('Failed to load favorites:', err);
        itemsContainer.innerHTML = '<p class="error-favorites">Failed to load favorites.</p>';
    }
}

// ---------------------------
// Start Web App
// ---------------------------

async function startApp() {
    await loadUserState();
    initializeShuffledVibes();
    showNextCard();
    // Add header buttons on start
    addHeaderControls();
}

function addHeaderControls() {
    const header = document.querySelector('.header');
    if (!header) return;
    // Avoid duplicates
    if (document.querySelector('.unified-dropdown')) return;

    // Clear header and rebuild with proper layout
    header.innerHTML = `
        <h1>🍳 Recipe Swipe</h1>
        <div class="unified-dropdown">
            <button class="unified-btn">👤 ${window.currentUser?.username || 'Profile'}</button>
            <div class="unified-dropdown-content">
                <button class="unified-dropdown-item favorites-btn">⭐ My Favorites</button>
                <button class="unified-dropdown-item switch-profile-btn">🔄 Switch Profile</button>
                <button class="unified-dropdown-item logout-btn">🚪 Logout</button>
            </div>
        </div>
    `;

    const wrapper = header.querySelector('.unified-dropdown');
    const btn = wrapper.querySelector('.unified-btn');
    const dropdown = wrapper.querySelector('.unified-dropdown-content');
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
    });
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });
    wrapper.querySelector('.favorites-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        showFavoritesScreen();
    });
    wrapper.querySelector('.switch-profile-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        window.location.href = '/profile-picker.html';
    });
    wrapper.querySelector('.logout-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
            await fetch('/logout', { method: 'POST' });
            window.location.href = '/profile-picker.html';
        } catch (error) {
            console.error('Logout error:', error);
            // Fallback: clear client-side cookie anyway
            document.cookie = 'profile=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            window.location.href = '/profile-picker.html';
        }
    });
}

startApp();
