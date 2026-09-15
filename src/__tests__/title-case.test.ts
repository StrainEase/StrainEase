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
    // Tokens like "Abc4" where the letter prefix isn't a known strain
    // acronym fall back to ordinary title-casing rather than silently
    // upper-casing them. (Note: "mk4" used to live here, but "mk" is now a
    // known acronym for MK Ultra, so the mk4 → MK4 case moved to the
    // "preserves spk, gmo, mac, fpog, ak, rs, mk acronyms" test below.)
    expect(toTitleCase("abc4")).toBe("Abc4");
  });

  test("preserves spk, gmo, mac, fpog, ak, rs, mk acronyms", () => {
    // SPK (Sour Patch Kids) — the missing-acronym case that triggered
    // this expansion.
    expect(toTitleCase("spk")).toBe("SPK");
    expect(toTitleCase("Spk")).toBe("SPK");
    expect(toTitleCase("SPK")).toBe("SPK");
    expect(toTitleCase("sour patch kids")).toBe("Sour Patch Kids");

    // Common strain prefixes already present in the catalog.
    expect(toTitleCase("gmo cookies")).toBe("GMO Cookies");
    expect(toTitleCase("mac")).toBe("MAC");
    expect(toTitleCase("mac 1")).toBe("MAC 1");
    expect(toTitleCase("fpog")).toBe("FPOG");
    expect(toTitleCase("ak-47")).toBe("AK-47");
    expect(toTitleCase("rs11")).toBe("RS11");
    expect(toTitleCase("mk ultra")).toBe("MK Ultra");
    // Acronym + number variants now normalise too, since the letter
    // prefix is a known acronym.
    expect(toTitleCase("mk4")).toBe("MK4");
    expect(toTitleCase("gmo8")).toBe("GMO8");

    // "cap" stays title-cased because the strain "Cap Junky" is named
    // after a person/nickname, not an acronym pronounced letter-by-letter.
    expect(toTitleCase("cap junky")).toBe("Cap Junky");
  });
});
