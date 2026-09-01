import { describe, expect, test } from "bun:test";
import {
  compareStrainPayload,
  normalizeCitations,
  __testing,
} from "./index";

describe("compareStrainPayload", () => {
  test("sends researched fields even when inKnowledgeBase is false", () => {
    const payload = compareStrainPayload({
      name: "Unknown Kush",
      inKnowledgeBase: false,
      type: "hybrid",
      thcRange: "~20%",
      description: "Commonly reported as evening-leaning.",
      communityNotes: [{ source: "Reddit · r/trees", text: "Helped me sleep." }],
    });
    expect(payload).toMatchObject({
      name: "Unknown Kush",
      type: "hybrid",
      thcRange: "~20%",
      description: "Commonly reported as evening-leaning.",
      noCuratedProfile: true,
    });
    expect("communityNotes" in payload).toBe(true);
  });

  test("keeps a true stub as name-only", () => {
    expect(compareStrainPayload({ name: "Mystery", inKnowledgeBase: false })).toEqual({
      name: "Mystery",
      noCuratedProfile: true,
    });
  });

  test("caps long descriptions, terpenes, effects, medicalUses, and communityNotes so the LLM payload stays under Groq's free-tier 8K TPM", () => {
    const longText = "x".repeat(5000);
    const payload = compareStrainPayload({
      name: "Verbose",
      inKnowledgeBase: true,
      type: "hybrid",
      description: longText,
      terpenes: Array.from({ length: 12 }, (_, i) => ({
        name: `terp-${i}`,
        profile: "p".repeat(300),
      })),
      effects: Array.from({ length: 10 }, (_, i) => ({
        name: `effect-${i}`,
        intensity: 5,
      })),
      medicalUses: Array.from({ length: 10 }, (_, i) => `use-${i}`),
      communityNotes: Array.from({ length: 5 }, (_, i) => ({
        source: `s-${i}`,
        text: "t".repeat(600),
      })),
    });
    expect((payload.description as string).length).toBeLessThanOrEqual(801); // 800 + ellipsis
    expect(payload.description as string).toMatch(/…$/);
    expect((payload.terpenes as unknown[]).length).toBe(5);
    expect(
      (payload.terpenes as Array<{ profile: string }>).every(
        (t) => t.profile.length <= 81,
      ),
    ).toBe(true);
    expect((payload.effects as unknown[]).length).toBe(6);
    expect((payload.medicalUses as string[]).length).toBe(6);
    expect((payload.communityNotes as unknown[]).length).toBe(2);
    expect(
      (payload.communityNotes as Array<{ text: string }>).every(
        (n) => n.text.length <= 281,
      ),
    ).toBe(true);
  });
});

describe("normalizeCitations", () => {
  test("accepts the closed citation shape and drops malformed entries", () => {
    expect(
      normalizeCitations([
        {
          id: "leafly-gdp",
          source: "https://www.leafly.com/strains/granddaddy-purple",
          label: "Granddaddy Purple profile",
          kind: "leafly",
        },
        {
          id: "bad-kind",
          source: "https://example.com/source",
          label: "Unsupported",
          kind: "blog",
        },
        {
          id: "bad-url",
          source: "not-a-url",
          label: "Not a source",
          kind: "review",
        },
      ]),
    ).toEqual([
      {
        id: "leafly-gdp",
        source: "https://www.leafly.com/strains/granddaddy-purple",
        label: "Granddaddy Purple profile",
        kind: "leafly",
      },
    ]);
  });

  test("dedupes identical citation id/source pairs and caps output", () => {
    const source = {
      id: "source-1",
      source: "https://pubmed.ncbi.nlm.nih.gov/12345/",
      label: "A review",
      kind: "pubmed",
    };
    expect(normalizeCitations([source, source])).toHaveLength(1);
    expect(
      normalizeCitations(
        Array.from({ length: 25 }, (_, i) => ({
          id: `source-${i}`,
          source: `https://example.com/${i}`,
          label: `Source ${i}`,
          kind: "review",
        })),
      ),
    ).toHaveLength(20);
  });
});

describe("citation-aware prompts", () => {
  test("shared prompt guardrail and compare contract mention citations", () => {
    expect(__testing.COMPARE_SYSTEM_PROMPT).toContain('"citations"');
    expect(__testing.COMPARE_SYSTEM_PROMPT).toContain("Never invent a PMID");
    expect(__testing.RECOMMEND_SYSTEM_PROMPT).toContain('"citations"');
    expect(__testing.DESCRIBE_SYSTEM_PROMPT).toContain('"citations"');
  });
});
