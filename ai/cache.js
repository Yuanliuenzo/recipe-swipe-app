/**
 * Server-side in-memory cache for LLM responses.
 *
 * Key: SHA-256 hash of the prompt (first 200 chars, to avoid logging full prompts).
 * TTL: 24 hours — recipes from the same vibe profile stay fresh for a day.
 *
 * Why server-side vs client-side:
 *   The existing client cache (pendingFetches in RecipeSuggestionService) is
 *   per-session. This cache is cross-session: two users with identical vibe
 *   profiles share a single LLM call result.
 */

import { createHash } from "crypto";

const store = new Map();
const TTL_MS = 24 * 60 * 60 * 1000;

export function cacheKey(prompt) {
  // Hash only the first 500 chars — enough to distinguish prompts, avoids large keys
  return createHash("sha256")
    .update(prompt.slice(0, 500))
    .digest("hex")
    .slice(0, 20);
}

export function get(key) {
  const entry = store.get(key);
  if (!entry) {
    return null;
  }
  if (Date.now() - entry.ts > TTL_MS) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function set(key, value) {
  store.set(key, { value, ts: Date.now() });
}

export function stats() {
  return { size: store.size };
}
