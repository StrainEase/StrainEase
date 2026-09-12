import { describe, expect, test } from "bun:test";
import { __testing } from "./index";

const {
  normalizeReasoning,
  normalizeRecommendations,
  RECOMMEND_SYSTEM_PROMPT,
} = __testing;

describe("RECOMMEND_SYSTEM_PROMPT", () => {
  test("requires the new reasoning field in the JSON shape", () => {
    expect(RECOMMEND_SYSTEM_PROMPT).toContain('"reasoning"');
    expect(RECOMMEND_SYSTEM_PROMPT).toContain("matchedConditions");
    expect(RECOMMEND_SYSTEM_PROMPT).toContain("preferencesApplied");
    expect(RECOMMEND_SYSTEM_PROMPT).toContain("evidence");
    expect(RECOMMEND_SYSTEM_PROMPT).toContain("considerations");
  });

  test("tells the model to source-anchor every evidence bullet", () => {
    // The prompt should constrain source values so a sloppy model
    // can't invent a free-form source label.
    expect(RECOMMEND_SYSTEM_PROMPT).toContain('"Leafly"');
    expect(RECOMMEND_SYSTEM_PROMPT).toContain('"Weedmaps"');
    expect(RECOMMEND_SYSTEM_PROMPT).toContain('"Allbud"');
    expect(RECOMMEND_SYSTEM_PROMPT).toContain('"Reddit"');
    expect(RECOMMEND_SYSTEM_PROMPT).toContain('"Aggregated"');
    expect(RECOMMEND_SYSTEM_PROMPT).toContain('"Patient history"');
  });
});

describe("normalizeReasoning", () => {
  test("returns undefined when the field is missing (older model output)", () => {
    expect(normalizeReasoning(undefined)).toBeUndefined();
    expect(normalizeReasoning(null)).toBeUndefined();
    expect(normalizeReasoning("nope")).toBeUndefined();
  });

  test("returns undefined when evidence is empty (no auditable backing)", () => {
    expect(
      normalizeReasoning({
        matchedConditions: ["Insomnia"],
        preferencesApplied: ["Night"],
        evidence: [],
        considerations: [],
      }),
    ).toBeUndefined();
  });

  test("clamps lists to the documented caps", () => {
    const out = normalizeReasoning({
      matchedConditions: Array.from({ length: 20 }, (_, i) => `c${i}`),
      preferencesApplied: Array.from({ length: 20 }, (_, i) => `p${i}`),
      considerations: Array.from({ length: 20 }, (_, i) => `k${i}`),
      evidence: Array.from({ length: 20 }, (_, i) => ({
        source: "Leafly",
        quote: `q${i}`,
      })),
    });
    expect(out?.matchedConditions).toHaveLength(8);
    expect(out?.preferencesApplied).toHaveLength(8);
    expect(out?.considerations).toHaveLength(4);
    expect(out?.evidence).toHaveLength(6);
  });

  test("accepts only the documented source labels, falls back to Aggregated otherwise", () => {
    const out = normalizeReasoning({
      matchedConditions: [],
      preferencesApplied: [],
      considerations: [],
      evidence: [
        { source: "Leafly", quote: "ok" },
        { source: "random-blog", quote: "ok" },
        { source: "Weedmaps", quote: "ok" },
      ],
    });
    expect(out?.evidence[0]?.source).toBe("Leafly");
    expect(out?.evidence[1]?.source).toBe("Aggregated");
    expect(out?.evidence[2]?.source).toBe("Weedmaps");
  });

  test("skips evidence bullets with empty quotes (no half-anchored claims)", () => {
    const out = normalizeReasoning({
      matchedConditions: [],
      preferencesApplied: [],
      considerations: [],
      evidence: [
        { source: "Leafly", quote: "" },
        { source: "Leafly", quote: "  " },
        { source: "Leafly", quote: "ok" },
      ],
    });
    expect(out?.evidence).toHaveLength(1);
    expect(out?.evidence[0]?.quote).toBe("ok");
  });
});

describe("normalizeRecommendations", () => {
  test("parses the reasoning field when present", () => {
    const out = normalizeRecommendations([
      {
        strainName: "Blue Dream",
        reason: "Often reported as uplifting and calming.",
        bestFor: "Daytime",
        caution: "May dry mouth.",
        reasoning: {
          matchedConditions: ["Insomnia"],
          preferencesApplied: ["Night"],
          evidence: [
            { source: "Leafly", quote: "78% of reviewers report sleep." },
          ],
          considerations: ["Start low."],
        },
      },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]?.reasoning?.evidence[0]?.source).toBe("Leafly");
    expect(out[0]?.reasoning?.evidence[0]?.quote).toContain("78%");
  });

  test("skips the reasoning block when evidence is empty (auditable chain required)", () => {
    const out = normalizeRecommendations([
      {
        strainName: "OG Kush",
        reason: "Classic.",
        bestFor: "Evening",
        caution: "Potent.",
        reasoning: {
          matchedConditions: ["Pain"],
          preferencesApplied: [],
          evidence: [],
          considerations: [],
        },
      },
    ]);
    expect(out[0]?.reasoning).toBeUndefined();
  });

  test("drops the reasoning block on older payloads without the field", () => {
    const out = normalizeRecommendations([
      {
        strainName: "Northern Lights",
        reason: "Reliable.",
        bestFor: "Night",
        caution: "Heavy.",
      },
    ]);
    expect(out[0]?.reasoning).toBeUndefined();
  });
});

