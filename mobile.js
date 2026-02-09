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
    // Entrance animation state
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px) scale(0.95)';
    card.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';

    const overlay = document.createElement("div");
    overlay.classList.add("mobile-vibe-card-overlay");
    overlay.innerHTML = `
        <div class="mobile-vibe-emoji">${vibe.emoji}</div>
        <div class="mobile-vibe-name">${vibe.name}</div>
        <div class="mobile-vibe-description">${vibe.description}</div>
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
    // Check if FAB overlay is visible and hide it
    const fabOverlay = document.getElementById('fabOverlay');
    if (fabOverlay && fabOverlay.classList.contains('show')) {
        fabOverlay.classList.remove('show');
    }
    
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

            const existingItems = ingredientsAtHome
                ? ingredientsAtHome.split(',').map(item => item.trim().toLowerCase())
                : [];

            const combined = [...existingItems, ...newItems];
            const uniqueItems = [...new Set(combined)];
            ingredientsAtHome = uniqueItems.join(', ');

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
        try {
            const prompt = generatePersonalizedPrompt();
            generateMobileRecipe(prompt, recipeCard);
        } catch (error) {
            console.error('Error in generate button handler:', error);
        }
    });
}

async function generateMobileRecipe(prompt, recipeCard) {
    const button = recipeCard.querySelector('.mobile-generate-btn');
    
    if (!button) {
        console.error('Generate button not found in recipeCard');
        return;
    }
    
    button.innerHTML = '<span class="mobile-loading-spinner"></span> Generating... (this may take 30+ seconds)';
    button.disabled = true;

    // Show skeleton loading in the card (but keep the button)
    const currentContent = recipeCard.innerHTML;
    recipeCard.innerHTML = `
        <div class="mobile-recipe-loading-status">Generating your recipe...</div>
        <div class="mobile-recipe-skeleton">
            <div class="skeleton-line skeleton-title"></div>
            <div class="skeleton-line skeleton-subtitle"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line short"></div>
        </div>
    `;
    
    // Re-add the button at the bottom
    const newButton = document.createElement('button');
    newButton.className = 'japandi-btn japandi-btn-primary mobile-generate-btn';
    newButton.innerHTML = '<span class="mobile-loading-spinner"></span> Generating... (this may take 30+ seconds)';
    newButton.disabled = true;
    recipeCard.appendChild(newButton);
    
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
            <div class="recipe-actions">
                <button class="japandi-btn japandi-btn-subtle save-favorite-btn" type="button">⭐ Save</button>
                <button class="japandi-btn japandi-btn-primary mobile-reset-btn" type="button">🔄 Start Over</button>
            </div>
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

        // Add event listener to save favorite button
        const saveBtn = recipeCard.querySelector('.save-favorite-btn');
        saveBtn.addEventListener('click', async () => {
            // Haptic feedback
            if (navigator.vibrate) navigator.vibrate(10);
            const titleEl = recipeCard.querySelector('.recipe-title');
            const title = titleEl ? titleEl.textContent.trim() : 'Untitled Recipe';
            try {
                saveBtn.disabled = true;
                saveBtn.textContent = 'Saving...';
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
                // Success haptic
                if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
                saveBtn.textContent = '✅ Saved';
                setTimeout(() => {
                    saveBtn.textContent = '⭐ Save';
                    saveBtn.disabled = false;
                }, 2000);
            } catch (err) {
                console.error('Save favorite error:', err);
                saveBtn.textContent = '⭐ Save';
                saveBtn.disabled = false;
            }
        });
        
    } catch (error) {
        console.error("Failed to fetch recipe:", error);
        newButton.textContent = 'Try Again';
        newButton.disabled = false;
    }
}

// ---------------------------
// Mobile Navigation Component
// ---------------------------

// Global navigation instance
let mobileNavigationInstance = null;

function createMobileNavigation() {
    // Return existing instance if already created
    if (mobileNavigationInstance) {
        return mobileNavigationInstance;
    }
    
    // Remove any existing navigation (cleanup)
    const existingNav = document.querySelector('.mobile-navigation');
    if (existingNav) {
        existingNav.remove();
    }
    
    // Create a simple, reliable floating action button
    const nav = document.createElement('div');
    nav.className = 'mobile-navigation';
    nav.innerHTML = `
        <button class="mobile-fab" id="mobileFab">
            <span class="fab-icon">👤</span>
        </button>
        <div class="mobile-fab-menu" id="mobileFabMenu">
            <div class="fab-items">
                <button class="fab-item back-to-swiping-btn" style="display: none;">
                    <span class="fab-item-icon">←</span>
                    <span class="fab-item-text">Back to Swiping</span>
                </button>
                <button class="fab-item favorites-btn">
                    <span class="fab-item-icon">⭐</span>
                    <span class="fab-item-text">My Favorites</span>
                </button>
                <button class="fab-item preferences-btn">
                    <span class="fab-item-icon">⚙️</span>
                    <span class="fab-item-text">Preferences</span>
                </button>
                <button class="fab-item logout-btn">
                    <span class="fab-item-icon">🚪</span>
                    <span class="fab-item-text">Logout</span>
                </button>
            </div>
        </div>
        <div class="fab-overlay" id="fabOverlay"></div>
    `;
    
    // Add to body
    document.body.appendChild(nav);
    
    // Initialize event handlers
    initializeNavigationEvents(nav);
    
    // Store instance
    mobileNavigationInstance = nav;
    
    return nav;
}

function initializeNavigationEvents(nav) {
    // Simple, reliable event handling
    const fab = document.getElementById('mobileFab');
    const menu = document.getElementById('mobileFabMenu');
    const fabOverlay = document.getElementById('fabOverlay');
    
    // Open menu
    fab.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.add('show');
        fabOverlay.classList.add('show');
    });
    
    // Close menu
    function closeMenu() {
        menu.classList.remove('show');
        fabOverlay.classList.remove('show');
    }
    
    fabOverlay.addEventListener('click', closeMenu);
    
    // Menu items
    const favoritesBtn = nav.querySelector('.favorites-btn');
    if (favoritesBtn) {
        favoritesBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeMenu();
            showMobileFavoritesScreen();
        });
    }
    
    const backBtn = nav.querySelector('.back-to-swiping-btn');
    if (backBtn) {
        backBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeMenu();
            exitFavoritesView();
        });
    }
    
    const preferencesBtn = nav.querySelector('.preferences-btn');
    if (preferencesBtn) {
        preferencesBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeMenu();
            showMobilePreferencesScreen();
        });
    }
    
    const logoutBtn = nav.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
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
}

function showBackToSwipingButton() {
    const backBtn = document.querySelector('.back-to-swiping-btn');
    if (backBtn) backBtn.style.display = '';
}

function hideBackToSwipingButton() {
    const backBtn = document.querySelector('.back-to-swiping-btn');
    if (backBtn) backBtn.style.display = 'none';
}

function exitFavoritesView() {
    const favoritesContainer = document.querySelector('.mobile-favorites-fullscreen');
    const preferencesContainer = document.querySelector('.mobile-preferences-fullscreen');
    const mobileContainer = document.getElementById('mobile-container');
    
    if (navigator.vibrate) navigator.vibrate(50);
    
    // Hide both fullscreen containers if they exist
    const hideContainer = (container) => {
        if (container) {
            container.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
            container.style.opacity = '0';
            container.style.transform = 'translateY(30px) scale(0.98)';
            
            setTimeout(() => {
                container.remove();
            }, 350);
        }
    };
    
    hideContainer(favoritesContainer);
    hideContainer(preferencesContainer);
    
    // Show main container
    if (mobileContainer) {
        mobileContainer.style.display = '';
        mobileContainer.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        mobileContainer.style.opacity = '0';
        mobileContainer.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            mobileContainer.style.opacity = '1';
            mobileContainer.style.transform = 'translateY(0)';
        }, 50);
    }
    
    // Hide back button when returning to main view
    hideBackToSwipingButton();
}

// ---------------------------
// Mobile Favorites Screen
// ---------------------------

async function showMobileFavoritesScreen() {
    console.log('DEBUG: showMobileFavoritesScreen called'); // Debug 7
    
    const mobileContainer = document.getElementById('mobile-container');
    
    // Ensure navigation exists but don't recreate it
    const nav = createMobileNavigation();
    
    console.log('DEBUG: mobileContainer found:', !!mobileContainer); // Debug 8
    console.log('DEBUG: nav found:', !!nav); // Debug 9
    
    if (mobileContainer) {
        console.log('DEBUG: Hiding mobile container'); // Debug 10
        mobileContainer.style.display = 'none';
    }
    
    console.log('DEBUG: Showing back to swiping button'); // Debug 11
    showBackToSwipingButton();
    
    // Create full-screen favorites container
    const favoritesContainer = document.createElement('div');
    favoritesContainer.className = 'mobile-favorites-fullscreen';
    favoritesContainer.innerHTML = `
        <div class="mobile-favorites-header">
            <h2>⭐ My Favorites</h2>
        </div>
        <div class="mobile-favorites-grid"></div>
        <button class="mobile-floating-back-btn" id="floatingBackBtn">
            <span class="floating-back-icon">←</span>
            <span class="floating-back-text">Back</span>
        </button>
    `;
    document.body.appendChild(favoritesContainer);
    
    // Add floating back button functionality
    const floatingBackBtn = favoritesContainer.querySelector('#floatingBackBtn');
    if (floatingBackBtn) {
        floatingBackBtn.addEventListener('click', () => {
            if (navigator.vibrate) navigator.vibrate(50);
            exitFavoritesView();
        });
        
        // Show/hide floating back button on scroll
        let lastScrollTop = 0;
        favoritesContainer.addEventListener('scroll', () => {
            const scrollTop = favoritesContainer.scrollTop;
            if (scrollTop > 200) {
                floatingBackBtn.classList.add('visible');
            } else {
                floatingBackBtn.classList.remove('visible');
            }
            lastScrollTop = scrollTop;
        });
    }
    
    const gridContainer = favoritesContainer.querySelector('.mobile-favorites-grid');
    try {
        const res = await fetch('/api/favorites');
        const { favorites } = await res.json();
        if (!favorites || favorites.length === 0) {
            gridContainer.innerHTML = '<p class="mobile-empty-favorites">No favorites yet. Swipe and save some recipes!</p>';
            return;
        }
        favorites.forEach(fav => {
            const formattedRecipe = formatRecipeText(fav.recipeText, true); // Hide title in favorites
            const hasIngredients = typeof formattedRecipe === 'string' ? false : formattedRecipe.hasIngredients;
            const hasInstructions = typeof formattedRecipe === 'string' ? false : formattedRecipe.hasInstructions;
            const showToggle = hasIngredients && hasInstructions;
            const recipeHtml = typeof formattedRecipe === 'string' ? formattedRecipe : formattedRecipe.html;
            
            const card = document.createElement('div');
            card.className = 'mobile-favorite-card';
            card.innerHTML = `
                <div class="mobile-favorite-header">
                    <h3 class="mobile-favorite-title">${fav.title}</h3>
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
            
            // Add click to expand/collapse
            card.addEventListener('click', (e) => {
                if (e.target.closest('.mobile-delete-favorite-btn') || 
                    e.target.closest('.mobile-star-btn') || 
                    e.target.closest('.mobile-save-note-btn') ||
                    e.target.closest('.mobile-favorite-note')) {
                    return; // Don't expand if clicking on interactive elements
                }
                const details = card.querySelector('.mobile-favorite-details');
                const isVisible = details.style.display !== 'none';
                details.style.display = isVisible ? 'none' : 'block';
                
                // Set up toggle functionality when expanded
                if (!isVisible) {
                    const toggleBtns = details.querySelectorAll('.mobile-recipe-toggle-btn');
                    if (toggleBtns.length > 0) {
                        const contentEl = details.querySelector('.mobile-recipe-content');
                        
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
                }
            });
            
            gridContainer.appendChild(card);
        });
        
        // Add event handlers for mobile favorites
        favoritesContainer.querySelectorAll('.mobile-delete-favorite-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                if (!confirm('Delete this favorite?')) return;
                await fetch(`/api/favorites/${id}`, { method: 'DELETE' });
                showMobileFavoritesScreen(); // refresh
            });
        });
        
        favoritesContainer.querySelectorAll('.mobile-star-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const rating = parseInt(btn.dataset.rating);
                await fetch(`/api/favorites/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rating })
                });
                showMobileFavoritesScreen();
            });
        });
        
        favoritesContainer.querySelectorAll('.mobile-save-note-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const noteEl = favoritesContainer.querySelector(`.mobile-favorite-note[data-id="${id}"]`);
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
        gridContainer.innerHTML = '<p class="mobile-error-favorites">Failed to load favorites.</p>';
    }
}

// ---------------------------
// Start Mobile App
// ---------------------------

async function startMobileApp() {
    console.log('=== DEBUG: Starting Mobile App ===');
    console.log('DEBUG: Current preferences state:', preferences);
    
    await loadUserState();
    console.log('DEBUG: After loadUserState, preferences:', preferences);
    console.log('DEBUG: Current username:', currentUsername);
    
    initializeShuffledVibes();
    showNextMobileCard();
    addMobileHeaderControls();
    
    console.log('=== DEBUG: Mobile App Started ===');
}

// ---------------------------
// Mobile Preferences Screen
// ---------------------------

async function showMobilePreferencesScreen() {
    const mobileContainer = document.getElementById('mobile-container');
    
    // Ensure navigation exists but don't recreate it
    const nav = createMobileNavigation();
    
    if (mobileContainer) {
        mobileContainer.style.display = 'none';
    }
    
    showBackToSwipingButton();
    
    // Create full-screen preferences container
    const preferencesContainer = document.createElement('div');
    preferencesContainer.className = 'mobile-preferences-fullscreen';
    preferencesContainer.innerHTML = `
        <div class="mobile-preferences-header">
            <h2>⚙️ Preferences</h2>
            <button class="mobile-floating-back-btn" id="floatingBackBtn">
                <span class="floating-back-icon">←</span>
                <span class="floating-back-text">Back</span>
            </button>
        </div>
        <div class="mobile-preferences-content">
            <div class="mobile-preference-group">
                <h3>🥗 Diet</h3>
                <div class="mobile-preference-options">
                    <label class="mobile-preference-option">
                        <input type="radio" name="diet" value="None" ${preferences.diet === 'None' ? 'checked' : ''}>
                        <span>No restriction</span>
                    </label>
                    <label class="mobile-preference-option">
                        <input type="radio" name="diet" value="Vegan" ${preferences.diet === 'Vegan' ? 'checked' : ''}>
                        <span>Vegan</span>
                    </label>
                    <label class="mobile-preference-option">
                        <input type="radio" name="diet" value="Vegetarian" ${preferences.diet === 'Vegetarian' ? 'checked' : ''}>
                        <span>Vegetarian</span>
                    </label>
                </div>
            </div>
            
            <div class="mobile-preference-group">
                <h3>💰 Budget</h3>
                <div class="mobile-preference-options">
                    <label class="mobile-preference-option">
                        <input type="radio" name="budget" value="No" ${preferences.budget === 'No' ? 'checked' : ''}>
                        <span>No restriction</span>
                    </label>
                    <label class="mobile-preference-option">
                        <input type="radio" name="budget" value="Yes" ${preferences.budget === 'Yes' ? 'checked' : ''}>
                        <span>Budget-friendly</span>
                    </label>
                </div>
            </div>
            
            <div class="mobile-preference-group">
                <h3>👑 Seasonal King</h3>
                <div class="mobile-preference-options">
                    <label class="mobile-preference-option">
                        <input type="radio" name="seasonalKing" value="No" ${preferences.seasonalKing === 'No' ? 'checked' : ''}>
                        <span>No preference</span>
                    </label>
                    <label class="mobile-preference-option">
                        <input type="radio" name="seasonalKing" value="Yes" ${preferences.seasonalKing === 'Yes' ? 'checked' : ''}>
                        <span>Prioritize seasonal</span>
                    </label>
                </div>
            </div>
            
            <div class="mobile-preference-actions">
                <button class="japandi-btn japandi-btn-primary mobile-save-preferences-btn">💾 Save</button>
            </div>
        </div>
    `;
    document.body.appendChild(preferencesContainer);
    
    // Add floating back button functionality
    const floatingBackBtn = preferencesContainer.querySelector('#floatingBackBtn');
    if (floatingBackBtn) {
        floatingBackBtn.addEventListener('click', () => {
            if (navigator.vibrate) navigator.vibrate(50);
            exitFavoritesView();
        });
    }
    
    // Save preferences button
    preferencesContainer.querySelector('.mobile-save-preferences-btn').addEventListener('click', async () => {
        const selectedDiet = document.querySelector('input[name="diet"]:checked').value;
        const selectedBudget = document.querySelector('input[name="budget"]:checked').value;
        const selectedSeasonal = document.querySelector('input[name="seasonalKing"]:checked').value;
        
        try {
            const res = await fetch('/api/preferences', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    diet: selectedDiet,
                    budget: selectedBudget,
                    seasonalKing: selectedSeasonal
                })
            });
            
            if (!res.ok) throw new Error('Failed to save preferences');
            
            // Update local state
            preferences.diet = selectedDiet;
            preferences.budget = selectedBudget;
            preferences.seasonalKing = selectedSeasonal;
            
            // Haptic feedback
            if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
            
            // Show success message
            const saveBtn = preferencesContainer.querySelector('.mobile-save-preferences-btn');
            const originalText = saveBtn.textContent;
            saveBtn.textContent = '✅ Saved!';
            saveBtn.disabled = true;
            
            setTimeout(() => {
                saveBtn.textContent = originalText;
                saveBtn.disabled = false;
            },2000);
            
        } catch (error) {
            console.error('Save preferences error:', error);
        }
    });
}

// ---------------------------

function addMobileHeaderControls() {
    const header = document.querySelector('.mobile-header');
    
    // Add navigation component directly to body (not header)
    const nav = createMobileNavigation();
    document.body.appendChild(nav);
}

startMobileApp();
