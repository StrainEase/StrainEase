import { describe, expect, test } from "bun:test";
import {
  AGE_CLAIM_TTL_MS,
  calculateAge,
  evaluateAge,
  isRegionCode,
  minimumAgeFor,
  requireAgeVerified,
} from "./age";

const FIXED_NOW = new Date("2026-08-17T12:00:00Z");

describe("isRegionCode / minimumAgeFor", () => {
  test("accepts all known region codes", () => {
    for (const code of ["US", "CA", "CA-AB", "EU", "UK", "AU", "OTHER"]) {
      expect(isRegionCode(code)).toBe(true);
    }
  });

  test("rejects unknown / nullish / non-string codes", () => {
    expect(isRegionCode("XX")).toBe(false);
    expect(isRegionCode(null)).toBe(false);
    expect(isRegionCode(undefined)).toBe(false);
    expect(isRegionCode(21)).toBe(false);
  });

  test("returns the right minimum age for each region", () => {
    expect(minimumAgeFor("US")).toBe(21);
    expect(minimumAgeFor("CA")).toBe(19);
    expect(minimumAgeFor("CA-AB")).toBe(18);
    expect(minimumAgeFor("EU")).toBe(18);
    expect(minimumAgeFor("OTHER")).toBe(21);
  });
});

describe("calculateAge", () => {
  test("counts completed years correctly across the birthday boundary", () => {
    expect(calculateAge("2000-08-16", new Date("2026-08-16T00:00:00Z"))).toBe(
      26,
    );
    expect(calculateAge("2000-08-16", new Date("2026-08-15T00:00:00Z"))).toBe(
      25,
    );
  });

  test("returns 0 for malformed dates", () => {
    expect(calculateAge("not-a-date")).toBe(0);
  });
});

describe("evaluateAge", () => {
  test("accepts a 21-year-old in the US", () => {
    const r = evaluateAge("US", "2005-01-01", FIXED_NOW);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.age).toBe(21);
      expect(r.region).toBe("US");
    }
  });

  test("rejects a 19-year-old in the US (underage)", () => {
    expect(evaluateAge("US", "2007-01-01", FIXED_NOW)).toEqual({
      ok: false,
      reason: "underage",
    });
  });

  test("accepts a 19-year-old in Canada", () => {
    expect(evaluateAge("CA", "2007-01-01", FIXED_NOW).ok).toBe(true);
  });

  test("flags invalid regions, malformed dates, and future dates", () => {
    expect(evaluateAge("XX", "2000-01-01", FIXED_NOW)).toEqual({
      ok: false,
      reason: "invalid-region",
    });
    expect(evaluateAge("US", "not-a-date", FIXED_NOW)).toEqual({
      ok: false,
      reason: "invalid-birth-date",
    });
    expect(evaluateAge("US", "2099-01-01", FIXED_NOW)).toEqual({
      ok: false,
      reason: "birth-date-in-future",
    });
    expect(evaluateAge("US", "1800-01-01", FIXED_NOW)).toEqual({
      ok: false,
      reason: "invalid-birth-date",
    });
  });
});

class FakeError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

describe("requireAgeVerified", () => {
  test("rejects unauthenticated callers", () => {
    expect(() =>
      requireAgeVerified({ auth: null }, FakeError as never),
    ).toThrow(/Sign in/);
  });

  test("rejects callers missing the ageVerified claim", () => {
    expect(() =>
      requireAgeVerified(
        { auth: { uid: "u1", token: {} } },
        FakeError as never,
      ),
    ).toThrow(/verify your age/);
  });

  test("rejects callers with an expired claim", () => {
    expect(() =>
      requireAgeVerified(
        {
          auth: {
            uid: "u1",
            token: {
              ageVerified: true,
              ageVerifiedExpiresAt: Date.now() - 1000,
              ageVerifiedRegion: "US",
            },
          },
        },
        FakeError as never,
      ),
    ).toThrow(/expired/);
  });

  test("accepts a caller with a fresh claim and returns uid + region", () => {
    const result = requireAgeVerified(
      {
        auth: {
          uid: "u1",
          token: {
            ageVerified: true,
            ageVerifiedExpiresAt: Date.now() + AGE_CLAIM_TTL_MS,
            ageVerifiedRegion: "US",
          },
        },
      },
      FakeError as never,
    );
    expect(result.uid).toBe("u1");
    expect(result.region).toBe("US");
  });

  test("falls back to OTHER when region claim is missing", () => {
    const result = requireAgeVerified(
      {
        auth: {
          uid: "u1",
          token: {
            ageVerified: true,
            ageVerifiedExpiresAt: Date.now() + AGE_CLAIM_TTL_MS,
          },
        },
      },
      FakeError as never,
    );
    expect(result.region).toBe("OTHER");
  });
});