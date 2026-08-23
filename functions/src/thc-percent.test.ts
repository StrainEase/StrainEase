import { describe, expect, test } from "bun:test";
import {
  averagePercent,
  formatPercent,
  parsePercentMidpoint,
  type PercentSource,
} from "./thc-percent";

describe("parsePercentMidpoint", () => {
  test("parses en-dash ranges", () => {
    expect(parsePercentMidpoint("17–24%")).toBe(20.5);
  });

  test("parses hyphen ranges and tolerates whitespace", () => {
    expect(parsePercentMidpoint("20-22 %")).toBeCloseTo(21);
    expect(parsePercentMidpoint("16-21%")).toBeCloseTo(18.5);
  });

  test("parses em-dash ranges", () => {
    expect(parsePercentMidpoint("16—21%")).toBeCloseTo(18.5);
  });

  test("parses single values, tilde, and missing percent sign", () => {
    expect(parsePercentMidpoint("~20%")).toBe(20);
    expect(parsePercentMidpoint("19%")).toBe(19);
    expect(parsePercentMidpoint("20")).toBe(20);
  });

  test("treats <N% as N - 0.5 (half-step below the ceiling)", () => {
    expect(parsePercentMidpoint("<1%")).toBe(0.5);
    expect(parsePercentMidpoint("<2%")).toBe(1.5);
  });

  test("strips a leading 'THC:' or 'CBD:' label the caller has already removed", () => {
    // The parser itself only handles digits / separators / prefixes —
    // it does NOT understand "THC:" or "CBD:". The consolidator is
    // responsible for stripping the label before calling the parser,
    // and we assert the contract here so the parser isn't accidentally
    // taught to be clever.
    expect(parsePercentMidpoint("THC: 17%")).toBeNull();
    expect(parsePercentMidpoint("17%")).toBe(17);
  });

  test("returns null for missing or unparseable input", () => {
    expect(parsePercentMidpoint(undefined)).toBeNull();
    expect(parsePercentMidpoint("")).toBeNull();
    expect(parsePercentMidpoint("abc")).toBeNull();
    expect(parsePercentMidpoint("--")).toBeNull();
    expect(parsePercentMidpoint("unknown")).toBeNull();
  });
});

describe("formatPercent", () => {
  test("drops the decimal on integer midpoints", () => {
    expect(formatPercent(20)).toBe("20%");
    expect(formatPercent(0)).toBe("0%");
  });

  test("keeps one decimal when needed", () => {
    expect(formatPercent(20.5)).toBe("20.5%");
    expect(formatPercent(20.456)).toBe("20.5%");
  });

  test("clamps negatives and non-finite to 0%", () => {
    expect(formatPercent(-1)).toBe("0%");
    expect(formatPercent(Number.NaN)).toBe("0%");
    expect(formatPercent(Number.POSITIVE_INFINITY)).toBe("0%");
  });
});

describe("averagePercent", () => {
  test("averages parsed midpoints and preserves the raw values", () => {
    const values: PercentSource[] = [
      { source: "leafly", raw: "17-24%", mid: 20.5 },
      { source: "allbud", raw: "20%", mid: 20 },
    ];
    const out = averagePercent(values);
    expect(out?.mid).toBeCloseTo(20.25);
    expect(out?.sources).toHaveLength(2);
    expect(out?.sources[0].raw).toBe("17-24%");
  });

  test("drops unparseable sources and averages the rest", () => {
    const values: PercentSource[] = [
      { source: "leafly", raw: "unknown", mid: null },
      { source: "allbud", raw: "20%", mid: 20 },
      { source: "weedmaps", raw: "22%", mid: 22 },
    ];
    const out = averagePercent(values);
    expect(out?.mid).toBe(21);
    // raw unparseable source still preserved for the attribution
    expect(out?.sources.find((s) => s.source === "leafly")?.raw).toBe("unknown");
  });

  test("returns null when every source is unparseable", () => {
    const values: PercentSource[] = [
      { source: "leafly", raw: "abc", mid: null },
      { source: "allbud", raw: "?", mid: null },
    ];
    expect(averagePercent(values)).toBeNull();
  });

  test("returns the single midpoint when only one source is usable", () => {
    const values: PercentSource[] = [
      { source: "leafly", raw: "20%", mid: 20 },
      { source: "allbud", raw: "abc", mid: null },
    ];
    const out = averagePercent(values);
    expect(out?.mid).toBe(20);
  });
});
