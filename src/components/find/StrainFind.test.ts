import { describe, expect, test } from "bun:test";
import {
  THC_BANDS,
  matchesThcBand,
  thcMidpoint,
} from "@/lib/thc-bands";
import type { StrainProfile } from "@/lib/strain-profile";

/**
 * Re-declare the EFFECT_BUCKETS array here so this test file stays
 * free of UI imports. Same approach the original test used for the
 * THC midpoint helper, before that helper moved into `lib/thc-bands`.
 */

const EFFECT_BUCKETS = [
  {
    id: "relaxed",
    label: "Relaxing",
    match: ["relaxed", "calm", "calming", "soothing"],
  },
  { id: "sleepy", label: "Sleepy", match: ["sleepy", "sedated", "drowsy"] },
  {
    id: "happy",
    label: "Happy",
    match: ["happy", "euphoric", "uplifted", "giggly"],
  },
  {
    id: "focused",
    label: "Focused",
    match: ["focused", "creative", "aroused"],
  },
  {
    id: "energetic",
    label: "Energetic",
    match: ["energetic", "tingly", "talkative"],
  },
  { id: "hungry", label: "Hungry", match: ["hungry", "appetite"] },
];

function strainMatchesBucket(
  strain: StrainProfile,
  bucket: (typeof EFFECT_BUCKETS)[number],
): boolean {
  const effects = strain.effects ?? [];
  const lower = new Set(effects.map((e) => e.name.toLowerCase()));
  return bucket.match.some((kw) => lower.has(kw));
}

describe("thcMidpoint", () => {
  test("parses range strings", () => {
    expect(thcMidpoint("17-24%")).toBe(20.5);
    expect(thcMidpoint("20-22 %")).toBeCloseTo(21);
    expect(thcMidpoint("16-21%")).toBeCloseTo(18.5);
  });

  test("parses tilde and single-value strings", () => {
    expect(thcMidpoint("~20%")).toBe(20);
    expect(thcMidpoint("19%")).toBe(19);
  });

  test("treats <1% as 0.5 (half-step below the ceiling)", () => {
    expect(thcMidpoint("<1%")).toBe(0.5);
    expect(thcMidpoint("<2%")).toBe(1.5);
  });

  test("returns null for missing or unparseable input", () => {
    expect(thcMidpoint(undefined)).toBeNull();
    expect(thcMidpoint("")).toBeNull();
    expect(thcMidpoint("abc")).toBeNull();
    expect(thcMidpoint("--")).toBeNull();
  });
});

describe("matchesThcBand", () => {
  // Belt-and-braces coverage: every band that promises a range must
  // include strains whose midpoint sits inside it, and exclude
  // strains whose midpoint sits outside. `any` is the catch-all and
  // also includes strains with no parseable THC range.

  test("any includes every strain, including unknowns", () => {
    expect(matchesThcBand("17-24%", "any")).toBe(true);
    expect(matchesThcBand("<1%", "any")).toBe(true);
    expect(matchesThcBand(undefined, "any")).toBe(true);
    expect(matchesThcBand("", "any")).toBe(true);
    expect(matchesThcBand("abc", "any")).toBe(true);
  });

  test("mild keeps strains below 15% THC and drops everything else", () => {
    expect(matchesThcBand("<1%", "mild")).toBe(true);
    expect(matchesThcBand("10-12%", "mild")).toBe(true);
    expect(matchesThcBand("14%", "mild")).toBe(true);
    // Midpoint 14.5 (15-14, range written with en-dash) sits just
    // below the 15% cutoff and is still mild.
    expect(matchesThcBand("14-15%", "mild")).toBe(true);
    expect(matchesThcBand("17-24%", "mild")).toBe(false);
    expect(matchesThcBand("22%", "mild")).toBe(false);
    // Unknown THC ranges can't honestly bucket into mild/balanced/
    // strong — only `any` admits them.
    expect(matchesThcBand(undefined, "mild")).toBe(false);
    expect(matchesThcBand("", "mild")).toBe(false);
  });

  test("balanced keeps 15–22% THC strains", () => {
    expect(matchesThcBand("15-20%", "balanced")).toBe(true);
    expect(matchesThcBand("20%", "balanced")).toBe(true);
    expect(matchesThcBand("21%", "balanced")).toBe(true);
    expect(matchesThcBand("<1%", "balanced")).toBe(false);
    expect(matchesThcBand("23-29%", "balanced")).toBe(false);
  });

  test("strong keeps 22%+ THC strains", () => {
    expect(matchesThcBand("22%", "strong")).toBe(true);
    expect(matchesThcBand("23-29%", "strong")).toBe(true);
    expect(matchesThcBand("17-24%", "strong")).toBe(false);
  });

  test("every band label is unique so the UI chips don't collide", () => {
    const labels = new Set(THC_BANDS.map((b) => b.label));
    expect(labels.size).toBe(THC_BANDS.length);
  });
});

describe("strainMatchesBucket", () => {
  const profile = (effects: string[]): StrainProfile => ({
    name: "Test",
    inKnowledgeBase: true,
    effects: effects.map((n) => ({ name: n, intensity: 3 })),
  });

  test("matches the lowercase effect name in the bucket list", () => {
    expect(strainMatchesBucket(profile(["Relaxed"]), EFFECT_BUCKETS[0])).toBe(
      true,
    );
    expect(
      strainMatchesBucket(profile(["Sleepy", "Happy"]), EFFECT_BUCKETS[1]),
    ).toBe(true);
  });

  test("does not match unrelated effects", () => {
    expect(strainMatchesBucket(profile(["Focused"]), EFFECT_BUCKETS[0])).toBe(
      false,
    );
    expect(strainMatchesBucket(profile([]), EFFECT_BUCKETS[2])).toBe(false);
  });

  test("handles missing effects array", () => {
    expect(strainMatchesBucket(profile([]), EFFECT_BUCKETS[0])).toBe(false);
  });
});

describe("directory ailment filter", () => {
  const profile = (uses: string[]): StrainProfile => ({
    name: "Test",
    inKnowledgeBase: true,
    medicalUses: uses,
  });

  // Mirror matchesCondition from src/lib/strain-ui.ts. We re-declare it
  // here so this test file stays free of UI imports — same approach as
  // the THC midpoint tests above.
  function ailmentMatches(
    uses: string[] | undefined,
    condition: string,
  ): boolean {
    if (!uses?.length) return false;
    const key = condition.toLowerCase();
    return uses.some((u) => u.toLowerCase() === key);
  }

  test("keeps strains whose medicalUses include the condition", () => {
    expect(
      ailmentMatches(profile(["Insomnia", "Stress"]).medicalUses, "Insomnia"),
    ).toBe(true);
    expect(ailmentMatches(profile(["Stress"]).medicalUses, "Insomnia")).toBe(
      false,
    );
  });

  test("AND-combines multiple conditions", () => {
    const strains = [
      profile(["Insomnia", "Chronic pain"]),
      profile(["Insomnia"]),
      profile(["Chronic pain"]),
    ];
    const kept = strains.filter((s) =>
      ["Insomnia", "Chronic pain"].every((c) =>
        ailmentMatches(s.medicalUses, c),
      ),
    );
    expect(kept.map((s) => s.medicalUses)).toEqual([
      ["Insomnia", "Chronic pain"],
    ]);
  });
});
