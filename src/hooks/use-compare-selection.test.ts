import { describe, expect, test } from "bun:test";
import {
  CAP,
  COMPARE_STORAGE_KEY,
  dedupeAndCap,
  parseStrains,
  readStoredStrains,
  serializeStrains,
  writeStoredStrains,
} from "./use-compare-selection";

describe("CAP", () => {
  test("is 3 (matches the compareStrains Cloud Function cap)", () => {
    expect(CAP).toBe(3);
  });
});

describe("parseStrains", () => {
  test("returns an empty array for null/undefined/missing input", () => {
    expect(parseStrains(null)).toEqual([]);
    expect(parseStrains(undefined)).toEqual([]);
    expect(parseStrains("")).toEqual([]);
  });

  test("splits a single comma-separated value", () => {
    expect(parseStrains("Blue Dream")).toEqual(["Blue Dream"]);
    expect(parseStrains("Blue Dream,OG Kush")).toEqual([
      "Blue Dream",
      "OG Kush",
    ]);
  });

  test("trims whitespace around names", () => {
    expect(parseStrains("  Blue Dream  ,  OG Kush  ")).toEqual([
      "Blue Dream",
      "OG Kush",
    ]);
  });

  test("drops empty segments (trailing comma, double comma, etc.)", () => {
    expect(parseStrains("Blue Dream,")).toEqual(["Blue Dream"]);
    expect(parseStrains("Blue Dream,,OG Kush")).toEqual(["Blue Dream", "OG Kush"]);
    expect(parseStrains(",")).toEqual([]);
  });

  test("dedupes case-insensitively, preserving the first casing", () => {
    expect(parseStrains("Blue Dream,blue dream,BLUE DREAM")).toEqual([
      "Blue Dream",
    ]);
    expect(parseStrains("blue dream,Blue Dream")).toEqual(["blue dream"]);
    expect(parseStrains("A,a,A,B,b,B")).toEqual(["A", "B"]);
  });

  test("caps at CAP entries after dedup", () => {
    expect(parseStrains("A,B,C,D,E")).toEqual(["A", "B", "C"]);
    expect(parseStrains("a,A,b,B,c,C,d")).toEqual(["a", "b", "c"]);
  });

  test("dedupes before capping, so a noisy URL with duplicates still fits", () => {
    // 7 entries dedupe to 3 unique; the cap doesn't drop the third.
    expect(parseStrains("A,a,A,B,b,B,C")).toEqual(["A", "B", "C"]);
  });
});

describe("serializeStrains", () => {
  test("joins names with a comma", () => {
    expect(serializeStrains(["Blue Dream", "OG Kush"])).toBe(
      "Blue Dream,OG Kush",
    );
  });

  test("returns an empty string for an empty selection", () => {
    expect(serializeStrains([])).toBe("");
  });
});

describe("parseStrains ∘ serializeStrains round trip", () => {
  test("parse(serialize(names)) === names", () => {
    const inputs: string[][] = [
      [],
      ["Blue Dream"],
      ["Blue Dream", "OG Kush"],
      ["A", "B", "C"],
    ];
    for (const names of inputs) {
      expect(parseStrains(serializeStrains(names))).toEqual(names);
    }
  });

  test("round trip is case-insensitive for repeats (Blue Dream == blue dream)", () => {
    const before = ["Blue Dream", "OG Kush"];
    const round = parseStrains(serializeStrains(before));
    expect(round.map((n) => n.toLowerCase())).toEqual(
      before.map((n) => n.toLowerCase()),
    );
    // Length and dedup semantics preserved.
    expect(round.length).toBe(before.length);
  });

  test("round trip with names containing commas splits them apart (known limitation)", () => {
    // `?strains=` is comma-separated, so any strain name that itself
    // contains a comma collides with the separator. Strain names
    // pulled from Leafly don't contain commas, but if a future
    // catalog entry does, it will silently split into two entries on
    // the round-trip. Trimming still normalizes whitespace around the
    // accidental boundary.
    const names = ["Blue Dream, OG Kush"];
    expect(parseStrains(serializeStrains(names))).toEqual([
      "Blue Dream",
      "OG Kush",
    ]);
  });
});

describe("dedupeAndCap", () => {
  test("trims whitespace and drops empties", () => {
    expect(dedupeAndCap(["", "  ", "A"])).toEqual(["A"]);
    expect(dedupeAndCap(["  Blue Dream  "])).toEqual(["Blue Dream"]);
  });

  test("dedupes case-insensitively, keeping the first occurrence", () => {
    expect(dedupeAndCap(["A", "a", "A", "B"])).toEqual(["A", "B"]);
    expect(dedupeAndCap(["blue dream", "Blue Dream", "BLUE DREAM"])).toEqual([
      "blue dream",
    ]);
  });

  test("caps at CAP entries", () => {
    expect(dedupeAndCap(["A", "B", "C", "D", "E"])).toEqual(["A", "B", "C"]);
  });

  test("caps after dedup, so duplicates don't waste the budget", () => {
    expect(dedupeAndCap(["A", "A", "A", "B", "B", "C", "D"])).toEqual([
      "A",
      "B",
      "C",
    ]);
  });

  test("returns an empty array for empty input", () => {
    expect(dedupeAndCap([])).toEqual([]);
  });
});

describe("sessionStorage compare selection", () => {
  test("round-trips names so a strain page can toggle without losing the tray", () => {
    sessionStorage.removeItem(COMPARE_STORAGE_KEY);
    expect(readStoredStrains()).toEqual([]);
    expect(writeStoredStrains(["Blue Dream", "GDP", "GDP"])).toEqual([
      "Blue Dream",
      "GDP",
    ]);
    expect(readStoredStrains()).toEqual(["Blue Dream", "GDP"]);
    expect(writeStoredStrains([])).toEqual([]);
    expect(readStoredStrains()).toEqual([]);
  });
});