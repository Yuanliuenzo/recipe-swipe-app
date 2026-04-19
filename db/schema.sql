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
  seasonal_king TEXT NOT NULL DEFAULT 'No'
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

CREATE TABLE IF NOT EXISTS restaurants (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  cuisine      TEXT,
  lat          REAL NOT NULL,
  lng          REAL NOT NULL,
  address      TEXT,
  neighborhood TEXT,
  description  TEXT,
  embedding    BLOB,
  osm_tags     TEXT,
  created_at   TEXT DEFAULT (datetime('now'))
);
