import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import * as gateway from "./ai/gateway.js";
import { ollamaEmbed } from "./ai/providers/ollama.js";
import { extractJSON } from "./src/utils/LLMUtils.js";
import { stats as cacheStats } from "./ai/cache.js";
import db from "./db/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set("trust proxy", 1); // trust Cloudflare / nginx X-Forwarded-Proto
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Logging middleware
app.use((req, res, next) => {
  const forwardedFor = req.headers["x-forwarded-for"] || "";
  console.log(
    `${req.method} ${req.url} | ip=${req.ip} xff=${forwardedFor} | ua=${req.headers["user-agent"] || ""}`
  );
  next();
});

// Session lifetime: 30 days
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

// Normalize a DB favorite row to the shape the frontend expects (camelCase)
function normalizeFavorite(row) {
  let recipeText = row.recipe_text;
  // Migrated rows are JSON-stringified objects — parse them back
  if (typeof recipeText === "string" && recipeText.startsWith("{")) {
    try {
      recipeText = JSON.parse(recipeText);
    } catch {
      // leave as string if parsing fails
    }
  }
  return {
    id: row.id,
    title: row.title,
    recipeText,
    rating: row.rating,
    note: row.note,
    createdAt: row.created_at
  };
}

// Predefined accounts — created on first startup if missing
const PREDEFINED_ACCOUNTS = [
  { username: "yuan", password: "recipe123" },
  { username: "oscar", password: "cooking456" },
  { username: "annie", password: "food789" },
  { username: "bram", password: "chef321" },
  { username: "elisa", password: "tasty654" }
];

function initializeAccounts() {
  const insertUser = db.prepare(
    "INSERT OR IGNORE INTO users (username, password_hash) VALUES (?, ?)"
  );
  const insertPrefs = db.prepare(
    "INSERT OR IGNORE INTO preferences (username) VALUES (?)"
  );

  for (const account of PREDEFINED_ACCOUNTS) {
    const exists = db
      .prepare("SELECT 1 FROM users WHERE username = ?")
      .get(account.username);
    if (!exists) {
      const hash = bcrypt.hashSync(account.password, 10);
      insertUser.run(account.username, hash);
      insertPrefs.run(account.username);
      console.log(`Created account: ${account.username}`);
    }
  }
}

function cleanExpiredSessions() {
  const { changes } = db
    .prepare("DELETE FROM sessions WHERE expires_at <= ?")
    .run(new Date().toISOString());
  if (changes > 0) {
    console.log(`Cleaned ${changes} expired session(s)`);
  }
}

// ─── Auth middleware ──────────────────────────────────────────────────────────
// Looks up the session ID from the cookie, attaches user + prefs to req.
app.use((req, res, next) => {
  const sessionId = req.cookies?.sid;
  if (!sessionId) {
    return next();
  }

  const session = db
    .prepare("SELECT username FROM sessions WHERE id = ? AND expires_at > ?")
    .get(sessionId, new Date().toISOString());

  if (!session) {
    return next();
  }

  req.user = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(session.username);

  req.prefs = db
    .prepare("SELECT * FROM preferences WHERE username = ?")
    .get(session.username) ?? {
    diet: "None",
    budget: "No",
    seasonal_king: "No"
  };

  req.username = session.username;
  next();
});

// ─── Routes ──────────────────────────────────────────────────────────────────

app.get("/", (req, res) => {
  // Never cache this route — it switches between login and app based on session
  res.set("Cache-Control", "no-store");
  if (req.user) {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  } else {
    res.sendFile(path.join(__dirname, "public", "profile-picker.html"));
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  const user = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username);

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Update last login
  db.prepare("UPDATE users SET last_login = ? WHERE username = ?").run(
    new Date().toISOString(),
    username
  );

  // Create session
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS).toISOString();
  db.prepare(
    "INSERT INTO sessions (id, username, expires_at) VALUES (?, ?, ?)"
  ).run(sessionId, username, expiresAt);

  const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
  res.cookie("sid", sessionId, {
    maxAge: SESSION_MAX_AGE_MS,
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps
  });

  res.json({ username });
});

