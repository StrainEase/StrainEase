import { afterEach, describe, expect, test } from "bun:test";
import {
  _resetCatalogForTests,
  canonicalProfileName,
  canonicalStrainName,
  registerCatalogName,
} from "./canonical-strain-name";

describe("canonicalStrainName (pure title-case)", () => {
  test("title-cases a lowercase strain name", () => {
    expect(canonicalStrainName("banana og")).toBe("Banana OG");
  });

  test("preserves acronyms in all caps", () => {
    expect(canonicalStrainName("og kush")).toBe("OG Kush");
  });

  test("title-cases each hyphenated part", () => {
    expect(canonicalStrainName("grand-daddy purple")).toBe(
      "Grand-Daddy Purple",
    );
  });

  test("leaves numbers and following words intact", () => {
    expect(canonicalStrainName("9 pound hammer")).toBe("9 Pound Hammer");
  });

  test("returns empty string for empty / nullish input", () => {
    expect(canonicalStrainName(null)).toBe("");
    expect(canonicalStrainName(undefined)).toBe("");
    expect(canonicalStrainName("")).toBe("");
    expect(canonicalStrainName("   ")).toBe("");
  });

  test("title-cases already-mixed-case names", () => {
    expect(canonicalStrainName("BLUE dream")).toBe("Blue Dream");
  });

  test("does not lowercase the first word", () => {
    expect(canonicalStrainName("the cure")).toBe("The Cure");
  });

  test("title-cases single-word input", () => {
    expect(canonicalStrainName("gelato")).toBe("Gelato");
  });

  test("preserves cbd / thc acronyms regardless of input casing", () => {
    expect(canonicalStrainName("cbd cream")).toBe("CBD Cream");
    expect(canonicalStrainName("THC bomb")).toBe("THC Bomb");
  });

  test("keeps articles lowercase mid-name but capitalises the first word", () => {
    expect(canonicalStrainName("purple haze")).toBe("Purple Haze");
    expect(canonicalStrainName("KILLER OF")).toBe("Killer of");
  });

  test("normalises acronym + number tokens to all-caps prefix", () => {
    expect(canonicalStrainName("GG4")).toBe("GG4");
    expect(canonicalStrainName("gg4")).toBe("GG4");
    expect(canonicalStrainName("Gg4")).toBe("GG4");
    expect(canonicalStrainName("gorilla glue gg4")).toBe("Gorilla Glue GG4");
    expect(canonicalStrainName("Gorilla Glue GG4")).toBe("Gorilla Glue GG4");
  });

  test("preserves known all-caps acronyms even without numbers", () => {
    expect(canonicalStrainName("gdp")).toBe("GDP");
    expect(canonicalStrainName("GDP")).toBe("GDP");
    expect(canonicalStrainName("Gdp")).toBe("GDP");
    expect(canonicalStrainName("gsc")).toBe("GSC");
    expect(canonicalStrainName("gg")).toBe("GG");
  });

  test("leaves non-acronym letter+digit tokens alone", () => {
    expect(canonicalStrainName("Trainwreck 9")).toBe("Trainwreck 9");
    // "abc4" prefix isn't a known acronym so it falls back to
    // title-case rather than silently upper-casing.
    expect(canonicalStrainName("abc4")).toBe("Abc4");
  });

  test("preserves spk, gmo, mac, fpog, ak, rs, mk acronyms", () => {
    // SPK (Sour Patch Kids) — the missing-acronym case that triggered
    // the web acronym expansion; mirrored here so server-side
    // normalisation doesn't regress it.
    expect(canonicalStrainName("spk")).toBe("SPK");
    expect(canonicalStrainName("Spk")).toBe("SPK");
    expect(canonicalStrainName("SPK")).toBe("SPK");
    expect(canonicalStrainName("sour patch kids")).toBe("Sour Patch Kids");

    expect(canonicalStrainName("gmo cookies")).toBe("GMO Cookies");
    expect(canonicalStrainName("mac")).toBe("MAC");
    expect(canonicalStrainName("mac 1")).toBe("MAC 1");
    expect(canonicalStrainName("fpog")).toBe("FPOG");
    expect(canonicalStrainName("ak-47")).toBe("AK-47");
    expect(canonicalStrainName("rs11")).toBe("RS11");
    expect(canonicalStrainName("mk ultra")).toBe("MK Ultra");
    expect(canonicalStrainName("mk4")).toBe("MK4");
    expect(canonicalStrainName("gmo8")).toBe("GMO8");

    // "cap" stays title-cased — Cap Junky is a nickname, not an
    // acronym pronounced letter-by-letter.
    expect(canonicalStrainName("cap junky")).toBe("Cap Junky");
  });
});

describe("canonicalProfileName (catalog lookup)", () => {
  afterEach(() => {
    _resetCatalogForTests();
  });

  test("returns the registered catalog name when the slug matches", () => {
    registerCatalogName("blue dream", "Blue Dream");
    expect(canonicalProfileName("blue dream")).toBe("Blue Dream");
  });

  test("matches regardless of input casing / whitespace / punctuation", () => {
    registerCatalogName("grand-daddy purple", "Granddaddy Purple");
    expect(canonicalProfileName("Grand-Daddy Purple")).toBe(
      "Granddaddy Purple",
    );
    expect(canonicalProfileName("grand daddy purple")).toBe(
      "Granddaddy Purple",
    );
    expect(canonicalProfileName(" GRAND-DADDY  PURPLE ")).toBe(
      "Granddaddy Purple",
    );
  });

  test("falls back to the title-case normaliser when the slug isn't registered", () => {
    // Unknown strain — no catalog entry. Falls back to title-case so
    // the user still sees a sensibly-cased name (e.g. "Spk" → "SPK",
    // "blue dream" → "Blue Dream").
    expect(canonicalProfileName("spk")).toBe("SPK");
    expect(canonicalProfileName("blue dream")).toBe("Blue Dream");
  });

  test("uses the fallback argument when the slug isn't registered", () => {
    expect(canonicalProfileName("zzz unknown", "Zzz Unknown")).toBe(
      "Zzz Unknown",
    );
  });

  test("returns empty string for empty / nullish input and no fallback", () => {
    expect(canonicalProfileName("")).toBe("");
    expect(canonicalProfileName("   ")).toBe("");
  });

  test("first registration wins on conflict; later ones are warned and dropped", () => {
    const warnSpy = console.warn;
    const warnings: string[] = [];
    console.warn = (msg: string) => warnings.push(msg);
    try {
      registerCatalogName("blue dream", "Blue Dream");
      registerCatalogName("Blue Dream", "blue dream");
      expect(canonicalProfileName("blue dream")).toBe("Blue Dream");
      expect(warnings.length).toBe(1);
    } finally {
      console.warn = warnSpy;
    }
  });
});
