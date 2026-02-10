const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const fs = require('fs').promises;
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Add logging middleware
app.use((req, res, next) => {
    const userAgent = req.headers['user-agent'] || '';
    const forwardedFor = req.headers['x-forwarded-for'] || '';
    console.log(`${req.method} ${req.url} | ip=${req.ip} xff=${forwardedFor} | ua=${userAgent}`);
    next();
});

// Detect mobile user agents
function isMobile(req) {
    const userAgent = req.headers['user-agent'] || '';
    return /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
}

// File-based user store
const USERS_FILE = path.join(__dirname, 'src', 'data', 'users.json');
let users = new Map();

// Load users from file on startup
async function loadUsers() {
    try {
        const data = await fs.readFile(USERS_FILE, 'utf8');
        const usersData = JSON.parse(data);
        users = new Map(Object.entries(usersData));
        console.log(`Loaded ${users.size} users from file`);
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error('Error loading users:', error);
        }
        users = new Map();
    }
}

// Save users to file
async function saveUsers() {
    try {
        const usersData = Object.fromEntries(users);
        await fs.writeFile(USERS_FILE, JSON.stringify(usersData, null, 2));
    } catch (error) {
        console.error('Error saving users:', error);
    }
}

// Predefined accounts (you can modify these)
const PREDEFINED_ACCOUNTS = [
    { username: 'yuan', password: 'recipe123' },
    { username: 'oscar', password: 'cooking456' },
    { username: 'annie', password: 'food789' },
    { username: 'bram', password: 'chef321' },
    { username: 'elisa', password: 'tasty654' }
];

// Initialize predefined accounts
async function initializeAccounts() {
    for (const account of PREDEFINED_ACCOUNTS) {
        if (!users.has(account.username)) {
            const passwordHash = await bcrypt.hash(account.password, 10);
            users.set(account.username, {
                passwordHash,
                vibeProfile: [],
                ingredientsAtHome: '',
                favorites: [],
                preferences: {
                    diet: 'None',
                    budget: 'No',
                    seasonalKing: 'No'
                },
                createdAt: new Date().toISOString(),
                lastLogin: null
            });
        }
    }
    await saveUsers();
    console.log('Initialized predefined accounts');
}

// Helper to get user by username
function getUser(username) {
    return users.get(username);
}

// Helper to update user and save to file
async function updateUser(username, updates) {
    const user = users.get(username);
    if (user) {
        Object.assign(user, updates);
        await saveUsers();
        return user;
    }
    return null;
}

// Middleware to load user from cookie
app.use(async (req, res, next) => {
    const username = req.cookies?.profile;
    console.log('=== DEBUG: Middleware - Cookie check ===');
    console.log('DEBUG: Username from cookie:', username);
    
    if (username) {
        req.user = getUser(username);
        console.log('DEBUG: User found:', !!req.user);
    }
    next();
});

app.get('/debug/ua', (req, res) => {
    res.json({
        userAgent: req.headers['user-agent'] || '',
        isMobile: isMobile(req)
    });
});

app.get("/", (req, res) => {
    console.log("GET / called from:", req.headers['user-agent']);
    
    if (req.user) {
        // User already selected a profile; serve the app
        if (isMobile(req)) {
            console.log("Serving mobile version");
            res.sendFile(path.join(__dirname, 'public', 'mobile.html'));
        } else {
            console.log("Serving desktop version");
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        }
    } else {
        // No profile cookie; show picker
        res.sendFile(path.join(__dirname, 'public', 'profile-picker.html'));
    }
});

app.post('/login', async (req, res) => {
    console.log('=== DEBUG: Login attempt ===');
    console.log('DEBUG: Request body:', req.body);
    console.log('DEBUG: Request cookies:', req.cookies);
    
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    
    const user = getUser(username);
    if (!user) {
        console.log('DEBUG: User not found:', username);
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValid = await bcrypt.compare(password, user.passwordHash);
    console.log('DEBUG: Password validation result:', isValid);
    
    if (!isValid) {
        console.log('DEBUG: Invalid password for user:', username);
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Update last login
    await updateUser(username, { lastLogin: new Date().toISOString() });
    console.log('DEBUG: Updated last login for:', username);
    
    console.log('DEBUG: Setting cookie with profile:', username);
    res.cookie('profile', username, { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true });
    console.log('DEBUG: Cookie set response headers:', res.getHeaders());
    res.json({ username });
});

app.post('/logout', (req, res) => {
    res.clearCookie('profile');
    res.json({ ok: true });
});

app.post("/set-profile", (req, res) => {
    return res.status(410).json({ error: 'This endpoint is deprecated. Please use /login instead.' });
});

app.get("/api/me", (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: "Not logged in" });
    }
    res.json({
        username: req.cookies.profile,
        vibeProfile: req.user.vibeProfile,
        ingredientsAtHome: req.user.ingredientsAtHome,
        favorites: req.user.favorites,
        preferences: req.user.preferences || {
            diet: 'None',
            budget: 'No',
            seasonalKing: 'No'
        },
        createdAt: req.user.createdAt,
        lastLogin: req.user.lastLogin
    });
});

