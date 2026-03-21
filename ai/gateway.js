/**
 * AI Gateway — single entry point for all LLM operations.
 *
 * Provider routing:
 *   GROQ_API_KEY set → Groq (fast, free tier, cloud)
 *   Otherwise        → Ollama (local, requires running server)
 *
 * Exports:
 *   complete(prompt, options)         — full response, with retry + cache
 *   streamTokens(prompt, options)     — async generator yielding string tokens
 *   activeProvider()                  — returns "groq" | "ollama" for health checks
 */

import { groqComplete, groqStream, parseGroqLine } from "./providers/groq.js";
import {
  ollamaComplete,
  ollamaStream,
  parseOllamaLine
} from "./providers/ollama.js";
import { cacheKey, get as cacheGet, set as cacheSet } from "./cache.js";

// ─── Provider selection ───────────────────────────────────────────────────────

function useGroq() {
  return Boolean(process.env.GROQ_API_KEY);
}

export function activeProvider() {
  return useGroq() ? "groq" : "ollama";
}

// ─── Non-streaming complete (used for suggestions — needs full JSON) ──────────

export async function complete(prompt, options = {}) {
  const key = cacheKey(prompt);
  const cached = cacheGet(key);
  if (cached) {
    console.log(`🗄️  Cache hit [${key}]`);
    return cached;
  }

  const maxRetries = options.retries ?? 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🤖 ${activeProvider()} attempt ${attempt}/${maxRetries}`);
      const text = useGroq()
        ? await groqComplete(prompt, options)
        : await ollamaComplete(prompt, options);

      cacheSet(key, text);
      return text;
    } catch (err) {
      lastError = err;
      console.error(`❌ Attempt ${attempt} failed:`, err.message);
      if (attempt < maxRetries) {
        await sleep(1000 * Math.pow(2, attempt - 1));
      }
    }
  }

  throw new Error(
    `AI gateway failed after ${maxRetries} attempts: ${lastError?.message}`
  );
}

// ─── Streaming (used for full recipe — plain prose, yields tokens) ────────────

export async function* streamTokens(prompt, options = {}) {
  const streamFn = useGroq() ? groqStream : ollamaStream;
  const parseLine = useGroq() ? parseGroqLine : parseOllamaLine;

  const body = await streamFn(prompt, options);
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // Split on newlines — Groq uses SSE (\n\n between events), Ollama uses \n
      const lines = buffer.split("\n");
      buffer = lines.pop(); // keep any incomplete trailing line

      for (const line of lines) {
        const token = parseLine(line);
        if (token) {
          yield token;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
