/**
 * Unit tests for LLMUtils — the pure functions that are most critical
 * to recipe loading working correctly.
 *
 * Run with: node --test test/llm-utils.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractJSON, getCurrentSeason } from "../src/utils/LLMUtils.js";

// ---------------------------------------------------------------------------
// extractJSON
// ---------------------------------------------------------------------------

describe("extractJSON", () => {
  it("returns plain JSON untouched", () => {
    const input = '{"suggestions":[{"title":"Pasta"}]}';
    assert.equal(extractJSON(input), input);
  });

  it("strips ```json ... ``` fences", () => {
    const input = '```json\n{"suggestions":[{"title":"Pasta"}]}\n```';
    assert.equal(extractJSON(input), '{"suggestions":[{"title":"Pasta"}]}');
  });

  it("strips ``` ... ``` fences without language tag", () => {
    const input = '```\n{"suggestions":[]}\n```';
    assert.equal(extractJSON(input), '{"suggestions":[]}');
  });

  it("extracts JSON object embedded in prose", () => {
    const input =
      'Here are your suggestions:\n{"suggestions":[{"title":"Risotto"}]}\nEnjoy!';
    const result = extractJSON(input);
    // Should contain the JSON object
    assert.ok(result.startsWith("{"), `Expected JSON object, got: ${result}`);
    const parsed = JSON.parse(result);
    assert.equal(parsed.suggestions[0].title, "Risotto");
  });

  it("returns trimmed text when no JSON found (lets JSON.parse fail loudly)", () => {
    const input = "  sorry, I cannot help with that  ";
    assert.equal(extractJSON(input), "sorry, I cannot help with that");
  });

  it("handles null/undefined gracefully", () => {
    assert.equal(extractJSON(null), null);
    assert.equal(extractJSON(undefined), undefined);
    assert.equal(extractJSON(""), "");
  });

  it("handles multi-line JSON inside fences", () => {
    const input = `\`\`\`json
{
  "suggestions": [
    { "title": "Soup", "description": "Warm and hearty" }
  ]
}
\`\`\``;
    const result = extractJSON(input);
    const parsed = JSON.parse(result);
    assert.equal(parsed.suggestions.length, 1);
    assert.equal(parsed.suggestions[0].title, "Soup");
  });
});

// ---------------------------------------------------------------------------
// getCurrentSeason
// ---------------------------------------------------------------------------

describe("getCurrentSeason", () => {
  it("returns a valid season string", () => {
    const season = getCurrentSeason();
    assert.ok(
      ["spring", "summer", "autumn", "winter"].includes(season),
      `Unexpected season: ${season}`
    );
  });
});
