/**
 * Groq provider — OpenAI-compatible API, ~500 tokens/sec on free tier.
 * Free tier: llama-3.3-70b-versatile, 30 req/min, 14 400 req/day.
 * Set GROQ_API_KEY in your environment to enable.
 */

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export async function groqComplete(prompt, { timeout = 30000 } = {}) {
  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || DEFAULT_MODEL,
      messages: [{ role: "user", content: prompt }],
      stream: false,
      temperature: 0.8
    }),
    signal: AbortSignal.timeout(timeout)
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Groq ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

export async function groqStream(prompt, { timeout = 30000 } = {}) {
  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || DEFAULT_MODEL,
      messages: [{ role: "user", content: prompt }],
      stream: true,
      temperature: 0.8
    }),
    signal: AbortSignal.timeout(timeout)
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Groq stream ${res.status}: ${body}`);
  }

  return res.body;
}

/** Parse one SSE line from Groq's OpenAI-compatible stream. Returns token string or null. */
export function parseGroqLine(line) {
  if (!line.startsWith("data: ")) {
    return null;
  }
  const data = line.slice(6).trim();
  if (data === "[DONE]") {
    return null;
  }
  try {
    return JSON.parse(data).choices?.[0]?.delta?.content ?? null;
  } catch {
    return null;
  }
}