app.post("/logout", (req, res) => {
  const sessionId = req.cookies?.sid;
  if (sessionId) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
  }
  // Attributes must match the original Set-Cookie for browsers (especially Safari) to accept the clear
  const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
  res.clearCookie("sid", { httpOnly: true, sameSite: "lax", secure: isHttps });
  res.json({ ok: true });
});

app.post("/set-profile", (_req, res) => {
  res.status(410).json({ error: "Deprecated. Use /login instead." });
});

// ─── User data ────────────────────────────────────────────────────────────────

app.get("/api/me", (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const favorites = db
    .prepare(
      "SELECT * FROM favorites WHERE username = ? ORDER BY created_at DESC"
    )
    .all(req.username)
    .map(normalizeFavorite);

  res.json({
    username: req.username,
    favorites,
    preferences: {
      diet: req.prefs.diet,
      budget: req.prefs.budget,
      seasonalKing: req.prefs.seasonal_king
    },
    createdAt: req.user.created_at,
    lastLogin: req.user.last_login
  });
});

// ─── Favorites ────────────────────────────────────────────────────────────────

app.get("/api/favorites", (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const favorites = db
    .prepare(
      "SELECT * FROM favorites WHERE username = ? ORDER BY created_at DESC"
    )
    .all(req.username)
    .map(normalizeFavorite);

  res.json({ favorites });
});

app.post("/api/favorites", (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const { recipeText, title, rating, note } = req.body;
  if (!recipeText || !title) {
    return res.status(400).json({ error: "Missing recipeText or title" });
  }

  // Enforce 20-favorite cap — evict oldest if needed
  const count = db
    .prepare("SELECT COUNT(*) as n FROM favorites WHERE username = ?")
    .get(req.username).n;

  if (count >= 20) {
    const oldest = db
      .prepare(
        "SELECT id FROM favorites WHERE username = ? ORDER BY created_at ASC LIMIT 1"
      )
      .get(req.username);
    db.prepare("DELETE FROM favorites WHERE id = ?").run(oldest.id);
  }

  // Store objects as JSON strings
  const recipeTextStored =
    typeof recipeText === "object" ? JSON.stringify(recipeText) : recipeText;

  const id = randomUUID();
  db.prepare(
    "INSERT INTO favorites (id, username, title, recipe_text, rating, note) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(
    id,
    req.username,
    title.trim(),
    recipeTextStored,
    rating ?? null,
    note ?? null
  );

  const favorite = normalizeFavorite(
    db.prepare("SELECT * FROM favorites WHERE id = ?").get(id)
  );

  res.json({ favorite });
});

app.delete("/api/favorites/:id", (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const { changes } = db
    .prepare("DELETE FROM favorites WHERE id = ? AND username = ?")
    .run(req.params.id, req.username);

  if (changes === 0) {
    return res.status(404).json({ error: "Favorite not found" });
  }

  res.json({ ok: true });
});

app.patch("/api/favorites/:id", (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const fav = db
    .prepare("SELECT * FROM favorites WHERE id = ? AND username = ?")
    .get(req.params.id, req.username);

  if (!fav) {
    return res.status(404).json({ error: "Favorite not found" });
  }

  const { rating, note } = req.body;
  db.prepare("UPDATE favorites SET rating = ?, note = ? WHERE id = ?").run(
    typeof rating === "number" ? rating : fav.rating,
    typeof note === "string" ? note.trim() : fav.note,
    req.params.id
  );

  const updated = normalizeFavorite(
    db.prepare("SELECT * FROM favorites WHERE id = ?").get(req.params.id)
  );

  res.json({ favorite: updated });
});

// ─── Preferences ──────────────────────────────────────────────────────────────

