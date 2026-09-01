import { describe, expect, test } from "bun:test";
import {
  findBySlug,
  lookupInteractions,
  validateSeedFile,
  referenceSlugify,
  type CannabinoidRecord,
  type InteractionRecord,
  type TerpeneRecord,
} from "./reference-library";
import terpeneSeedJson from "./seed/terpeneLibrary.json";
import cannabinoidSeedJson from "./seed/cannabinoidLibrary.json";
import interactionSeedJson from "./seed/interactionLibrary.json";

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
  test("all three seed files validate and have unique slugs", () => {
    const t = validateSeedFile(terpeneSeedJson);
    const c = validateSeedFile(cannabinoidSeedJson);
    const i = validateSeedFile(interactionSeedJson);
    if (t.kind !== "terpene" || c.kind !== "cannabinoid" || i.kind !== "interaction") {
      throw new Error("seed kinds are wrong");
    }
    // Sanity: a few well-known entries are present.
    expect(findBySlug(t.entries, "myrcene")).not.toBeNull();
    expect(findBySlug(t.entries, "linalool")).not.toBeNull();
    expect(findBySlug(t.entries, "caryophyllene")).not.toBeNull();
    expect(findBySlug(c.entries, "thc")).not.toBeNull();
    expect(findBySlug(c.entries, "cbd")).not.toBeNull();
    expect(findBySlug(c.entries, "cbn")).not.toBeNull();
    // Interaction seed covers the commonly-searched classes.
    expect(i.entries.length).toBeGreaterThanOrEqual(13);
    const classes = new Set(i.entries.map((r) => r.drugClass));
    expect(classes).toContain("SSRI");
    expect(classes).toContain("benzodiazepine");
    expect(classes).toContain("opioid");
    expect(classes).toContain("anticoagulant");
    expect(classes).toContain("antihistamine");
    expect(classes).toContain("stimulant");
  });
});

