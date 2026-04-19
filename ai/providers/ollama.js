/**
 * Ollama provider — local model server.
 * Falls back to this when GROQ_API_KEY is not set.
 * Default model: mistral:latest
 */

const OLLAMA_BASE = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
const OLLAMA_URL = `${OLLAMA_BASE}/api/generate`;
const OLLAMA_EMBED_URL = `${OLLAMA_BASE}/api/embeddings`;
const DEFAULT_MODEL = "mistral:latest";
const DEFAULT_EMBED_MODEL = "nomic-embed-text";

export async function ollamaComplete(prompt, { timeout = 120000 } = {}) {
  const res = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OLLAMA_MODEL || DEFAULT_MODEL,
      prompt,
      stream: false
    }),
    signal: AbortSignal.timeout(timeout)
  });

  if (!res.ok) {
    throw new Error(`Ollama ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  if (data.error) {
    throw new Error(`Ollama: ${data.error}`);
  }
  if (!data.response) {
    throw new Error("Ollama returned empty response");
  }

  return data.response;
}

export async function ollamaStream(prompt, { timeout = 120000 } = {}) {
  const res = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OLLAMA_MODEL || DEFAULT_MODEL,
      prompt,
      stream: true
    }),
    signal: AbortSignal.timeout(timeout)
  });

  if (!res.ok) {
    throw new Error(`Ollama stream ${res.status}: ${res.statusText}`);
  }

  return res.body;
}

/** Generate an embedding vector for a text string. Returns Float32Array. */
export async function ollamaEmbed(
  text,
  { model = DEFAULT_EMBED_MODEL, timeout = 30000 } = {}
) {
  const res = await fetch(OLLAMA_EMBED_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt: text }),
    signal: AbortSignal.timeout(timeout)
  });

  if (!res.ok) {
    throw new Error(`Ollama embed ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  if (data.error) {
    throw new Error(`Ollama embed: ${data.error}`);
  }
  if (!data.embedding) {
    throw new Error("Ollama embed returned no embedding");
  }

  return new Float32Array(data.embedding);
}

/** Parse one newline-delimited JSON line from Ollama's stream. Returns token string or null. */
export function parseOllamaLine(line) {
  if (!line.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(line);
    return parsed.done ? null : (parsed.response ?? null);
  } catch {
    return null;
  }
}
