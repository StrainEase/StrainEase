import { describe, expect, test } from "bun:test";
import {
  _resetCatalogForTests,
  registerCatalogName,
} from "./canonical-strain-name";
import {
  clampBudget,
  normalizeRecommendations,
  recommendCacheKey,
} from "./recommend-core";

describe("normalizeRecommendations (Discover tab names)", () => {
  test("title-cases a lowercase strain name the model returned", () => {
    const out = normalizeRecommendations([
      { strainName: "blue dream", reason: "calm" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].strainName).toBe("Blue Dream");
  });

  test("keeps strain acronyms in all caps", () => {
    const out = normalizeRecommendations([
      { strainName: "gg4" },
      { strainName: "og kush" },
    ]);
    expect(out.map((r) => r.strainName)).toEqual(["GG4", "OG Kush"]);
  });

  test("prefers the catalog spelling when the catalog knows the strain", () => {
    registerCatalogName("mac-1", "Mac 1");
    const out = normalizeRecommendations([{ strainName: "mac 1" }]);
    expect(out[0].strainName).toBe("Mac 1");
    _resetCatalogForTests();
  });

  test("dedupes names that differ only by case", () => {
    const out = normalizeRecommendations([
      { strainName: "blue dream" },
      { strainName: "Blue Dream" },
    ]);
    expect(out).toHaveLength(1);
  });

  test("keeps the recommendation copy alongside the canonical name", () => {
    const out = normalizeRecommendations([
      {
        strainName: "  blue dream  ",
        reason: "Good for sleep.",
        bestFor: "Evening use.",
        caution: "Strong start.",
      },
    ]);
    expect(out[0]).toMatchObject({
      strainName: "Blue Dream",
      reason: "Good for sleep.",
      bestFor: "Evening use.",
      caution: "Strong start.",
    });
  });
});

describe("recommendCacheKey", () => {
  const base = {
    conditions: ["insomnia", "chronic pain"],
    potency: "balanced" as const,
    prefs: { timeOfDay: "night" },
    language: "en",
  };

  test("is stable for the same inputs", () => {
    expect(recommendCacheKey(base)).toBe(recommendCacheKey({ ...base }));
  });

  test("ignores the order of the conditions", () => {
    expect(
      recommendCacheKey({ ...base, conditions: ["chronic pain", "insomnia"] }),
    ).toBe(recommendCacheKey(base));
  });

  test("changes when the potency changes", () => {
    expect(recommendCacheKey({ ...base, potency: "mild" })).not.toBe(
      recommendCacheKey(base),
    );
  });

  test("changes when the language changes", () => {
    expect(recommendCacheKey({ ...base, language: "es" })).not.toBe(
      recommendCacheKey(base),
    );
  });

  test("changes when the prefs change", () => {
    expect(
      recommendCacheKey({ ...base, prefs: { timeOfDay: "morning" } }),
    ).not.toBe(recommendCacheKey(base));
  });
});

describe("clampBudget", () => {
  test("keeps a value inside the range", () => {
    expect(clampBudget(30_000, 15_000, 90_000)).toBe(30_000);
  });

  test("raises a too-small value to the floor", () => {
    expect(clampBudget(1_000, 15_000, 90_000)).toBe(15_000);
  });

  test("lowers a too-large value to the ceiling", () => {
    expect(clampBudget(200_000, 15_000, 90_000)).toBe(90_000);
  });

  test("falls back to the ceiling for a non-finite value", () => {
    expect(clampBudget(Number.NaN, 15_000, 90_000)).toBe(90_000);
  });
});
