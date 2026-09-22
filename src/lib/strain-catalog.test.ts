import { describe, expect, test } from "bun:test";
import { CATALOG, getPhotoURL } from "./strain-catalog";
import {
  _setStrainDirectoryByTypeForTests,
  applyCatalogPhotos,
  matchAilments,
  matchingAilment,
  mergeCatalog,
} from "./strain-catalog";
import type { StrainProfile } from "./strain-profile";

describe("matchingAilment", () => {
  test("keeps a popular strain when live data has no medicalUses", () => {
    const live = [
      {
        name: "Granddaddy Purple",
        inKnowledgeBase: true,
        type: "indica" as const,
      },
    ];
    const hits = matchingAilment("Insomnia", live);
    expect(hits.some((profile) => profile.name === "Granddaddy Purple")).toBe(
      true,
    );
  });

  test("OCD is its own chip but matches Anxiety strains", () => {
    const hits = matchingAilment("OCD", []);
    expect(hits.length).toBeGreaterThanOrEqual(6);
    expect(hits.some((profile) => profile.name === "Gelato")).toBe(true);
    expect(
      hits.every(
        (profile) =>
          profile.medicalUses?.some((use) => use.toLowerCase() === "anxiety") ||
          profile.medicalUses?.some((use) => use.toLowerCase() === "ocd"),
      ),
    ).toBe(true);
  });

  test("ADHD matches catalog focus strains", () => {
    const hits = matchingAilment("ADHD", []);
    expect(hits.length).toBeGreaterThanOrEqual(6);
    expect(hits.some((profile) => profile.name === "Jack Herer")).toBe(true);
  });
});

describe("matchAilments", () => {
  test("returns an empty list when no ailments are given", () => {
    const live = [
      { name: "Blue Dream", inKnowledgeBase: true, type: "hybrid" as const },
    ];
    expect(matchAilments([], live)).toEqual([]);
  });

  test("ranks strains that cover more saved ailments first", () => {
    // Blue Dream covers Chronic pain, Stress, Depression, Fatigue,
    // Inflammation, Arthritis — that's five ailments.
    // Granddaddy Purple covers Insomnia, Chronic pain, Muscle spasm,
    // Stress, PTSD, Anxiety — also five.
    // Northern Lights covers Insomnia, Chronic pain, Stress, Anxiety,
    // PTSD, Inflammation — also five.
    // Jack Herer covers ADHD, Fatigue, Depression, Stress,
    // Inflammation, Migraine — five.
    // For {Insomnia, Chronic pain}, Blue Dream + GDP + Northern Lights
    // all match both, but Blue Dream + GDP also match Insomnia, so
    // they're tied. The result must be a non-empty list with each
    // profile matching at least one ailment.
    const hits = matchAilments(["Insomnia", "Chronic pain"], []);
    expect(hits.length).toBeGreaterThan(0);
    expect(
      hits.every((profile) =>
        (profile.medicalUses ?? []).some((use) =>
          ["insomnia", "chronic pain"].includes(use.toLowerCase()),
        ),
      ),
    ).toBe(true);
  });

  test("respects the limit", () => {
    const hits = matchAilments(
      ["Insomnia", "Chronic pain", "Stress", "Anxiety"],
      [],
      3,
    );
    expect(hits.length).toBeLessThanOrEqual(3);
  });

  test("ignores empty/whitespace ailment entries", () => {
    const hits = matchAilments(["", "  ", "Insomnia"], []);
    expect(hits.length).toBeGreaterThan(0);
    expect(
      hits.every((profile) =>
        (profile.medicalUses ?? []).some(
          (use) => use.toLowerCase() === "insomnia",
        ),
      ),
    ).toBe(true);
  });
});

