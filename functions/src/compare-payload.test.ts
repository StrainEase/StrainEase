import { describe, expect, test } from "bun:test";
import { compareStrainPayload } from "./index";

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
});