app.get("/api/favorites", (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: "Not logged in" });
    }
    res.json({ favorites: req.user.favorites });
});

app.post("/api/favorites", async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: "Not logged in" });
    }
    const { recipeText, title, rating, note } = req.body;
    if (!recipeText || !title) {
        return res.status(400).json({ error: "Missing recipeText or title" });
    }
    const favorite = {
        id: Date.now().toString(),
        recipeText,
        title: title.trim(),
        rating: rating ?? null,
        note: note ?? null,
        createdAt: new Date().toISOString()
    };
    req.user.favorites.unshift(favorite); // newest first
    if (req.user.favorites.length > 20) req.user.favorites.pop(); // cap at 20
    await saveUsers(); // Save to file
    res.json({ favorite });
});

app.delete("/api/favorites/:id", async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: "Not logged in" });
    }
    const { id } = req.params;
    const idx = req.user.favorites.findIndex(f => f.id === id);
    if (idx === -1) {
        return res.status(404).json({ error: "Favorite not found" });
    }
    req.user.favorites.splice(idx, 1);
    await saveUsers(); // Save to file
    res.json({ ok: true });
});

app.patch("/api/favorites/:id", async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: "Not logged in" });
    }
    const { id } = req.params;
    const { rating, note } = req.body;
    const fav = req.user.favorites.find(f => f.id === id);
    if (!fav) {
        return res.status(404).json({ error: "Favorite not found" });
    }
    if (typeof rating === 'number') fav.rating = rating;
    if (typeof note === 'string') fav.note = note.trim();
    await saveUsers(); // Save to file
    res.json({ favorite: fav });
});

// Preferences API endpoints
app.get("/api/preferences", (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: "Not logged in" });
    }
    res.json({ preferences: req.user.preferences || {
        diet: 'None',
        budget: 'No',
        seasonalKing: 'No'
    } });
});

app.patch("/api/preferences", async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: "Not logged in" });
    }
    const { diet, budget, seasonalKing } = req.body;
    
    const currentPrefs = req.user.preferences || {
        diet: 'None',
        budget: 'No',
        seasonalKing: 'No'
    };
    
    const updatedPrefs = {
        diet: diet || currentPrefs.diet,
        budget: budget || currentPrefs.budget,
        seasonalKing: seasonalKing || currentPrefs.seasonalKing
    };
    
    await updateUser(req.cookies.profile, { preferences: updatedPrefs });
    res.json({ preferences: updatedPrefs });
});

// Serve static files from public directory (must be after / routing)
app.use(express.static(path.join(__dirname, 'public')));
// Serve source files for ES6 modules
app.use('/src', express.static(path.join(__dirname, 'src')));

app.post('/api/generateRecipe', async (req, res) => {
    console.log("POST /api/generateRecipe called with body:", req.body);
    
    try {
        console.log("Calling Ollama with prompt:", req.body.prompt);

        const response = await fetch('http://127.0.0.1:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: "mistral:latest",
                prompt: req.body.prompt || "Write me a recipe for a hungover day.",
                stream: false
            })
        });

        const data = await response.json();

        console.log("Ollama responded");

        res.json({ recipe: data.response });

    } catch (error) {
        console.error("Error details:", error);
        res.status(500).json({ error: "Something went wrong", details: error.message });
    }
});

// 404 handler
app.use((req, res) => {
    console.log("404 for:", req.method, req.url);
    res.status(404).json({ error: "Not found", url: req.url });
});

// Initialize server
async function startServer() {
    await loadUsers();
    await initializeAccounts();
    
    app.listen(3000, '0.0.0.0', () => {
        console.log("Server running on http://0.0.0.0:3000");
        console.log("Access from your network: http://YOUR_LOCAL_IP:3000");
    });
}

startServer().catch(console.error);
