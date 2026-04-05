CREATE TABLE IF NOT EXISTS users (
  username      TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  created_at    TEXT DEFAULT (datetime('now')),
  last_login    TEXT
);

CREATE TABLE IF NOT EXISTS preferences (
  username      TEXT PRIMARY KEY REFERENCES users(username) ON DELETE CASCADE,
  diet          TEXT NOT NULL DEFAULT 'None',
  budget        TEXT NOT NULL DEFAULT 'No',
  seasonal_king TEXT NOT NULL DEFAULT 'No',
  health_goal   TEXT NOT NULL DEFAULT 'balanced',
  cooking_skill TEXT NOT NULL DEFAULT 'moderate'
);

CREATE TABLE IF NOT EXISTS favorites (
  id          TEXT PRIMARY KEY,
  username    TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  recipe_text TEXT NOT NULL,
  rating      INTEGER,
  note        TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  username   TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);
