import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import {
  clearSourceCacheForTest,
  putSourceCache,
} from "./source-cache";
import {
  consolidateStrain,
  shouldPersistRefetch,
  shouldRefetchSource,
} from "./consolidate";
import type { SourceId } from "./source-cache";
import type { StrainProfile } from "./types";

// We pre-populate the per-source memory cache so the consolidator
// never falls through to the network. The point of these tests is
// the merge + averaging + attribution logic, not the scrapers.

function profile(overrides: Partial<StrainProfile>): StrainProfile {
  return {
    name: "Test Strain",
    inKnowledgeBase: true,
    ...overrides,
  };
}

/**
 * Seed every source slot with a base profile so the consolidator
 * has no reason to fall through to the network. Tests then override
 * the specific source(s) they care about with putSourceCache.
 * The seed runs against the slug the test is about to query.
 */
async function seedEmpty(name: string): Promise<void> {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  for (const s of ["leafly", "weedmaps", "allbud"] as SourceId[]) {
    await putSourceCache(slug, s, profile({ name }));
  }
}

beforeEach(async () => {
  clearSourceCacheForTest();
});

afterEach(() => {
  clearSourceCacheForTest();
});

describe("consolidateStrain — averaging", () => {
  test("averages THC across sources when the midpoints differ", async () => {
    await seedEmpty("Blue Dream");
    await putSourceCache("blue-dream", "leafly", profile({
      name: "Blue Dream",
      thcRange: "17-24%", // mid 20.5
    }));
    await putSourceCache("blue-dream", "allbud", profile({
      name: "Blue Dream",
      thcRange: "20%", // mid 20
    }));
    const out = await consolidateStrain("Blue Dream");
    expect(out?.thcRange).toBe("20.3%"); // (20.5 + 20) / 2 = 20.25 → 20.3
    expect(out?.sourceAttribution?.thcRange?.averaged).toBe(true);
    expect(out?.sourceAttribution?.thcRange?.sources).toHaveLength(2);
  });

  test("keeps a single source's value verbatim when there's no averaging to do", async () => {
    await seedEmpty("Blue Dream");
    await putSourceCache("blue-dream", "leafly", profile({
      thcRange: "20%",
    }));
    const out = await consolidateStrain("Blue Dream");
    expect(out?.thcRange).toBe("20%");
    // No attribution when the value matches the only source exactly.
    expect(out?.sourceAttribution?.thcRange).toBeUndefined();
  });

  test("averages CBD and emits attribution when sources disagree", async () => {
    await seedEmpty("X Strain");
    await putSourceCache("x-strain", "leafly", profile({ cbdRange: "1%" }));
    await putSourceCache("x-strain", "allbud", profile({ cbdRange: "3%" }));
    const out = await consolidateStrain("X Strain");
    expect(out?.cbdRange).toBe("2%");
    expect(out?.sourceAttribution?.cbdRange?.value).toBe("2%");
    expect(out?.sourceAttribution?.cbdRange?.sources.map((s) => s.source)).toEqual([
      "leafly",
      "allbud",
    ]);
  });

  test("strips a leading 'THC:' label from Allbud raw values", async () => {
    await seedEmpty("X Strain");
    await putSourceCache("x-strain", "allbud", profile({ thcRange: "THC: 20%" }));
    const out = await consolidateStrain("X Strain");
    expect(out?.thcRange).toBe("20%");
  });
});

describe("consolidateStrain — type / lineage / description attribution", () => {
  test("does not attribute when every source agrees on the species", async () => {
    await seedEmpty("X Strain");
    await putSourceCache("x-strain", "leafly", profile({ type: "sativa" }));
    await putSourceCache("x-strain", "allbud", profile({ type: "sativa" }));
    const out = await consolidateStrain("X Strain");
    expect(out?.type).toBe("sativa");
    expect(out?.sourceAttribution?.type).toBeUndefined();
  });

  test("attributes when sources disagree on the species and picks the majority", async () => {
    await seedEmpty("X Strain");
    await putSourceCache("x-strain", "leafly", profile({ type: "sativa" }));
    await putSourceCache("x-strain", "allbud", profile({ type: "indica" }));
    await putSourceCache("x-strain", "weedmaps", profile({ type: "sativa" }));
    const out = await consolidateStrain("X Strain");
    expect(out?.type).toBe("sativa");
    expect(out?.sourceAttribution?.type?.value).toBe("sativa");
    expect(out?.sourceAttribution?.type?.sources).toHaveLength(3);
  });

  test("attributes lineage when sources name different parents", async () => {
    await seedEmpty("Blueberry Haze");
    await putSourceCache(
      "blueberry-haze",
      "leafly",
      profile({ name: "Blueberry Haze", lineage: "Blueberry × Haze" }),
    );
    await putSourceCache(
      "blueberry-haze",
      "allbud",
      profile({ name: "Blueberry Haze", lineage: "Blueberry x Haze" }),
    );
    // Same lineage, different separator. Should not attribute.
    let out = await consolidateStrain("Blueberry Haze");
    expect(out?.sourceAttribution?.lineage).toBeUndefined();

    await putSourceCache(
      "blueberry-haze",
      "weedmaps",
      profile({
        name: "Blueberry Haze",
        lineage: "DJ Short Blueberry × Super Silver Haze",
      }),
    );
    out = await consolidateStrain("Blueberry Haze");
    // All three sources contributed a (different) lineage, so all
    // three show up in the attribution block.
    expect(out?.sourceAttribution?.lineage?.sources).toHaveLength(3);
  });
});