app.get("/api/preferences", (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not logged in" });
  }

  res.json({
    preferences: {
      diet: req.prefs.diet,
      budget: req.prefs.budget,
      seasonalKing: req.prefs.seasonal_king
    }
  });
});

app.patch("/api/preferences", (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const { diet, budget, seasonalKing } = req.body;
  const p = req.prefs;

  db.prepare(
    "UPDATE preferences SET diet = ?, budget = ?, seasonal_king = ? WHERE username = ?"
  ).run(
    diet || p.diet,
    budget || p.budget,
    seasonalKing || p.seasonal_king,
    req.username
  );

  res.json({
    preferences: {
      diet: diet || p.diet,
      budget: budget || p.budget,
      seasonalKing: seasonalKing || p.seasonal_king
    }
  });
});

// ─── Static files ─────────────────────────────────────────────────────────────

app.use(express.static(path.join(__dirname, "public")));
app.use("/src", express.static(path.join(__dirname, "src")));

// ─── LLM ──────────────────────────────────────────────────────────────────────

// Non-streaming: used for suggestions (needs complete JSON before parsing)
app.post("/api/generateRecipe", async (req, res) => {
  console.log(`POST /api/generateRecipe [${gateway.activeProvider()}]`);
  try {
    const { prompt, suggestions, count } = req.body;

    if (suggestions) {
      // Suggestions need full JSON — use non-streaming complete with cache
      const countVal = count || 5;
      const fullPrompt = `${prompt}

Please respond with exactly ${countVal} suggestions in JSON format:
{
  "suggestions": [
    { "title": "Recipe Title 1", "description": "Brief explanation" },
    { "title": "Recipe Title 2", "description": "Brief explanation" }
  ]
}`;
      const text = await gateway.complete(fullPrompt, { timeout: 60000 });
      const json = extractJSON(text);
      res.json(JSON.parse(json));
    } else {
      // Single recipe — also non-streaming path (client uses /api/streamRecipe for SSE)
      const text = await gateway.complete(prompt, { timeout: 90000 });
      res.json({ recipe: text });
    }
  } catch (error) {
    console.error("❌ LLM error:", error);
    res
      .status(500)
      .json({ error: "Something went wrong", details: error.message });
  }
});

// Streaming: used for full recipe text — tokens arrive in real time
app.post("/api/streamRecipe", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not logged in" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  console.log(`POST /api/streamRecipe [${gateway.activeProvider()}]`);

  try {
    for await (const token of gateway.streamTokens(req.body.prompt, {
      timeout: 90000
    })) {
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    }
    res.write("data: [DONE]\n\n");
  } catch (error) {
    console.error("❌ Stream error:", error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
  } finally {
    res.end();
  }
});

// ─── Restaurants ──────────────────────────────────────────────────────────────

// Module-level embedding cache — loaded once, reused on every search request
let _restaurantCache = null;

function loadRestaurantCache() {
  if (_restaurantCache) {
    return _restaurantCache;
  }
  const rows = db
    .prepare(
      "SELECT id, name, cuisine, lat, lng, address, neighborhood, description, embedding FROM restaurants"
    )
    .all();
  _restaurantCache = rows
    .filter(r => r.embedding)
    .map(r => ({
      id: r.id,
      name: r.name,
      cuisine: r.cuisine,
      lat: r.lat,
      lng: r.lng,
      address: r.address,
      neighborhood: r.neighborhood,
      description: r.description,
      embedding: new Float32Array(
        r.embedding.buffer,
        r.embedding.byteOffset,
        r.embedding.byteLength / 4
      )
    }));
  console.log(
    `🗂️  Loaded ${_restaurantCache.length} restaurant embeddings into cache`
  );
  return _restaurantCache;
}

