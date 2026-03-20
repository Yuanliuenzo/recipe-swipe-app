/**
 * Unit tests for UserPreferencesService — focuses on rendering and saving,
 * the two areas that were broken (save button had no listener).
 *
 * Run with: node --test test/preferences.test.js
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { UserPreferencesService } from "../src/services/UserPreferencesService.js";

// ---------------------------------------------------------------------------
// Minimal stubs — just enough to run the service without a real browser/server
// ---------------------------------------------------------------------------

function makeStateManager(initialPrefs = {}) {
  const state = {
    preferences: {
      diet: "None",
      budget: "No",
      seasonalKing: "No",
      ...initialPrefs
    }
  };
  return {
    get: key => state[key],
    setState: updates => Object.assign(state, updates),
    _state: state
  };
}

function makeApiService() {
  return {
    getPreferences: async () => ({
      preferences: { diet: "None", budget: "No", seasonalKing: "No" }
    }),
    updatePreferences: async prefs => ({ preferences: prefs })
  };
}

// ---------------------------------------------------------------------------
// renderPreferencesHTML
// ---------------------------------------------------------------------------

describe("UserPreferencesService.renderPreferencesHTML", () => {
  let service;

  beforeEach(() => {
    service = new UserPreferencesService(makeStateManager(), makeApiService());
  });

  it("renders a close button", () => {
    const html = service.renderPreferencesHTML({
      diet: "None",
      budget: "No",
      seasonalKing: "No"
    });
    assert.ok(
      html.includes("mobile-favorites-close"),
      "Missing close button class"
    );
  });

  it("renders a save button", () => {
    const html = service.renderPreferencesHTML({
      diet: "None",
      budget: "No",
      seasonalKing: "No"
    });
    assert.ok(html.includes("mobile-save-btn"), "Missing save button class");
  });

  it("renders radio inputs for diet, budget, seasonalKing", () => {
    const html = service.renderPreferencesHTML({
      diet: "Vegan",
      budget: "Yes",
      seasonalKing: "No"
    });
    assert.ok(html.includes('name="diet"'), "Missing diet radio group");
    assert.ok(html.includes('name="budget"'), "Missing budget radio group");
    assert.ok(
      html.includes('name="seasonalKing"'),
      "Missing seasonalKing radio group"
    );
  });

  it("pre-checks the current diet preference", () => {
    const html = service.renderPreferencesHTML({
      diet: "Vegetarian",
      budget: "No",
      seasonalKing: "No"
    });
    // The checked radio should be the Vegetarian option
    assert.ok(
      html.includes('value="Vegetarian"\n                checked'),
      "Expected Vegetarian to be pre-checked"
    );
  });
});

// ---------------------------------------------------------------------------
// normalize
// ---------------------------------------------------------------------------

describe("UserPreferencesService.normalize", () => {
  let service;

  beforeEach(() => {
    service = new UserPreferencesService(makeStateManager(), makeApiService());
  });

  it("fills missing fields with defaults", () => {
    const result = service.normalize({});
    assert.deepEqual(result, {
      diet: "None",
      budget: "No",
      seasonalKing: "No"
    });
  });

  it("preserves provided values", () => {
    const result = service.normalize({
      diet: "Vegan",
      budget: "Yes",
      seasonalKing: "Yes"
    });
    assert.deepEqual(result, {
      diet: "Vegan",
      budget: "Yes",
      seasonalKing: "Yes"
    });
  });

  it("fills partial input", () => {
    const result = service.normalize({ diet: "Gluten-Free" });
    assert.equal(result.diet, "Gluten-Free");
    assert.equal(result.budget, "No");
    assert.equal(result.seasonalKing, "No");
  });
});

// ---------------------------------------------------------------------------
// saveFromModal — the function the save button calls (was unwired before the fix)
// ---------------------------------------------------------------------------

describe("UserPreferencesService.saveFromModal", () => {
  it("reads radio values from the screen element and persists them", async () => {
    const stateManager = makeStateManager();
    let savedPrefs = null;

    const api = {
      ...makeApiService(),
      updatePreferences: async prefs => {
        savedPrefs = prefs;
        return { preferences: prefs };
      }
    };

    const service = new UserPreferencesService(stateManager, api);
    service.initialized = true;
    service.closePreferences = () => {};
    service.showToast = () => {};

    // Simulate what a DOM screen element with checked radios looks like
    const mockScreen = {
      querySelector: selector => {
        const values = {
          'input[name="diet"]:checked': { value: "Vegetarian" },
          'input[name="budget"]:checked': { value: "Yes" },
          'input[name="seasonalKing"]:checked': { value: "No" }
        };
        return values[selector] ?? null;
      }
    };

    await service.saveFromModal(mockScreen);

    assert.ok(savedPrefs, "saveUserPreferences was never called");
    assert.equal(savedPrefs.diet, "Vegetarian");
    assert.equal(savedPrefs.budget, "Yes");
    assert.equal(savedPrefs.seasonalKing, "No");
  });

  it("normalises missing radio selections to defaults", async () => {
    const stateManager = makeStateManager();
    let savedPrefs = null;

    const api = {
      ...makeApiService(),
      updatePreferences: async prefs => {
        savedPrefs = prefs;
        return { preferences: prefs };
      }
    };

    const service = new UserPreferencesService(stateManager, api);
    service.initialized = true;
    service.closePreferences = () => {};
    service.showToast = () => {};

    // All radios unchecked
    const mockScreen = { querySelector: () => null };

    await service.saveFromModal(mockScreen);

    assert.ok(savedPrefs, "saveUserPreferences was never called");
    assert.equal(savedPrefs.diet, "None");
    assert.equal(savedPrefs.budget, "No");
    assert.equal(savedPrefs.seasonalKing, "No");
  });
});
