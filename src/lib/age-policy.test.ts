import { describe, expect, test } from "bun:test";
import {
  AGE_VERIFICATION_TTL_MS,
  ageInYears,
  buildRecord,
  evaluateAge,
  getRegion,
  isRecordValid,
  isRegionCode,
  REGIONS,
} from "./age-policy";

const FIXED_NOW = new Date("2026-08-17T12:00:00Z");

describe("REGIONS", () => {
  test("includes US, Canada, Alberta, EU, UK, AU, and a conservative fallback", () => {
    const codes = REGIONS.map((r) => r.code);
    expect(codes).toContain("US");
    expect(codes).toContain("CA");
    expect(codes).toContain("CA-AB");
    expect(codes).toContain("EU");
    expect(codes).toContain("UK");
    expect(codes).toContain("AU");
    expect(codes).toContain("OTHER");
  });

  test("every region has a label, age, and a legal note", () => {
    for (const region of REGIONS) {
      expect(region.label.length).toBeGreaterThan(0);
      expect(region.minimumAge).toBeGreaterThanOrEqual(18);
      expect(region.minimumAge).toBeLessThanOrEqual(21);
      expect(region.legalNote.length).toBeGreaterThan(0);
    }
  });
});

describe("getRegion / isRegionCode", () => {
  test("returns the matching region for known codes", () => {
    expect(getRegion("US").minimumAge).toBe(21);
    expect(getRegion("CA").minimumAge).toBe(19);
    expect(getRegion("CA-AB").minimumAge).toBe(18);
    expect(getRegion("EU").minimumAge).toBe(18);
    expect(getRegion("OTHER").minimumAge).toBe(21);
  });

  test("falls back to the conservative OTHER region for unknown / nullish", () => {
    expect(getRegion(null).code).toBe("OTHER");
    expect(getRegion(undefined).code).toBe("OTHER");
    expect(getRegion("MARS").code).toBe("OTHER");
  });

  test("isRegionCode validates known codes", () => {
    expect(isRegionCode("US")).toBe(true);
    expect(isRegionCode("CA-AB")).toBe(true);
    expect(isRegionCode("OTHER")).toBe(true);
    expect(isRegionCode("XX")).toBe(false);
    expect(isRegionCode(null)).toBe(false);
    expect(isRegionCode(21)).toBe(false);
  });
});

describe("ageInYears", () => {
  test("returns 0 for a baby born today", () => {
    const today = new Date("2026-08-17T00:00:00Z");
    expect(ageInYears("2026-08-17", today)).toBe(0);
  });

  test("counts years correctly across the birthday boundary", () => {
    // Born Aug 16, 2000. On Aug 16 2026 = 26. On Aug 17 2026 = 26. Day before = 25.
    expect(ageInYears("2000-08-16", new Date("2026-08-16T00:00:00Z"))).toBe(26);
    expect(ageInYears("2000-08-16", new Date("2026-08-17T00:00:00Z"))).toBe(26);
    expect(ageInYears("2000-08-16", new Date("2026-08-15T00:00:00Z"))).toBe(25);
  });

  test("returns 0 for malformed birth dates", () => {
    expect(ageInYears("not-a-date")).toBe(0);
  });
});

describe("evaluateAge", () => {
  test("accepts a 21-year-old in the US", () => {
    const result = evaluateAge("2005-01-01", "US", FIXED_NOW);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.age).toBe(21);
      expect(result.region.code).toBe("US");
    }
  });

  test("rejects a 20-year-old in the US", () => {
    const result = evaluateAge("2005-09-01", "US", FIXED_NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("underage");
  });

  test("accepts a 19-year-old in Canada (non-Alberta)", () => {
    const result = evaluateAge("2007-01-01", "CA", FIXED_NOW);
    expect(result.ok).toBe(true);
  });

  test("rejects a 19-year-old in Alberta (which is 18+)", () => {
    const result = evaluateAge("2007-01-01", "CA-AB", FIXED_NOW);
    expect(result.ok).toBe(true); // 19 >= 18
  });

  test("rejects a 17-year-old in Alberta", () => {
    const result = evaluateAge("2009-01-01", "CA-AB", FIXED_NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("underage");
  });

  test("accepts an 18-year-old in EU", () => {
    const result = evaluateAge("2008-01-01", "EU", FIXED_NOW);
    expect(result.ok).toBe(true);
  });

  test("rejects a 19-year-old when region falls back to OTHER (21+)", () => {
    const result = evaluateAge("2007-01-01", "OTHER", FIXED_NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("underage");
  });

  test("flags missing and future birth dates", () => {
    expect(evaluateAge("", "US", FIXED_NOW)).toEqual({
      ok: false,
      reason: "missing-birth-date",
    });
    expect(evaluateAge("2099-01-01", "US", FIXED_NOW)).toEqual({
      ok: false,
      reason: "birth-date-in-future",
    });
    expect(evaluateAge("not-a-date", "US", FIXED_NOW)).toEqual({
      ok: false,
      reason: "invalid-birth-date",
    });
    expect(evaluateAge("1800-01-01", "US", FIXED_NOW)).toEqual({
      ok: false,
      reason: "birth-date-too-old",
    });
  });
});

describe("buildRecord / isRecordValid", () => {
  test("builds a record with the standard 30-day expiry", () => {
    const record = buildRecord({
      region: "US",
      birthDate: "2000-01-01",
      now: 0,
    });
    expect(record.region).toBe("US");
    expect(record.birthDate).toBe("2000-01-01");
    expect(record.attestedAt).toBe(0);
    expect(record.expiresAt).toBe(AGE_VERIFICATION_TTL_MS);
    expect(record.version).toBe(1);
  });

  test("isRecordValid accepts fresh records and rejects expired / wrong-shape ones", () => {
    const fresh = buildRecord({
      region: "US",
      birthDate: "2000-01-01",
      now: 1_000_000,
    });
    expect(isRecordValid(fresh, 1_000_000 + 60_000)).toBe(true);
    expect(isRecordValid(fresh, fresh.expiresAt)).toBe(false);
    expect(isRecordValid(fresh, fresh.expiresAt + 1)).toBe(false);

    expect(isRecordValid(null)).toBe(false);
    expect(isRecordValid({ ...fresh, version: 2 } as never)).toBe(false);
    expect(isRecordValid({ ...fresh, region: "MARS" } as never)).toBe(false);
    expect(isRecordValid({ ...fresh, birthDate: "" } as never)).toBe(false);
  });
});