import { describe, expect, test } from "bun:test";
import {
  findBySlug,
  validateSeedFile,
  referenceSlugify,
  type CannabinoidRecord,
  type TerpeneRecord,
} from "./reference-library";
import terpeneSeedJson from "./seed/terpeneLibrary.json";
import cannabinoidSeedJson from "./seed/cannabinoidLibrary.json";

describe("referenceSlugify", () => {
  test("lowercases and replaces non-alphanumerics with dashes", () => {
    expect(referenceSlugify("Beta-Caryophyllene")).toBe("beta-caryophyllene");
    expect(referenceSlugify("  THC  ")).toBe("thc");
    expect(referenceSlugify("alpha-bisabolol")).toBe("alpha-bisabolol");
    expect(referenceSlugify("Δ9-THC")).toBe("9-thc");
  });

  test("strips leading and trailing dashes", () => {
    expect(referenceSlugify("---myrcene---")).toBe("myrcene");
  });

  test("returns empty string for empty / whitespace input", () => {
    expect(referenceSlugify("")).toBe("");
    expect(referenceSlugify("   ")).toBe("");
  });
});

describe("validateSeedFile (terpene seed)", () => {
  test("loads the bundled terpene seed without error", () => {
    const result = validateSeedFile(terpeneSeedJson);
    expect(result.kind).toBe("terpene");
    if (result.kind !== "terpene") return;
    expect(result.entries.length).toBeGreaterThanOrEqual(8);
  });

  test("every terpene record has a slug, a non-empty displayName, a mechanism, effects, a non-empty sources array, and an evidenceGrade from the closed set", () => {
    const result = validateSeedFile(terpeneSeedJson);
    if (result.kind !== "terpene") throw new Error("wrong kind");
    const allowed: ReadonlyArray<string> = [
      "strong",
      "moderate",
      "limited",
      "anecdotal",
    ];
    for (const record of result.entries) {
      expect(record.slug).not.toBe("");
      expect(record.displayName).not.toBe("");
      expect(record.mechanism.length).toBeGreaterThan(20);
      expect(record.aroma).not.toBe("");
      expect(record.classDescription).not.toBe("");
      expect(record.commonSources.length).toBeGreaterThan(0);
      expect(record.commonlyReportedEffects.length).toBeGreaterThan(0);
      expect(record.sources.length).toBeGreaterThan(0);
      expect(allowed).toContain(record.evidenceGrade);
      for (const source of record.sources) {
        expect(source.label).not.toBe("");
        expect(source.url).toMatch(/^https?:\/\//);
        expect(["pubmed", "review", "nor.org", "other"]).toContain(
          source.kind,
        );
      }
    }
  });

  test("slugs are unique across the seed", () => {
    const result = validateSeedFile(terpeneSeedJson);
    if (result.kind !== "terpene") throw new Error("wrong kind");
    const slugs = result.entries.map((r) => r.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("validateSeedFile (cannabinoid seed)", () => {
  test("loads the bundled cannabinoid seed without error", () => {
    const result = validateSeedFile(cannabinoidSeedJson);
    expect(result.kind).toBe("cannabinoid");
    if (result.kind !== "cannabinoid") return;
    expect(result.entries.length).toBeGreaterThanOrEqual(6);
  });

  test("every cannabinoid record has the required affinity / psychoactivity fields", () => {
    const result = validateSeedFile(cannabinoidSeedJson);
    if (result.kind !== "cannabinoid") throw new Error("wrong kind");
    const allowed: ReadonlyArray<string> = ["none", "mild", "moderate", "high"];
    for (const record of result.entries) {
      expect(record.slug).not.toBe("");
      expect(record.displayName).not.toBe("");
      expect(record.cb1Affinity).not.toBe("");
      expect(record.cb2Affinity).not.toBe("");
      expect(allowed).toContain(record.psychoactivity);
      expect(record.mechanism.length).toBeGreaterThan(20);
      expect(record.commonlyReportedEffects.length).toBeGreaterThan(0);
      expect(record.sources.length).toBeGreaterThan(0);
    }
  });

  test("slugs are unique across the seed", () => {
    const result = validateSeedFile(cannabinoidSeedJson);
    if (result.kind !== "cannabinoid") throw new Error("wrong kind");
    const slugs = result.entries.map((r) => r.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  test("THC is the only record with 'high' psychoactivity by default", () => {
    const result = validateSeedFile(cannabinoidSeedJson);
    if (result.kind !== "cannabinoid") throw new Error("wrong kind");
    const high = result.entries.filter((r) => r.psychoactivity === "high");
    expect(high.length).toBe(1);
    expect(high[0].slug).toBe("thc");
  });
});

describe("validateSeedFile (error paths)", () => {
  test("rejects an unknown top-level kind", () => {
    expect(() => validateSeedFile({ kind: "other", entries: [] })).toThrow(
      /kind must be/,
    );
  });

  test("rejects a non-array entries field", () => {
    expect(() =>
      validateSeedFile({ kind: "terpene", entries: "nope" }),
    ).toThrow(/entries must be an array/);
  });

  test("rejects a terpene with a bad evidenceGrade", () => {
    const bad = {
      kind: "terpene",
      entries: [
        {
          displayName: "Test",
          classDescription: "Mono",
          aroma: "test",
          commonSources: ["x"],
          mechanism: "this is a long enough mechanism string for validation",
          commonlyReportedEffects: ["x"],
          evidenceGrade: "definitive",
          sources: [{ label: "x", url: "https://x", kind: "other" }],
        },
      ],
    };
    expect(() => validateSeedFile(bad)).toThrow(/evidenceGrade must be/);
  });

  test("rejects a record with no sources", () => {
    const bad = {
      kind: "terpene",
      entries: [
        {
          displayName: "Test",
          classDescription: "Mono",
          aroma: "test",
          commonSources: ["x"],
          mechanism: "this is a long enough mechanism string for validation",
          commonlyReportedEffects: ["x"],
          evidenceGrade: "limited",
          sources: [],
        },
      ],
    };
    expect(() => validateSeedFile(bad)).toThrow(/sources must be/);
  });

  test("rejects a source with a non-https URL", () => {
    const bad = {
      kind: "cannabinoid",
      entries: [
        {
          displayName: "Test",
          cb1Affinity: "low",
          cb2Affinity: "low",
          psychoactivity: "none",
          mechanism: "this is a long enough mechanism string for validation",
          commonlyReportedEffects: ["x"],
          evidenceGrade: "limited",
          sources: [{ label: "x", url: "ftp://x", kind: "other" }],
        },
      ],
    };
    expect(() => validateSeedFile(bad)).toThrow(/source\.url must be/);
  });

  test("rejects a cannabinoid with an unknown psychoactivity value", () => {
    const bad = {
      kind: "cannabinoid",
      entries: [
        {
          displayName: "Test",
          cb1Affinity: "low",
          cb2Affinity: "low",
          psychoactivity: "extreme",
          mechanism: "this is a long enough mechanism string for validation",
          commonlyReportedEffects: ["x"],
          evidenceGrade: "limited",
          sources: [{ label: "x", url: "https://x", kind: "other" }],
        },
      ],
    };
    expect(() => validateSeedFile(bad)).toThrow(/psychoactivity must be/);
  });

  test("rejects duplicate slugs across entries", () => {
    const bad = {
      kind: "terpene",
      entries: [
        {
          slug: "same",
          displayName: "Test 1",
          classDescription: "Mono",
          aroma: "test",
          commonSources: ["x"],
          mechanism: "this is a long enough mechanism string for validation",
          commonlyReportedEffects: ["x"],
          evidenceGrade: "limited",
          sources: [{ label: "x", url: "https://x", kind: "other" }],
        },
        {
          slug: "same",
          displayName: "Test 2",
          classDescription: "Mono",
          aroma: "test",
          commonSources: ["x"],
          mechanism: "this is a long enough mechanism string for validation",
          commonlyReportedEffects: ["x"],
          evidenceGrade: "limited",
          sources: [{ label: "x", url: "https://x", kind: "other" }],
        },
      ],
    };
    expect(() => validateSeedFile(bad)).toThrow(/duplicate slug/);
  });
});

describe("findBySlug", () => {
  const terpenes: TerpeneRecord[] = [
    {
      slug: "myrcene",
      displayName: "Myrcene",
      classDescription: "Mono",
      aroma: "earthy",
      commonSources: ["mango"],
      mechanism: "m",
      commonlyReportedEffects: ["x"],
      evidenceGrade: "anecdotal",
      sources: [{ label: "l", url: "https://x", kind: "other" }],
    },
  ];
  const cannabinoids: CannabinoidRecord[] = [
    {
      slug: "thc",
      displayName: "THC",
      cb1Affinity: "high",
      cb2Affinity: "moderate",
      psychoactivity: "high",
      mechanism: "m",
      commonlyReportedEffects: ["x"],
      evidenceGrade: "strong",
      sources: [{ label: "l", url: "https://x", kind: "other" }],
    },
  ];

  test("finds a terpene by exact slug", () => {
    expect(findBySlug(terpenes, "myrcene")?.displayName).toBe("Myrcene");
  });

  test("finds a terpene after slug normalization", () => {
    expect(findBySlug(terpenes, "  Myrcene  ")?.slug).toBe("myrcene");
    expect(findBySlug(terpenes, "MYRCENE")?.slug).toBe("myrcene");
  });

  test("returns null for an unknown slug", () => {
    expect(findBySlug(terpenes, "limonene")).toBeNull();
  });

  test("returns null for an empty slug", () => {
    expect(findBySlug(terpenes, "")).toBeNull();
    expect(findBySlug(terpenes, "   ")).toBeNull();
  });

  test("works for the cannabinoid list", () => {
    expect(findBySlug(cannabinoids, "thc")?.psychoactivity).toBe("high");
    expect(findBySlug(cannabinoids, "cbd")).toBeNull();
  });
});

describe("seed file integration", () => {
  test("both seed files validate and have unique slugs", () => {
    const t = validateSeedFile(terpeneSeedJson);
    const c = validateSeedFile(cannabinoidSeedJson);
    if (t.kind !== "terpene" || c.kind !== "cannabinoid") {
      throw new Error("seed kinds are wrong");
    }
    // Sanity: a few well-known entries are present.
    expect(findBySlug(t.entries, "myrcene")).not.toBeNull();
    expect(findBySlug(t.entries, "linalool")).not.toBeNull();
    expect(findBySlug(t.entries, "caryophyllene")).not.toBeNull();
    expect(findBySlug(c.entries, "thc")).not.toBeNull();
    expect(findBySlug(c.entries, "cbd")).not.toBeNull();
    expect(findBySlug(c.entries, "cbn")).not.toBeNull();
  });
});