describe("validateSeedFile (interaction seed)", () => {
  test("loads the bundled interaction seed without error", () => {
    const result = validateSeedFile(interactionSeedJson);
    expect(result.kind).toBe("interaction");
    if (result.kind !== "interaction") return;
    expect(result.entries.length).toBeGreaterThanOrEqual(13);
  });

  test("every interaction record has a slug, drugName, drugClass, a non-empty cannabisInteraction, and a non-empty sources array", () => {
    const result = validateSeedFile(interactionSeedJson);
    if (result.kind !== "interaction") throw new Error("wrong kind");
    const allowedClasses: ReadonlyArray<string> = [
      "SSRI",
      "benzodiazepine",
      "opioid",
      "anticoagulant",
      "antihistamine",
      "stimulant",
      "other",
    ];
    const allowedSeverities: ReadonlyArray<string> = [
      "low",
      "moderate",
      "high",
      "theoretical",
    ];
    for (const record of result.entries) {
      expect(record.slug).not.toBe("");
      expect(record.drugName).not.toBe("");
      expect(allowedClasses).toContain(record.drugClass);
      expect(record.cannabisInteraction.mechanism.length).toBeGreaterThan(20);
      expect(record.cannabisInteraction.commonGuidance).not.toBe("");
      expect(allowedSeverities).toContain(record.cannabisInteraction.severity);
      expect(record.cannabisInteraction.discussWithPrescriber).toBe(true);
      expect(record.sources.length).toBeGreaterThan(0);
      for (const source of record.sources) {
        expect(source.label).not.toBe("");
        expect(source.url).toMatch(/^https?:\/\//);
        expect(["pubmed", "review", "nor.org", "other"]).toContain(
          source.kind,
        );
      }
    }
  });

  test("slugs are unique across the interaction seed", () => {
    const result = validateSeedFile(interactionSeedJson);
    if (result.kind !== "interaction") throw new Error("wrong kind");
    const slugs = result.entries.map((r) => r.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  test("sertraline and warfarin are present and in the right class", () => {
    const result = validateSeedFile(interactionSeedJson);
    if (result.kind !== "interaction") throw new Error("wrong kind");
    const sertraline = findBySlug(result.entries, "sertraline");
    expect(sertraline).not.toBeNull();
    expect(sertraline?.drugClass).toBe("SSRI");
    const warfarin = findBySlug(result.entries, "warfarin");
    expect(warfarin).not.toBeNull();
    expect(warfarin?.drugClass).toBe("anticoagulant");
    expect(warfarin?.cannabisInteraction.severity).toBe("high");
  });

  test("every record has discussWithPrescriber === true (guardrail)", () => {
    const result = validateSeedFile(interactionSeedJson);
    if (result.kind !== "interaction") throw new Error("wrong kind");
    for (const record of result.entries) {
      expect(record.cannabisInteraction.discussWithPrescriber).toBe(true);
    }
  });
});

describe("validateSeedFile (interaction error paths)", () => {
  test("rejects an interaction record with a bad severity", () => {
    const bad = {
      kind: "interaction",
      entries: [
        {
          drugName: "Test Drug",
          drugClass: "SSRI",
          cannabisInteraction: {
            severity: "fatal",
            mechanism: "this is a long enough mechanism string for validation",
            commonGuidance: "talk to your doctor",
            discussWithPrescriber: true,
          },
          sources: [{ label: "x", url: "https://x", kind: "other" }],
        },
      ],
    };
    expect(() => validateSeedFile(bad)).toThrow(/severity must be/);
  });

  test("rejects an interaction record with discussWithPrescriber === false", () => {
    const bad = {
      kind: "interaction",
      entries: [
        {
          drugName: "Test Drug",
          drugClass: "SSRI",
          cannabisInteraction: {
            severity: "low",
            mechanism: "this is a long enough mechanism string for validation",
            commonGuidance: "talk to your doctor",
            discussWithPrescriber: false,
          },
          sources: [{ label: "x", url: "https://x", kind: "other" }],
        },
      ],
    };
    expect(() => validateSeedFile(bad)).toThrow(/discussWithPrescriber must be true/);
  });

  test("rejects an interaction record with an unknown drugClass", () => {
    const bad = {
      kind: "interaction",
      entries: [
        {
          drugName: "Test Drug",
          drugClass: "antibiotic",
          cannabisInteraction: {
            severity: "low",
            mechanism: "this is a long enough mechanism string for validation",
            commonGuidance: "talk to your doctor",
            discussWithPrescriber: true,
          },
          sources: [{ label: "x", url: "https://x", kind: "other" }],
        },
      ],
    };
    expect(() => validateSeedFile(bad)).toThrow(/drugClass must be/);
  });

  test("rejects an interaction record with no sources", () => {
    const bad = {
      kind: "interaction",
      entries: [
        {
          drugName: "Test Drug",
          drugClass: "SSRI",
          cannabisInteraction: {
            severity: "low",
            mechanism: "this is a long enough mechanism string for validation",
            commonGuidance: "talk to your doctor",
            discussWithPrescriber: true,
          },
          sources: [],
        },
      ],
    };
    expect(() => validateSeedFile(bad)).toThrow(/sources must be/);
  });

  test("rejects an interaction record with a non-object cannabisInteraction", () => {
    const bad = {
      kind: "interaction",
      entries: [
        {
          drugName: "Test Drug",
          drugClass: "SSRI",
          cannabisInteraction: null,
          sources: [{ label: "x", url: "https://x", kind: "other" }],
        },
      ],
    };
    expect(() => validateSeedFile(bad)).toThrow(/cannabisInteraction must be an object/);
  });

  test("rejects duplicate slugs across interaction entries", () => {
    const bad = {
      kind: "interaction",
      entries: [
        {
          slug: "same",
          drugName: "Test 1",
          drugClass: "SSRI",
          cannabisInteraction: {
            severity: "low",
            mechanism: "this is a long enough mechanism string for validation",
            commonGuidance: "talk to your doctor",
            discussWithPrescriber: true,
          },
          sources: [{ label: "x", url: "https://x", kind: "other" }],
        },
        {
          slug: "same",
          drugName: "Test 2",
          drugClass: "SSRI",
          cannabisInteraction: {
            severity: "low",
            mechanism: "this is a long enough mechanism string for validation",
            commonGuidance: "talk to your doctor",
            discussWithPrescriber: true,
          },
          sources: [{ label: "x", url: "https://x", kind: "other" }],
        },
      ],
    };
    expect(() => validateSeedFile(bad)).toThrow(/duplicate slug/);
  });
});

describe("lookupInteractions", () => {
  const records: InteractionRecord[] = [
    {
      slug: "sertraline",
      drugName: "Sertraline",
      drugClass: "SSRI",
      cannabisInteraction: {
        severity: "low",
        mechanism: "m",
        commonGuidance: "talk to your doctor",
        discussWithPrescriber: true,
      },
      sources: [{ label: "l", url: "https://x", kind: "pubmed" }],
    },
    {
      slug: "warfarin",
      drugName: "Warfarin",
      drugClass: "anticoagulant",
      cannabisInteraction: {
        severity: "high",
        mechanism: "m",
        commonGuidance: "talk to your doctor",
        discussWithPrescriber: true,
      },
      sources: [{ label: "l", url: "https://x", kind: "pubmed" }],
    },
    {
      slug: "alprazolam",
      drugName: "Alprazolam",
      drugClass: "benzodiazepine",
      cannabisInteraction: {
        severity: "moderate",
        mechanism: "m",
        commonGuidance: "talk to your doctor",
        discussWithPrescriber: true,
      },
      sources: [{ label: "l", url: "https://x", kind: "pubmed" }],
    },
  ];

  test("returns one record for a single known drug", () => {
    const out = lookupInteractions(records, ["sertraline"]);
    expect(out.length).toBe(1);
    expect(out[0].slug).toBe("sertraline");
  });

  test("returns multiple records for multiple known drugs", () => {
    const out = lookupInteractions(records, ["sertraline", "warfarin"]);
    expect(out.length).toBe(2);
    expect(out.map((r) => r.slug).sort()).toEqual([
      "sertraline",
      "warfarin",
    ]);
  });

  test("returns an empty array for an unknown drug name", () => {
    expect(lookupInteractions(records, ["unknown-drug"])).toEqual([]);
  });

  test("returns an empty array for an empty drug list", () => {
    expect(lookupInteractions(records, [])).toEqual([]);
  });

  test("drops empty and whitespace-only drug names", () => {
    expect(lookupInteractions(records, ["", "   ", "\t"])).toEqual([]);
  });

  test("normalizes drug names (case, spacing) before matching", () => {
    expect(lookupInteractions(records, ["  SERTRALINE  "]).length).toBe(1);
    expect(lookupInteractions(records, ["Warfarin"]).length).toBe(1);
  });

  test("dedupes input names that resolve to the same slug", () => {
    const out = lookupInteractions(records, [
      "sertraline",
      "Sertraline",
      "  SERTRALINE ",
    ]);
    expect(out.length).toBe(1);
    expect(out[0].slug).toBe("sertraline");
  });

  test("returns only known drugs, silently dropping unknown ones", () => {
    const out = lookupInteractions(records, [
      "sertraline",
      "unknown-drug",
      "warfarin",
    ]);
    expect(out.length).toBe(2);
    expect(out.map((r) => r.slug).sort()).toEqual([
      "sertraline",
      "warfarin",
    ]);
  });

  test("returns an empty array when the library is empty", () => {
    expect(lookupInteractions([], ["sertraline"])).toEqual([]);
  });
});

describe("lookupInteractions (integration with the real seed)", () => {
  test("a realistic patient medication list resolves to the right records", () => {
    const result = validateSeedFile(interactionSeedJson);
    if (result.kind !== "interaction") throw new Error("wrong kind");
    const out = lookupInteractions(result.entries, [
      "sertraline",
      "alprazolam",
      "oxycodone",
    ]);
    expect(out.length).toBe(3);
    expect(out.map((r) => r.drugClass).sort()).toEqual([
      "SSRI",
      "benzodiazepine",
      "opioid",
    ]);
    for (const r of out) {
      expect(r.cannabisInteraction.discussWithPrescriber).toBe(true);
    }
  });
});