describe("consolidateStrain — community notes", () => {
  test("uniques notes across sources by source + text prefix", async () => {
    await seedEmpty("X Strain");
    await putSourceCache("x-strain", "leafly", profile({
      communityNotes: [
        { source: "Leafly review · alice", text: "Helped my anxiety fast." },
        { source: "Leafly review · bob", text: "Great for sleep." },
      ],
    }));
    await putSourceCache("x-strain", "allbud", profile({
      communityNotes: [
        { source: "Allbud", text: "Commonly used for anxiety, depression." },
        { source: "Allbud", text: "Patients report relaxation." },
      ],
    }));
    const out = await consolidateStrain("X Strain");
    expect(out?.communityNotes).toHaveLength(4);
  });

  test("tags notes with their source kind for the UI", async () => {
    await seedEmpty("X Strain");
    await putSourceCache("x-strain", "leafly", profile({
      communityNotes: [{ source: "Leafly review · alice", text: "Great." }],
    }));
    await putSourceCache("x-strain", "allbud", profile({
      communityNotes: [{ source: "Allbud", text: "Flavor: blueberry." }],
    }));
    const out = await consolidateStrain("X Strain");
    const kinds = out?.communityNotes?.map((n) => n.kind);
    expect(kinds).toContain("leafly");
    expect(kinds).toContain("allbud");
  });
});

describe("consolidateStrain — sources list + empty case", () => {
  test("records which sources contributed to the merged record", async () => {
    await seedEmpty("X Strain");
    // seedEmpty populated all three sources, so the merged record
    // shows all three of them.
    const out = await consolidateStrain("X Strain");
    expect(out?.sources?.sort()).toEqual(["allbud", "leafly", "weedmaps"]);
  });

  test("returns a profile when all three sources are pre-seeded", async () => {
    await seedEmpty("Test Strain");
    const out = await consolidateStrain("Test Strain");
    expect(out).not.toBeNull();
    expect(out?.sources).toHaveLength(3);
  });
});

describe("consolidateStrain — thin Leafly pre-defined description", () => {
  const thin = (name = "X Strain"): StrainProfile => ({
    name,
    inKnowledgeBase: true,
    description: "A single paragraph pre-defined description.",
  });

  test("refetches a cached Leafly slot that is only a thin description", () => {
    expect(shouldRefetchSource("leafly", thin())).toBe(true);
  });

  test("reuses a full Leafly slot without refetching", () => {
    expect(
      shouldRefetchSource("leafly", {
        name: "X",
        inKnowledgeBase: true,
        type: "hybrid",
        medicalUses: ["Stress"],
        effects: [{ name: "Relaxed", intensity: 3 }],
      }),
    ).toBe(false);
  });

  test("always fetches a missing slot, for every source", () => {
    for (const s of ["leafly", "weedmaps", "allbud"] as SourceId[]) {
      expect(shouldRefetchSource(s, undefined)).toBe(true);
    }
  });

  test("trusts a present Weedmaps / Allbud slot even when thin", () => {
    // Their thin profiles are the scraper's honest output — re-pulling
    // them every request would just loop.
    expect(shouldRefetchSource("weedmaps", thin())).toBe(false);
    expect(shouldRefetchSource("allbud", thin())).toBe(false);
  });

  test("persists an upgrade of a thin slot", () => {
    const existing = thin();
    const upgraded = { ...existing, medicalUses: ["Stress"] };
    expect(shouldPersistRefetch(existing, upgraded)).toBe(true);
  });

  test("does not pin a thin entry with a thin refetch (dead Leafly)", () => {
    // A dead Leafly would otherwise keep refreshing the TTL and pin the
    // thin profile forever; the old timestamp lets it expire.
    expect(shouldPersistRefetch(thin(), thin())).toBe(false);
  });

  test("persists a fresh fetch when nothing was cached", () => {
    expect(shouldPersistRefetch(undefined, thin())).toBe(true);
  });
});

describe("consolidateStrain — JSON output shape (cross-platform)", () => {
  test("output contains only JSON-safe types (string / number / boolean / null / array / object)", async () => {
    await seedEmpty("X Strain");
    await putSourceCache("x-strain", "leafly", profile({
      thcRange: "17-24%",
      type: "hybrid",
      effects: [{ name: "Relaxed", intensity: 4 }],
    }));
    await putSourceCache("x-strain", "allbud", profile({
      thcRange: "20%",
      type: "hybrid",
    }));
    const out = await consolidateStrain("X Strain");
    // Round-trip through JSON to catch any non-serializable values.
    const round = JSON.parse(JSON.stringify(out));
    expect(round).not.toBeNull();
    expect(typeof round.name).toBe("string");
    expect(typeof round.thcRange).toBe("string");
    expect(Array.isArray(round.effects)).toBe(true);
  });

  test("no NaN, no Infinity, no Date in the output", async () => {
    await seedEmpty("X Strain");
    await putSourceCache("x-strain", "leafly", profile({ thcRange: "20%" }));
    const out = await consolidateStrain("X Strain");
    const text = JSON.stringify(out);
    expect(text).not.toContain("NaN");
    expect(text).not.toContain("Infinity");
    // The TS Date type is erased at runtime, but we never emit one —
    // we use numeric timestamps instead. Belt + braces.
    expect(out).not.toHaveProperty("fetchedAt");
    expect(out).not.toHaveProperty("createdAt");
  });
});
