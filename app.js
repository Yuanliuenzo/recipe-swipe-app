// ---------------------------
// Recipe Data
// ---------------------------

const recipes = [
    { name: "Beef Burger", image: "images/burger.png" },
    { name: "Chicken Bowl", image: "images/chicken_bowl.png" },
    { name: "Creamy Pasta", image: "images/creamy_pasta.png" },
    { name: "Ramen", image: "images/ramen.png" },
    { name: "Veggie Stir Fry", image: "images/veggie_stirfry.png" }
];

let scores = {};
recipes.forEach(r => scores[r.name] = 0);

const maxRounds = 5;
let currentRound = 0;

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
// Create Card for Swipe Deck
// ---------------------------

function createCard(recipe) {
    const card = document.createElement("div");
    card.classList.add("card");
    card.style.backgroundImage = `url('${recipe.image}')`;
    card.style.top = `${currentRound * 5}px`;

    const overlay = document.createElement("div");
    overlay.classList.add("overlay");
    overlay.innerText = recipe.name;
    card.appendChild(overlay);

    return card;
}

// ---------------------------
// Shuffle helper
// ---------------------------

function shuffle(array) {
    return array.sort(() => 0.5 - Math.random());
}

// ---------------------------
// Drag & Swipe
// ---------------------------

function initSwipe(card, recipe) {
    let isDragging = false;
    let startX = 0;
    let currentX = 0;

    card.addEventListener("mousedown", e => {
        isDragging = true;
        startX = e.clientX;
        card.style.transition = "none";
    });

    document.addEventListener("mousemove", e => {
        if (!isDragging) return;
        currentX = e.clientX - startX;
        card.style.transform = `translateX(${currentX}px) rotate(${currentX * 0.05}deg)`;

        // Progressive glow based on swipe distance
        const maxDistance = 200;
        const likeIntensity = Math.max(0, Math.min(1, currentX / maxDistance));
        const nopeIntensity = Math.max(0, Math.min(1, -currentX / maxDistance));

        likeGlow.style.opacity = likeIntensity * 0.6; // max 60% opacity
        nopeGlow.style.opacity = nopeIntensity * 0.6; // max 60% opacity
    });

    document.addEventListener("mouseup", () => {
        if (!isDragging) return;
        isDragging = false;
        card.style.transition = "transform 0.3s ease";

        if (currentX > 120) {
            scores[recipe.name]++;
            animateOff(card, 500);
        } else if (currentX < -120) {
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
    if (currentRound >= maxRounds) {
        showResult();
        return;
    }

    currentRound++;
    const recipe = shuffle(recipes)[0];
    const card = createCard(recipe);
    container.appendChild(card);
    initSwipe(card, recipe);
}

// ---------------------------
// Final Result with Flip Card & Sparkles
// ---------------------------

// function showResult() {
//     // Hide swipe deck & title
//     container.style.display = "none";
//     const mainTitle = document.querySelector("h1");
//     if (mainTitle) mainTitle.style.display = "none";
//
//     // Clear and show result container
//     resultEl.innerHTML = ""; // clear static content
//     resultEl.style.display = "flex";
//     resultEl.style.flexDirection = "column";
//     resultEl.style.justifyContent = "center";
//     resultEl.style.alignItems = "center";
//     resultEl.style.height = "100vh";
//     resultEl.style.margin = 0;
//
//     // Determine winner
//     const winner = Object.keys(scores).reduce((a, b) =>
//         scores[a] > scores[b] ? a : b
//     );
//     const recipe = recipes.find(r => r.name === winner);
//
//     // Sparkle container (behind card)
//     const sparkleContainer = document.createElement("div");
//     sparkleContainer.id = "sparkle-container";
//     resultEl.appendChild(sparkleContainer);
//
//     // Flip card wrapper
//     const wrapper = document.createElement("div");
//     wrapper.classList.add("recipe-card-wrapper");
//
//     // Front (winner image)
//     const front = document.createElement("div");
//     front.classList.add("card-face", "front");
//     const cardEl = document.createElement("img");
//     cardEl.src = recipe.image;
//     cardEl.alt = recipe.name;
//     cardEl.id = "winner-card";
//     front.appendChild(cardEl);
//
//     // Back (recipe info)
//     const back = document.createElement("div");
//     back.classList.add("card-face", "back");
//     back.innerHTML = `
//         <h2>${recipe.name}</h2>
//         <p>Check out the recipe! 🍳</p>
//         <a href="https://www.recipetineats.com/vegetable-stir-fry/" target="_blank">View Recipe</a>
//     `;
//
//     wrapper.appendChild(front);
//     wrapper.appendChild(back);
//     resultEl.appendChild(wrapper);
//
//     // Headline below card
//     const headline = document.createElement("div");
//     headline.classList.add("headline");
//     headline.innerText = "🎉 That's What's Cooking! 🎉";
//     resultEl.appendChild(headline);
//
//     // Click to flip
//     wrapper.addEventListener("click", () => {
//         wrapper.classList.toggle("flipped");
//     });
//
//     // Add sparkles around card (detached)
//     cardEl.onload = () => {
//         const rect = cardEl.getBoundingClientRect();
//         const containerRect = resultEl.getBoundingClientRect();
//         const centerX = rect.left - containerRect.left + rect.width / 2;
//         const centerY = rect.top - containerRect.top + rect.height / 2;
//
//         for (let i = 0; i < 40; i++) { // more sparkles
//             const sparkle = document.createElement("div");
//             sparkle.classList.add("sparkle");
//
//             const size = 4 + Math.random() * 16; // more size variation
//             const angle = Math.random() * Math.PI * 2;
//             const radius = 80 + Math.random() * 180; // much more random radius
//
//             const x = centerX + radius * Math.cos(angle) - size/2;
//             const y = centerY + radius * Math.sin(angle) - size/2;
//
//             sparkle.style.left = `${x}px`;
//             sparkle.style.top = `${y}px`;
//             sparkle.style.width = `${size}px`;
//             sparkle.style.height = `${size}px`;
//             sparkle.style.transform = `rotate(${Math.random() * 360}deg)`;
//             sparkle.style.animationDelay = `${Math.random() * 2}s`; // more random delay
//             sparkle.style.animationDuration = `${1.5 + Math.random() * 1.5}s`; // random duration
//
//             sparkleContainer.appendChild(sparkle);
//         }
//     };
// }

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

async function showResult() {
    // Hide swipe deck & title
    container.style.display = "none";
    document.querySelector("h1").style.display = "none";

    // Clear and show result container
    resultEl.innerHTML = ""; // clear static content
    resultEl.style.display = "flex";
    resultEl.style.flexDirection = "column";
    resultEl.style.justifyContent = "center";
    resultEl.style.alignItems = "center";
    resultEl.style.height = "100vh";
    resultEl.style.margin = 0;

    // Determine winner
    const winner = Object.keys(scores).reduce((a,b) => scores[a] > scores[b] ? a : b);
    const recipe = recipes.find(r => r.name === winner);

    // Sparkle container (behind card)
    const sparkleContainer = document.createElement("div");
    sparkleContainer.id = "sparkle-container";
    resultEl.appendChild(sparkleContainer);

    // Flip card wrapper
    const wrapper = document.createElement("div");
    wrapper.classList.add("recipe-card-wrapper");

    // Front (winner image)
    const front = document.createElement("div");
    front.classList.add("card-face", "front");
    const cardEl = document.createElement("img");
    cardEl.src = recipe.image;
    cardEl.alt = recipe.name;
    cardEl.id = "winner-card";
    front.appendChild(cardEl);

    // Back (recipe info)
    const back = document.createElement("div");
    back.classList.add("card-face", "back");
    back.innerHTML = `
        <h2>${recipe.name}</h2>
        <p>Ready to discover a delicious recipe? Click the button below to generate one with AI!</p>
        <button class="generate-btn" data-recipe="${recipe.name}">🍳 Generate Recipe</button>
        <a href="https://www.recipetineats.com/vegetable-stir-fry/" target="_blank">View Recipe</a>
    `;

    // Add event listener to the generate button
    const generateBtn = back.querySelector('.generate-btn');
    generateBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent card flip
        generateRecipe(recipe.name);
    });

    wrapper.appendChild(front);
    wrapper.appendChild(back);
    resultEl.appendChild(wrapper);

    // Headline below card
    const headline = document.createElement("div");
    headline.classList.add("headline");
    headline.innerText = "🎉 That's What's Cooking! 🎉";
    resultEl.appendChild(headline);

    // Click to flip
    wrapper.addEventListener("click", () => wrapper.classList.toggle("flipped"));

    // Add sparkles around card (detached)
    cardEl.onload = () => {
        const rect = cardEl.getBoundingClientRect();
        const containerRect = resultEl.getBoundingClientRect();
        const centerX = rect.left - containerRect.left + rect.width / 2;
        const centerY = rect.top - containerRect.top + rect.height / 2;

        for (let i = 0; i < 40; i++) { // more sparkles
            const sparkle = document.createElement("div");
            sparkle.classList.add("sparkle");

            const size = 4 + Math.random() * 16; // more size variation
            const angle = Math.random() * Math.PI * 2;
            const radius = 80 + Math.random() * 180; // much more random radius

            const x = centerX + radius * Math.cos(angle) - size/2;
            const y = centerY + radius * Math.sin(angle) - size/2;

            sparkle.style.left = `${x}px`;
            sparkle.style.top = `${y}px`;
            sparkle.style.width = `${size}px`;
            sparkle.style.height = `${size}px`;
            sparkle.style.transform = `rotate(${Math.random() * 360}deg)`;
            sparkle.style.animationDelay = `${Math.random() * 2}s`; // more random delay
            sparkle.style.animationDuration = `${1.5 + Math.random() * 1.5}s`; // random duration

            sparkleContainer.appendChild(sparkle);
        }
    };
}

// Function to format recipe text with better HTML structure
function formatRecipeText(recipeText) {
    let formatted = recipeText;
    
    // Split into sections
    const sections = formatted.split('\n\n');
    let html = '';
    
    for (let section of sections) {
        if (section.includes('Ingredients:')) {
            const ingredients = section.replace('Ingredients:', '').trim();
            const ingredientList = ingredients.split('\n').filter(item => item.trim());
            
            html += `
                <div class="recipe-section">
                    <h3>🥘 Ingredients</h3>
                    <ul class="ingredients-list">
                        ${ingredientList.map(item => `<li>${item.replace(/^[-•]\s*/, '')}</li>`).join('')}
                    </ul>
                </div>
            `;
        } else if (section.includes('Instructions:')) {
            const instructions = section.replace('Instructions:', '').trim();
            const instructionList = instructions.split('\n').filter(item => item.trim());
            
            html += `
                <div class="recipe-section">
                    <h3>👨‍🍳 Instructions</h3>
                    <ol class="instructions-list">
                        ${instructionList.map(item => `<li>${item.replace(/^\d+\.\s*/, '')}</li>`).join('')}
                    </ol>
                </div>
            `;
        } else if (section.trim() && !section.includes('===')) {
            // Handle any other content
            html += `<div class="recipe-intro">${section}</div>`;
        }
    }
    
    return html || `<p>${recipeText}</p>`;
}

// Global function to generate recipe
async function generateRecipe(recipeName) {
    console.log("generateRecipe called for:", recipeName);
    
    const back = document.querySelector('.card-face.back');
    const button = back.querySelector('.generate-btn');
    
    if (!back || !button) {
        console.error("Could not find back or button");
        return;
    }
    
    // Show loading state with spinner
    button.innerHTML = '<span class="loading-spinner"></span> Generating... (this may take 30+ seconds)';
    button.disabled = true;
    
    try {
        const prompt = `Write me a clear, well-formatted recipe for ${recipeName}. 
Please structure it exactly like this:

${recipeName}
===

Ingredients:
• [ingredient 1]
• [ingredient 2]
• [ingredient 3]

Instructions:
1. [step 1]
2. [step 2]
3. [step 3]

Keep it concise but complete. Use bullet points for ingredients and numbered steps for instructions.`;
        console.log("Sending prompt:", prompt);
        
        // Add timeout to handle slow Ollama responses
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout - Ollama is taking too long')), 60000) // 60 second timeout
        );
        
        const recipeText = await Promise.race([
            fetchLocalRecipe(prompt),
            timeoutPromise
        ]);
        
        console.log("Got recipe text successfully");

        // Format the recipe text with better HTML structure
        const formattedRecipe = formatRecipeText(recipeText);

        // Update the back content with generated recipe
        back.innerHTML = `
            <h2>${recipeName}</h2>
            <div class="recipe-content">${formattedRecipe}</div>
            <a href="https://www.recipetineats.com/vegetable-stir-fry/" target="_blank">View Recipe</a>
        `;

        // Add animation for content
        back.querySelector('h2').style.opacity = 1;
        back.querySelector('p').style.opacity = 1;
        back.querySelector('a').style.opacity = 1;
        
    } catch (error) {
        console.error("Failed to fetch recipe:", error);
        button.textContent = 'Try Again';
        button.disabled = false;
    }
}


// ---------------------------
// Start
// ---------------------------

showNextCard();