function cosineSimilarity(a, b) {
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// Amsterdam neighborhood centers — used by both /search and /refine
const NEIGHBORHOODS = [
  { name: "Centrum", center: [52.3728, 4.8936], radius: 1200 },
  { name: "Jordaan", center: [52.3752, 4.8826], radius: 800 },
  { name: "De Pijp", center: [52.354, 4.8971], radius: 900 },
  { name: "Oud-West", center: [52.3639, 4.8737], radius: 900 },
  { name: "Oud-Zuid", center: [52.3465, 4.872], radius: 1000 },
  { name: "Oost", center: [52.3618, 4.9257], radius: 1200 },
  { name: "Noord", center: [52.4007, 4.9236], radius: 1500 },
  { name: "Westerpark", center: [52.3855, 4.8682], radius: 900 },
  { name: "De Baarsjes", center: [52.3692, 4.858], radius: 800 },
  { name: "Watergraafsmeer", center: [52.3497, 4.9365], radius: 1000 }
];

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function vibeProfileToQueryText(vibeProfile) {
  if (!vibeProfile?.length) {
    return "cozy warm restaurant Amsterdam";
  }
  return vibeProfile
    .map(v => {
      const tags = v.tags || {};
      const parts = [
        v.label || "",
        ...(tags.mood || []),
        ...(tags.flavor || []),
        ...(tags.style || [])
      ];
      return parts.join(" ");
    })
    .join(". ");
}

app.post("/api/restaurants/search", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const { vibeProfile = [], neighborhood = null } = req.body;
  const queryText = vibeProfileToQueryText(vibeProfile);

  let queryEmbedding;
  try {
    queryEmbedding = await ollamaEmbed(queryText);
  } catch (err) {
    console.error("❌ Embedding failed:", err.message);
    return res
      .status(503)
      .json({
        error:
          "Embedding service unavailable. Make sure Ollama is running with nomic-embed-text."
      });
  }

  let pool = loadRestaurantCache();

  if (pool.length === 0) {
    return res.json({
      restaurants: [],
      total: 0,
      message:
        "No restaurants indexed yet. Run: node scripts/ingest-restaurants.js"
    });
  }

  // Apply neighborhood geo-filter upfront if questionnaire set one
  if (neighborhood) {
    const n = NEIGHBORHOODS.find(x => x.name === neighborhood);
    if (n) {
      pool = pool.filter(
        r =>
          haversineKm(r.lat, r.lng, n.center[0], n.center[1]) * 1000 <= n.radius
      );
    }
  }

  const scored = pool.map(r => ({
    id: r.id,
    name: r.name,
    cuisine: r.cuisine,
    lat: r.lat,
    lng: r.lng,
    address: r.address,
    neighborhood: r.neighborhood,
    description: r.description,
    score: cosineSimilarity(queryEmbedding, r.embedding)
  }));

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 15);

  res.json({ restaurants: top, total: pool.length, queryText, neighborhood });
});

app.get("/api/restaurants/explain/:id", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const restaurant = db
    .prepare("SELECT * FROM restaurants WHERE id = ?")
    .get(req.params.id);
  if (!restaurant) {
    return res.status(404).json({ error: "Restaurant not found" });
  }

  const vibeProfile = JSON.parse(req.query.vibes || "[]");
  const vibeText = vibeProfileToQueryText(vibeProfile);

  const prompt = `You are a warm restaurant advisor. In 2–3 short sentences, explain why ${restaurant.name} (${restaurant.cuisine || "restaurant"} in Amsterdam) is a great match for someone who is feeling: ${vibeText || "looking for a good meal"}.

Be specific about the restaurant's character and atmosphere. Be warm and inviting. Don't use filler phrases like "This restaurant is perfect for you".`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    for await (const token of gateway.streamTokens(prompt, {
      timeout: 30000
    })) {
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    }
    res.write("data: [DONE]\n\n");
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  } finally {
    res.end();
  }
});

