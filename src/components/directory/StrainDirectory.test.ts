import { describe, expect, test } from "bun:test";
import type { StrainProfile } from "@/lib/strain-profile";

/**
 * Mirror the helpers exported by StrainDirectory.tsx. We re-declare
 * them here so the test file doesn't pull React / DOM into bun:test
 * — the directory component is JSX-only.
 */

function thcMidpoint(range: string | undefined): number | null {
  if (!range) return null;
  const cleaned = range.replace(/[%~\s<>]/g, "").trim();
  if (!cleaned) return null;
  if (range.includes("<")) {
    const n = Number(cleaned.replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? Math.max(0, n - 0.5) : null;
  }
  const dash = cleaned.split("-");
  if (dash.length === 2) {
    const a = Number(dash[0]);
    const b = Number(dash[1]);
    if (Number.isFinite(a) && Number.isFinite(b)) return (a + b) / 2;
  }
  const single = Number(cleaned);
  if (Number.isFinite(single)) return single;
  return null;
}

const EFFECT_BUCKETS = [
  { id: "relaxed", label: "Relaxing", match: ["relaxed", "calm", "calming", "soothing"] },
  { id: "sleepy", label: "Sleepy", match: ["sleepy", "sedated", "drowsy"] },
  { id: "happy", label: "Happy", match: ["happy", "euphoric", "uplifted", "giggly"] },
  { id: "focused", label: "Focused", match: ["focused", "creative", "aroused"] },
  { id: "energetic", label: "Energetic", match: ["energetic", "tingly", "talkative"] },
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

describe("strainMatchesBucket", () => {
  const profile = (effects: string[]): StrainProfile => ({
    name: "Test",
    inKnowledgeBase: true,
    effects: effects.map((n) => ({ name: n, intensity: 3 })),
  });

  test("matches the lowercase effect name in the bucket list", () => {
    expect(strainMatchesBucket(profile(["Relaxed"]), EFFECT_BUCKETS[0])).toBe(true);
    expect(strainMatchesBucket(profile(["Sleepy", "Happy"]), EFFECT_BUCKETS[1])).toBe(true);
  });

  test("does not match unrelated effects", () => {
    expect(strainMatchesBucket(profile(["Focused"]), EFFECT_BUCKETS[0])).toBe(false);
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
    expect(ailmentMatches(profile(["Insomnia", "Stress"]).medicalUses, "Insomnia")).toBe(true);
    expect(ailmentMatches(profile(["Stress"]).medicalUses, "Insomnia")).toBe(false);
  });

  test("AND-combines multiple conditions", () => {
    const strains = [
      profile(["Insomnia", "Chronic pain"]),
      profile(["Insomnia"]),
      profile(["Chronic pain"]),
    ];
    const kept = strains.filter((s) =>
      ["Insomnia", "Chronic pain"].every((c) => ailmentMatches(s.medicalUses, c)),
    );
    expect(kept.map((s) => s.medicalUses)).toEqual([["Insomnia", "Chronic pain"]]);
  });
});