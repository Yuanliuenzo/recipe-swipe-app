import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { llmService } from "./src/core/LLMService.js";
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

app.post("/api/generateRecipe", async (req, res) => {
  console.log("POST /api/generateRecipe");
  try {
    const { prompt, suggestions, count } = req.body;
    const result = suggestions
      ? await llmService.generateSuggestions(prompt, count || 5, {
          timeout: 120000
        })
      : await llmService.generateRecipe(prompt, { timeout: 90000 });

    console.log("✅ LLM responded successfully");
    res.json(result);
  } catch (error) {
    console.error("❌ LLM error:", error);
    res
      .status(500)
      .json({ error: "Something went wrong", details: error.message });
  }
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
