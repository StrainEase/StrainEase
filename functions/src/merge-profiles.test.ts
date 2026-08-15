import { describe, expect, test } from "bun:test";
import { mergeProfiles } from "./enrich";

describe("mergeProfiles", () => {
  test("keeps the requested name so finder cards can match recommendations", () => {
    const merged = mergeProfiles("GSC", {
      name: "Girl Scout Cookies",
      inKnowledgeBase: true,
      type: "hybrid",
      thcRange: "17–28%",
    }, null);
    expect(merged.name).toBe("GSC");
    expect(merged.type).toBe("hybrid");
    expect(merged.thcRange).toBe("17–28%");
  });
});
