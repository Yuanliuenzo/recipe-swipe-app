const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from current directory
app.use(express.static(path.join(__dirname)));

// Add logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

app.get("/", (req, res) => {
    console.log("GET / called");
    res.sendFile(path.join(__dirname, 'index.html'));
});

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

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
