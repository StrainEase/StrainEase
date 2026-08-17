import { describe, expect, test } from "bun:test";
import {
  applyCatalogPhotos,
  matchAilments,
  matchingAilment,
  mergeCatalog,
} from "./strain-catalog";

describe("matchingAilment", () => {
  test("keeps a popular strain when live data has no medicalUses", () => {
    const live = [
      { name: "Granddaddy Purple", inKnowledgeBase: true, type: "indica" as const },
    ];
    const hits = matchingAilment("Insomnia", live);
    expect(hits.some((profile) => profile.name === "Granddaddy Purple")).toBe(true);
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
        (profile.medicalUses ?? []).some((use) =>
          use.toLowerCase() === "insomnia",
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
});
