import { describe, expect, test } from "bun:test";
import { CONDITIONS, matchesCondition, typeBadgeClass } from "./strain-ui";

describe("matchesCondition", () => {
  test("matches a condition by exact label", () => {
    expect(matchesCondition(["Insomnia"], "Insomnia")).toBe(true);
  });

  test("case-insensitive", () => {
    expect(matchesCondition(["insomnia"], "Insomnia")).toBe(true);
    expect(matchesCondition(["INSOMNIA"], "Insomnia")).toBe(true);
  });

  test("matches aliases (OCD -> Anxiety)", () => {
    expect(matchesCondition(["Anxiety"], "OCD")).toBe(true);
  });

  test("returns false when no overlap", () => {
    expect(matchesCondition(["Chronic pain"], "Insomnia")).toBe(false);
  });

  test("returns false on missing/empty uses", () => {
    expect(matchesCondition(undefined, "Insomnia")).toBe(false);
    expect(matchesCondition([], "Insomnia")).toBe(false);
  });

  test("CONDITIONS list is non-empty", () => {
    expect(CONDITIONS.length).toBeGreaterThan(5);
  });
});

describe("typeBadgeClass", () => {
  test("returns a non-empty class for known types", () => {
    expect(typeBadgeClass("indica")).toContain("bg-");
    expect(typeBadgeClass("sativa")).toContain("bg-");
    expect(typeBadgeClass("hybrid")).toContain("bg-");
  });

  test("falls back gracefully for unknown types", () => {
    expect(typeBadgeClass("unknown")).toContain("bg-");
  });
});
