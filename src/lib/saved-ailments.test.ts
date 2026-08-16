import { describe, expect, test } from "bun:test";
import { AILMENTS_MAX, normalizeAilments } from "./saved-ailments";

describe("normalizeAilments", () => {
  test("trims whitespace and drops empty entries", () => {
    expect(
      normalizeAilments(["  Anxiety ", "", "   ", "Insomnia"]),
    ).toEqual(["Anxiety", "Insomnia"]);
  });

  test("dedupes case-insensitively, keeping the first spelling", () => {
    expect(
      normalizeAilments(["Insomnia", "insomnia", "INSOMNIA", "Anxiety"]),
    ).toEqual(["Insomnia", "Anxiety"]);
  });

  test(`caps the result at ${AILMENTS_MAX} entries`, () => {
    const many = Array.from({ length: 20 }, (_, i) => `Ailment ${i}`);
    const out = normalizeAilments(many);
    expect(out).toHaveLength(AILMENTS_MAX);
    expect(out[0]).toBe("Ailment 0");
  });

  test("returns an empty list for an empty input", () => {
    expect(normalizeAilments([])).toEqual([]);
  });
});
