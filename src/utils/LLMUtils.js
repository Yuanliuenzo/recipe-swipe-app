/**
 * Pure utility functions for LLM response handling.
 * Kept separate so they can be unit-tested without mocking fetch/DOM.
 */

/**
 * Extract a JSON string from raw LLM text.
 * Models often wrap JSON in markdown code fences or add prose around it.
 *
 * Priority:
 *   1. Content inside ```json ... ``` or ``` ... ``` fences
 *   2. First {...} block found in the text
 *   3. The original text (trimmed), so JSON.parse gets a chance to fail loudly
 */
export function extractJSON(text) {
  if (!text) {
    return text;
  }

  // 1. Strip markdown code fences
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }

  // 2. Grab the first {...} block (handles prose before/after JSON)
  const objectMatch = text.match(/(\{[\s\S]*\})/);
  if (objectMatch) {
    return objectMatch[1].trim();
  }

  return text.trim();
}

/**
 * Return the current meteorological season for the northern hemisphere.
 * Month is 0-based (Date.getMonth()).
 */
export function getCurrentSeason() {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) {
    return "spring";
  }
  if (month >= 5 && month <= 7) {
    return "summer";
  }
  if (month >= 8 && month <= 10) {
    return "autumn";
  }
  return "winter";
}