describe("applyCatalogPhotos", () => {
  test("prefers the curated nug shot over a live URL", () => {
    const [filled] = applyCatalogPhotos([
      {
        name: "Blue Dream",
        inKnowledgeBase: true,
        imageUrl: "https://example.com/broken-live.jpg",
      },
    ]);
    expect(filled?.imageUrl).toMatch(/blue-dream/i);
    expect(filled?.imageUrl).not.toBe("https://example.com/broken-live.jpg");
  });

  test("fills photos on popular, type, and ailment rails — not only recents", () => {
    const live = [
      { name: "Blue Dream", inKnowledgeBase: true, type: "hybrid" as const },
      { name: "Sour Diesel", inKnowledgeBase: true, type: "sativa" as const },
      {
        name: "Granddaddy Purple",
        inKnowledgeBase: true,
        type: "indica" as const,
      },
    ];
    for (const list of [
      mergeCatalog(live),
      mergeCatalog(live, "sativa"),
      mergeCatalog(live, "hybrid"),
      mergeCatalog(live, "indica"),
      matchingAilment("Insomnia", live),
      applyCatalogPhotos(live),
    ]) {
      expect(list.every((profile) => Boolean(profile.imageUrl))).toBe(true);
    }
  });

  test("mergeCatalog merges a passed-in directory into type rails", () => {
    const directory: StrainProfile[] = [
      {
        name: "Caramel Kona Coffee",
        inKnowledgeBase: true,
        type: "hybrid",
        thcRange: "~22%",
        imageUrl: "https://images.leafly.com/flower-images/caramel-kona.jpg",
        medicalUses: ["Anxiety", "Stress"],
      },
      {
        name: "Citrus Sunrise",
        inKnowledgeBase: true,
        type: "sativa",
        thcRange: "~18%",
        imageUrl: "https://images.leafly.com/flower-images/citrus-sunrise.jpg",
        medicalUses: ["Depression"],
      },
      {
        name: "Velvet Punch",
        inKnowledgeBase: true,
        type: "indica",
        thcRange: "~24%",
        imageUrl: "https://images.leafly.com/flower-images/velvet-punch.jpg",
        medicalUses: ["Insomnia"],
      },
    ];
    const curatedHybrid = CATALOG.filter((p) => p.type === "hybrid").length;
    const hybrid = mergeCatalog([], "hybrid", directory);
    expect(hybrid.length).toBeGreaterThanOrEqual(curatedHybrid + 1);
    expect(hybrid.every((p) => p.type === "hybrid")).toBe(true);

    const sativa = mergeCatalog([], "sativa", directory);
    expect(sativa.some((p) => p.name === "Citrus Sunrise")).toBe(true);
    expect(sativa.every((p) => p.type === "sativa")).toBe(true);

    const indica = mergeCatalog([], "indica", directory);
    expect(indica.some((p) => p.name === "Velvet Punch")).toBe(true);
    expect(indica.every((p) => p.type === "indica")).toBe(true);
  });

  test("mergeCatalog prefers the Firestore per-type cache over the bundled JSON when loaded", () => {
    const firestoreIndica: StrainProfile[] = [
      {
        name: "Lavender Dusk",
        inKnowledgeBase: true,
        type: "indica",
        thcRange: "~19%",
        imageUrl: "https://images.leafly.com/flower-images/lavender-dusk.png",
        medicalUses: ["Insomnia"],
      },
      {
        name: "Midnight Plum",
        inKnowledgeBase: true,
        type: "indica",
        thcRange: "~22%",
        imageUrl: "https://images.leafly.com/flower-images/midnight-plum.png",
        medicalUses: ["Stress"],
      },
    ];
    _setStrainDirectoryByTypeForTests(true, { indica: firestoreIndica });
    try {
      const merged = mergeCatalog([], "indica");
      const names = new Set(merged.map((p) => p.name));
      expect(names.has("Lavender Dusk")).toBe(true);
      expect(names.has("Midnight Plum")).toBe(true);
      // The bundled JSON's 17 indicas should be absent — Firestore replaces
      // them, not appends to them.
      expect(names.has("Blackberry Kush")).toBe(false);
      expect(merged.every((p) => p.type === "indica")).toBe(true);
    } finally {
      _setStrainDirectoryByTypeForTests(false);
    }
  });

  test("mergeCatalog falls back to bundled JSON when the Firestore cache is not loaded", () => {
    // No explicit directory arg, no Firestore cache → uses bundled.
    const merged = mergeCatalog([], "indica");
    expect(merged.some((p) => p.name === "Granddaddy Purple")).toBe(true);
    expect(merged.some((p) => p.name === "Bubba Kush")).toBe(true);
  });

  test("matchingAilment falls back to the directory when the curated catalog has no hits", () => {
    const directory: StrainProfile[] = [
      {
        name: "Cancer Cell Crusher",
        inKnowledgeBase: true,
        type: "hybrid",
        thcRange: "~18%",
        imageUrl: "https://images.leafly.com/flower-images/cancer-cell.jpg",
        medicalUses: ["Cancer"],
      },
      {
        name: "Chemo Relief",
        inKnowledgeBase: true,
        type: "indica",
        thcRange: "~22%",
        imageUrl: "https://images.leafly.com/flower-images/chemo.jpg",
        medicalUses: ["Cancer"],
      },
    ];
    // The curated catalog does not list "Cancer" as a medicalUse. Without
    // the directory the matcher would fall back to its 8-random slice.
    // With the directory, both directory entries should match.
    const hits = matchingAilment("Cancer", [], directory);
    expect(hits.length).toBeGreaterThanOrEqual(2);
    expect(hits.some((p) => p.name === "Cancer Cell Crusher")).toBe(true);
    expect(hits.some((p) => p.name === "Chemo Relief")).toBe(true);
  });

  test("matchAilments scores directory entries alongside curated", () => {
    const directory: StrainProfile[] = [
      {
        name: "Dual Purpose",
        inKnowledgeBase: true,
        type: "sativa",
        thcRange: "~20%",
        imageUrl: "https://images.leafly.com/flower-images/dual.jpg",
        medicalUses: ["Anxiety", "Insomnia"],
      },
      {
        name: "Anxiety Only",
        inKnowledgeBase: true,
        type: "hybrid",
        thcRange: "~19%",
        imageUrl: "https://images.leafly.com/flower-images/anxiety-only.jpg",
        medicalUses: ["Anxiety"],
      },
    ];
    const picks = matchAilments(["Anxiety", "Insomnia"], [], 10, directory);
    expect(picks[0].name).toBe("Dual Purpose");
    expect(picks.some((p) => p.name === "Anxiety Only")).toBe(true);
  });
});

describe("getPhotoURL", () => {
  test("resolves a known catalog strain name to its curated direct URL", () => {
    expect(getPhotoURL("Blue Dream")).toBe(
      "https://images.leafly.com/flower-images/blue-dream.png",
    );
  });

  test("accepts a pre-slugified key as well as a display name", () => {
    expect(getPhotoURL("blue-dream")).toBe(
      "https://images.leafly.com/flower-images/blue-dream.png",
    );
  });

  test("resolves SLUG_ALIASES so popular short-forms work", () => {
    // "gsc" is the popular alias for "girl-scout-cookies".
    expect(getPhotoURL("gsc")).toBe(
      "https://images.leafly.com/flower-images/gsc.png",
    );
    expect(getPhotoURL("GSC")).toBe(
      "https://images.leafly.com/flower-images/gsc.png",
    );
  });

  test("returns undefined for unknown slugs (no curated photo)", () => {
    expect(getPhotoURL("nope-not-a-strain")).toBeUndefined();
  });

  test("returns undefined for empty / whitespace input", () => {
    expect(getPhotoURL("")).toBeUndefined();
    expect(getPhotoURL("   ")).toBeUndefined();
  });
});
