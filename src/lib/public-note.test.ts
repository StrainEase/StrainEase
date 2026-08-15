import { describe, expect, test } from "bun:test";
import { clipPublicNote, PUBLIC_NOTE_MAX } from "./saved-strains";

describe("clipPublicNote", () => {
  test("clips to the Firestore rule max (size < 2000)", () => {
    const text = "x".repeat(2000);
    const clipped = clipPublicNote(text);
    expect(clipped.length).toBe(PUBLIC_NOTE_MAX);
    expect(clipped.length).toBeLessThan(2000);
  });

  test("trims empty notes", () => {
    expect(clipPublicNote("   ")).toBe("");
  });
});