// Browse all restaurants — paginated, no embedding required
app.get("/api/restaurants/all", (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const limit = Math.min(parseInt(req.query.limit) || 30, 100);
  const offset = parseInt(req.query.offset) || 0;

  const { total } = db
    .prepare("SELECT COUNT(*) AS total FROM restaurants")
    .get();
  const rows = db
    .prepare(
      "SELECT id, name, cuisine, lat, lng, address, neighborhood FROM restaurants ORDER BY name LIMIT ? OFFSET ?"
    )
    .all(limit, offset);

  res.json({
    restaurants: rows,
    total,
    limit,
    offset,
    hasMore: offset + rows.length < total
  });
});

// Hybrid retrieval: NL query → slot extraction + semantic re-ranking with optional filters
app.post("/api/restaurants/refine", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const {
    vibeProfile = [],
    nlQuery = "",
    neighborhood = null,
    cuisine = null
  } = req.body;

  // Build combined query: questionnaire context + NL text
  const baseText = vibeProfileToQueryText(vibeProfile);
  const combinedQuery = [baseText, nlQuery].filter(Boolean).join(". ");

  let queryEmbedding;
  try {
    queryEmbedding = await ollamaEmbed(combinedQuery);
  } catch {
    return res.status(503).json({ error: "Embedding service unavailable." });
  }

  let pool = loadRestaurantCache();

  // Apply neighborhood geo-filter
  if (neighborhood) {
    const n = NEIGHBORHOODS.find(x => x.name === neighborhood);
    if (n) {
      pool = pool.filter(
        r =>
          haversineKm(r.lat, r.lng, n.center[0], n.center[1]) * 1000 <= n.radius
      );
    }
  }

  // Apply cuisine string filter
  if (cuisine) {
    const lc = cuisine.toLowerCase();
    const cuisineFiltered = pool.filter(
      r => r.cuisine && r.cuisine.toLowerCase().includes(lc)
    );
    // Only apply if it yields results; otherwise keep the full pool
    if (cuisineFiltered.length > 0) {
      pool = cuisineFiltered;
    }
  }

  // Score and rank
  const scored = pool.map(r => ({
    id: r.id,
    name: r.name,
    cuisine: r.cuisine,
    lat: r.lat,
    lng: r.lng,
    address: r.address,
    neighborhood: r.neighborhood,
    description: r.description,
    score: cosineSimilarity(queryEmbedding, r.embedding)
  }));

  scored.sort((a, b) => b.score - a.score);
  res.json({
    restaurants: scored.slice(0, 10),
    total: pool.length,
    nlQuery,
    neighborhood,
    cuisine
  });
});

app.get("/api/restaurants/status", (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not logged in" });
  }
  const count = db.prepare("SELECT COUNT(*) as n FROM restaurants").get().n;
  const withEmbeddings = db
    .prepare(
      "SELECT COUNT(*) as n FROM restaurants WHERE embedding IS NOT NULL"
    )
    .get().n;
  res.json({ total: count, withEmbeddings });
});

// ─── Health ───────────────────────────────────────────────────────────────────

app.get("/api/health", (req, res) => {
  const sessionCount = db
    .prepare("SELECT COUNT(*) as n FROM sessions WHERE expires_at > ?")
    .get(new Date().toISOString()).n;

  res.json({
    ok: true,
    time: new Date().toISOString(),
    proto: req.headers["x-forwarded-proto"] || "http",
    secure: req.secure,
    activeSessions: sessionCount,
    llmProvider: gateway.activeProvider(),
    cache: cacheStats(),
    ua: req.headers["user-agent"]
  });
});

// ─── 404 ──────────────────────────────────────────────────────────────────────

app.use((req, res) => {
  console.log("404:", req.method, req.url);
  res.status(404).json({ error: "Not found", url: req.url });
});

// ─── Start ────────────────────────────────────────────────────────────────────

function startServer() {
  initializeAccounts();
  cleanExpiredSessions();

  app.listen(3000, "0.0.0.0", () => {
    console.log("Server running on http://0.0.0.0:3000");
  });
}

startServer();
