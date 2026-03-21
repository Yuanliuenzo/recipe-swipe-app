import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const db = new Database(path.join(__dirname, "recipe-swipe.db"));

// WAL mode: readers don't block writers, much better for a web server
db.pragma("journal_mode = WAL");
// Enforce foreign key constraints (SQLite disables them by default)
db.pragma("foreign_keys = ON");

// Create tables if they don't exist
const schema = readFileSync(path.join(__dirname, "schema.sql"), "utf8");
db.exec(schema);

export default db;
