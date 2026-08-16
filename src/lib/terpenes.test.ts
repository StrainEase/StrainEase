import { describe, expect, test } from "bun:test";
import type { StrainProfile } from "./strain-profile";
import {
  TERPENE_PROFILES,
  strainsWithTerpene,
  terpeneFromSlug,
  terpeneProfile,
  terpeneSlug,
} from "./terpenes";

function strainWithTerpenes(terps: string[]): StrainProfile {
  return {
    name: "Test",
    inKnowledgeBase: true,
    terpenes: terps.map((name) => ({ name, profile: "" })),
  };
}

describe("terpeneSlug / terpeneFromSlug", () => {
  test("slugifies and resolves canonically", () => {
    expect(terpeneSlug("Myrcene")).toBe("myrcene");
    expect(terpeneFromSlug("myrcene")).toBe("myrcene");
    expect(terpeneFromSlug("linalool")).toBe("linalool");
  });

  test("returns undefined for unknown slugs", () => {
    expect(terpeneFromSlug("totally-fake-terpene")).toBeUndefined();
  });
});

describe("terpeneProfile", () => {
  test("returns a curated profile when present", () => {
    const profile = terpeneProfile("limonene");
    expect(profile?.summary).toContain("Citrus");
    expect(profile?.characteristics).toContain("Citrus");
    expect(profile?.benefits).toBeInstanceOf(Array);
    expect(profile?.benefits.length).toBeGreaterThan(0);
  });

  test("returns undefined for an unknown terpene", () => {
    expect(terpeneProfile("not-a-real-terpene")).toBeUndefined();
  });
});

describe("TERPENE_PROFILES table integrity", () => {
  test("every profile has summary + description + characteristics + benefits", () => {
    for (const [name, profile] of Object.entries(TERPENE_PROFILES)) {
      expect(profile.summary.length).toBeGreaterThan(0);
      expect(profile.description.length).toBeGreaterThan(0);
      expect(profile.characteristics.length).toBeGreaterThan(0);
      expect(profile.benefits.length).toBeGreaterThan(0);
      expect(typeof name).toBe("string");
    }
  });
});

describe("strainsWithTerpene", () => {
  test("buckets strains by whether they list the terpene", () => {
    const a = strainWithTerpenes(["Myrcene", "Limonene"]);
    const b = strainWithTerpenes(["Pinene"]);
    const c = strainWithTerpenes([]);
    const result = strainsWithTerpene("myrcene", [a, b, c]);
    expect(result.withProfile.map((s) => s.name)).toEqual(["Test"]);
    expect(result.withoutTerpene.map((s) => s.name)).toEqual(["Test", "Test"]);
  });

  test("is case insensitive", () => {
    const a = strainWithTerpenes(["LIMONENE"]);
    const result = strainsWithTerpene("limonene", [a]);
    expect(result.withProfile).toHaveLength(1);
  });

  test("handles strains without a terpenes array", () => {
    const bare: StrainProfile = { name: "Bare", inKnowledgeBase: false };
    const result = strainsWithTerpene("myrcene", [bare]);
    expect(result.withProfile).toHaveLength(0);
    expect(result.withoutTerpene).toHaveLength(1);
  });
});
