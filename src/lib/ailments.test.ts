import { describe, expect, test } from "bun:test";
import {
  AILMENT_NAME_MAX,
  AILMENTS_MAX,
  ailmentsCloudData,
  ailmentsEqual,
  clipAilmentName,
  normalizeAilments,
} from "./ailments";

describe("normalizeAilments", () => {
  test("trims, de-dupes case-insensitively, and caps length", () => {
    expect(
      normalizeAilments(["Anxiety", " anxiety ", "OCD", "", "ADHD"]),
    ).toEqual(["Anxiety", "OCD", "ADHD"]);
    expect(ailmentsEqual(["ADHD", "Anxiety"], ["anxiety", "adhd"])).toBe(true);
    expect(ailmentsEqual(["Anxiety"], ["ADHD"])).toBe(false);
  });

  test("clips each name and the list to the Firestore rule max", () => {
    const long = "x".repeat(80);
    expect(clipAilmentName(long).length).toBe(AILMENT_NAME_MAX);
    const many = Array.from({ length: 20 }, (_, i) => `Ailment ${i}`);
    const doc = ailmentsCloudData(many, 1);
    expect(doc.ailments).toHaveLength(AILMENTS_MAX);
    expect(doc.ailmentsUpdatedAt).toBe(1);
    expect(doc.ailments.every((name) => name.length <= AILMENT_NAME_MAX)).toBe(
      true,
    );
  });
});
