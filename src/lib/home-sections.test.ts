import { describe, expect, test } from "bun:test";
import {
  HOME_AILMENTS,
  parseBrowseParams,
  previewFor,
  sectionHref,
  sectionTitle,
  strainsFor,
} from "./home-sections";
import type { StrainProfile } from "./strain-profile";

const live: StrainProfile[] = [
  {
    name: "Blue Dream",
    inKnowledgeBase: true,
    type: "hybrid",
    thcRange: "17–24%",
    medicalUses: ["Chronic pain", "Stress", "Anxiety", "Depression", "Fatigue"],
  },
  {
    name: "Granddaddy Purple",
    inKnowledgeBase: true,
    type: "indica",
    thcRange: "17–23%",
    medicalUses: ["Insomnia", "Chronic pain", "Anxiety", "PTSD", "Stress"],
  },
  {
    name: "Sour Diesel",
    inKnowledgeBase: true,
    type: "sativa",
    thcRange: "19–24%",
    medicalUses: ["ADHD", "Stress", "Depression", "Fatigue"],
  },
];

describe("parseBrowseParams", () => {
  test("recognises for-you as the forYou section", () => {
    expect(parseBrowseParams("for-you")).toEqual({ kind: "forYou" });
  });

  test("tolerates the camelCase form", () => {
    expect(parseBrowseParams("forYou")).toEqual({ kind: "forYou" });
  });

  test("rejects unknown sections", () => {
    expect(parseBrowseParams("bogus")).toBeNull();
  });

  test("resolves ailment slugs back to a CONDITIONS label", () => {
    expect(parseBrowseParams("ailment", "insomnia")).toEqual({
      kind: "ailment",
      name: "Insomnia",
    });
  });
});

describe("section helpers", () => {
  test("sectionHref routes forYou to /browse/for-you", () => {
    expect(sectionHref({ kind: "forYou" })).toBe("/browse/for-you");
  });

  test("sectionHref kebab-cases ailment names", () => {
    expect(sectionHref({ kind: "ailment", name: "Nausea & appetite" })).toBe(
      "/browse/ailment/nausea-appetite",
    );
  });

  test("sectionTitle returns the iOS-aligned forYou copy", () => {
    expect(sectionTitle({ kind: "forYou" })).toBe(
      "Top picks for your symptoms",
    );
  });
});

describe("strainsFor / previewFor", () => {
  test("forYou with no ailments returns an empty list (don't personalize)", () => {
    expect(strainsFor({ kind: "forYou" }, live, [], [])).toHaveLength(0);
  });

  test("forYou ranks strains that cover more saved ailments first", () => {
    const matches = strainsFor(
      { kind: "forYou" },
      live,
      [],
      ["Stress", "Anxiety", "Depression"],
    );
    expect(matches[0]?.name).toBe("Blue Dream");
  });

  test("forYou respects the preview limit", () => {
    const preview = previewFor(
      { kind: "forYou" },
      live,
      [],
      ["Stress", "Anxiety", "Depression"],
      2,
    );
    expect(preview.length).toBeLessThanOrEqual(2);
  });

  test("recents surface the recents list (with catalog photo enrichment)", () => {
    const recents: StrainProfile[] = [
      { name: "Northern Lights", inKnowledgeBase: true, type: "indica" },
    ];
    const result = strainsFor({ kind: "recents" }, live, recents);
    expect(result.map((profile) => profile.name)).toEqual(["Northern Lights"]);
  });

  test("HOME_AILMENTS still drives the carousel when no ailments are saved", () => {
    expect(HOME_AILMENTS).toContain("Insomnia");
    expect(HOME_AILMENTS.length).toBeGreaterThan(0);
  });
});
