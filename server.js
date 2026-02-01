const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');

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

// In-memory user store
const users = new Map();

// Helper to get or create user
function getOrCreateUser(username) {
    if (!users.has(username)) {
        users.set(username, {
            vibeProfile: [],
            ingredientsAtHome: '',
            favorites: []
        });
    }
    return users.get(username);
}

// Middleware to load user from cookie
app.use((req, res, next) => {
    const username = req.cookies?.profile;
    if (username) {
        req.user = getOrCreateUser(username);
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
            res.sendFile(path.join(__dirname, 'mobile.html'));
        } else {
            console.log("Serving desktop version");
            res.sendFile(path.join(__dirname, 'index.html'));
        }
    } else {
        // No profile cookie; show picker
        res.sendFile(path.join(__dirname, 'profile-picker.html'));
    }
});

app.post("/set-profile", (req, res) => {
    const { username } = req.body;
    if (!username || typeof username !== 'string' || username.trim().length === 0) {
        return res.status(400).json({ error: "Invalid username" });
    }
    const clean = username.trim().slice(0, 30); // simple limit
    getOrCreateUser(clean); // ensure user exists
    res.cookie('profile', clean, { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true }); // 30 days
    res.json({ username: clean });
});

app.get("/api/me", (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: "Not logged in" });
    }
    res.json({
        username: req.cookies.profile,
        vibeProfile: req.user.vibeProfile,
        ingredientsAtHome: req.user.ingredientsAtHome,
        favorites: req.user.favorites
    });
});

app.get("/api/favorites", (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: "Not logged in" });
    }
    res.json({ favorites: req.user.favorites });
});

app.post("/api/favorites", (req, res) => {
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
    if (req.user.favorites.length > 50) req.user.favorites.pop(); // cap
    res.json({ favorite });
});

app.delete("/api/favorites/:id", (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: "Not logged in" });
    }
    const { id } = req.params;
    const idx = req.user.favorites.findIndex(f => f.id === id);
    if (idx === -1) {
        return res.status(404).json({ error: "Favorite not found" });
    }
    req.user.favorites.splice(idx, 1);
    res.json({ ok: true });
});

app.patch("/api/favorites/:id", (req, res) => {
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
    res.json({ favorite: fav });
});

// Serve static files from current directory (must be after / routing)
app.use(express.static(path.join(__dirname)));

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

app.listen(3000, '0.0.0.0', () => {
    console.log("Server running on http://0.0.0.0:3000");
    console.log("Access from your network: http://YOUR_LOCAL_IP:3000");
});
