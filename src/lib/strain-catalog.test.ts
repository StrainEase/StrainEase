import { describe, expect, test } from "bun:test";
import {
  applyCatalogPhotos,
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
