import { describe, expect, test } from "bun:test";
import type { StrainProfile } from "./strain-profile";
import {
  dayNightLabel,
  dayNightScore,
  terpeneMeaning,
} from "./strain-meaning";

describe("dayNightScore", () => {
  test("returns 50 for an empty profile", () => {
    expect(dayNightScore({ name: "Empty", inKnowledgeBase: true })).toBe(50);
  });

  test("leans day for uplifting sativas", () => {
    const strain: StrainProfile = {
      name: "Uplift",
      inKnowledgeBase: true,
      type: "sativa",
      effects: [
        { name: "Energetic", intensity: 5 },
        { name: "Focused", intensity: 4 },
      ],
    };
    expect(dayNightScore(strain)).toBeGreaterThan(60);
  });

  test("leans night for sleepy indicas", () => {
    const strain: StrainProfile = {
      name: "Couch-lock",
      inKnowledgeBase: true,
      type: "indica",
      effects: [
        { name: "Sleepy", intensity: 5 },
        { name: "Relaxed", intensity: 4 },
      ],
    };
    expect(dayNightScore(strain)).toBeLessThan(40);
  });
});

describe("dayNightLabel", () => {
  test("matches the three bands", () => {
    expect(dayNightLabel(80)).toMatch(/daytime/i);
    expect(dayNightLabel(20)).toMatch(/evening/i);
    expect(dayNightLabel(50)).toMatch(/either/i);
  });
});

describe("terpeneMeaning (delegated to curated profiles)", () => {
  test("returns the curated summary", () => {
    expect(terpeneMeaning("Myrcene")).toContain("Earthy");
    expect(terpeneMeaning("Limonene")).toContain("Citrus");
    expect(terpeneMeaning("Linalool")).toContain("Floral");
  });

  test("case insensitive", () => {
    expect(terpeneMeaning("LIMONENE")).toContain("Citrus");
  });

  test("undefined for unknown terpene", () => {
    expect(terpeneMeaning("not-a-real-terpene")).toBeUndefined();
  });
});
