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

  test("normalises acronym + number tokens to all-caps prefix", () => {
    expect(toTitleCase("GG4")).toBe("GG4");
    expect(toTitleCase("gg4")).toBe("GG4");
    expect(toTitleCase("Gg4")).toBe("GG4");
    expect(toTitleCase("gorilla glue gg4")).toBe("Gorilla Glue GG4");
    expect(toTitleCase("Gorilla Glue GG4")).toBe("Gorilla Glue GG4");
  });

  test("preserves known all-caps acronyms even without numbers", () => {
    expect(toTitleCase("gdp")).toBe("GDP");
    expect(toTitleCase("GDP")).toBe("GDP");
    expect(toTitleCase("Gdp")).toBe("GDP");
    expect(toTitleCase("gsc")).toBe("GSC");
    expect(toTitleCase("gg")).toBe("GG");
  });

  test("leaves non-acronym letter+digit tokens alone", () => {
    // "9" is a digit prefix so it passes through; "Trainwreck" title-cases.
    expect(toTitleCase("Trainwreck 9")).toBe("Trainwreck 9");
    // Tokens like "Mk4" where the prefix isn't a known acronym fall back
    // to ordinary title-casing rather than silently upper-casing them.
    expect(toTitleCase("mk4")).toBe("Mk4");
  });
});
