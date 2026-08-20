import { describe, expect, test } from "bun:test";
import { toTitleCase } from "@/lib/title-case";

describe("toTitleCase", () => {
  test("title-cases a lowercase strain name", () => {
    expect(toTitleCase("banana og")).toBe("Banana OG");
  });

  test("preserves acronyms in all caps", () => {
    expect(toTitleCase("og kush")).toBe("OG Kush");
  });

  test("title-cases each hyphenated part", () => {
    expect(toTitleCase("grand-daddy purple")).toBe("Grand-Daddy Purple");
  });

  test("leaves numbers and following words intact", () => {
    expect(toTitleCase("9 pound hammer")).toBe("9 Pound Hammer");
  });

  test("returns empty string for empty / nullish input", () => {
    expect(toTitleCase(null)).toBe("");
    expect(toTitleCase(undefined)).toBe("");
    expect(toTitleCase("")).toBe("");
    expect(toTitleCase("   ")).toBe("");
  });

  test("title-cases already-mixed-case names", () => {
    expect(toTitleCase("BLUE dream")).toBe("Blue Dream");
  });

  test("does not lowercase the first word", () => {
    expect(toTitleCase("the cure")).toBe("The Cure");
  });

  test("title-cases single-word input", () => {
    expect(toTitleCase("gelato")).toBe("Gelato");
  });

  test("preserves cbd / thc acronyms regardless of input casing", () => {
    expect(toTitleCase("cbd cream")).toBe("CBD Cream");
    expect(toTitleCase("THC bomb")).toBe("THC Bomb");
  });

  test("keeps articles lowercase mid-name but capitalises the first word", () => {
    expect(toTitleCase("purple haze")).toBe("Purple Haze");
    expect(toTitleCase("KILLER OF")).toBe("Killer of");
  });
});
