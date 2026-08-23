// Age-restriction policy for StrainEase.
//
// StrainEase is a research / information tool, not a dispensary. Cannabis laws
// vary by jurisdiction and we don't sell product here, but we still gate
// the experience behind a date-of-birth + region self-attestation so that
// minors in any jurisdiction can't load strain information.
//
// Minimum age rules by region, current as of 2026:
//
//   - US (recreational & medical markets)        — 21+
//   - Canada (most provinces / territories)     — 19+
//   - Canada (Alberta)                          — 18+
//   - EU (Germany, Netherlands, Malta, etc.)    — 18+
//   - UK (medicinal only, prescription)         — 18+
//   - Australia (medicinal, ACT 18+ recreat.)   — 18+
//   - Other                                    — 18+ (conservative default)
//
// We deliberately default to 21+ when the user picks a country we don't list,
// which is the safest choice under California's advertising-to-minors rules.

export type RegionCode =
  | "US"
  | "CA"
  | "CA-AB"
  | "EU"
  | "UK"
  | "AU"
  | "OTHER";

export type Region = {
  code: RegionCode;
  label: string;
  minimumAge: number;
  legalNote: string;
};

export const REGIONS: Region[] = [
  {
    code: "US",
    label: "United States",
    minimumAge: 21,
    legalNote:
      "Cannabis laws vary by state. StrainEase provides research information only; check your local and state laws.",
  },
  {
    code: "CA",
    label: "Canada (except Alberta)",
    minimumAge: 19,
    legalNote:
      "Provincial minimum age is 19 in most provinces and territories. StrainEase is a research tool, not a retailer.",
  },
  {
    code: "CA-AB",
    label: "Canada (Alberta)",
    minimumAge: 18,
    legalNote:
      "Alberta's minimum age is 18. StrainEase is a research tool, not a retailer.",
  },
  {
    code: "EU",
    label: "European Union",
    minimumAge: 18,
    legalNote:
      "Most EU member states set 18 as the minimum age for medical or adult-use cannabis. Verify the specific rules where you live.",
  },
  {
    code: "UK",
    label: "United Kingdom",
    minimumAge: 18,
    legalNote:
      "Cannabis is currently prescription-only in the UK. StrainEase provides general research information, not prescriptions.",
  },
  {
    code: "AU",
    label: "Australia",
    minimumAge: 18,
    legalNote:
      "Cannabis is prescription-only nationally except the ACT, where adults 18+ may possess small amounts. StrainEase does not dispense.",
  },
  {
    code: "OTHER",
    label: "Other / not listed",
    minimumAge: 21,
    legalNote:
      "When we can't match your region we apply the strictest common standard (21+). StrainEase is research-only.",
  },
];

export function isRegionCode(value: unknown): value is RegionCode {
  return (
    typeof value === "string" &&
    REGIONS.some((region) => region.code === value)
  );
}

export function getRegion(code: RegionCode | null | undefined): Region {
  return REGIONS.find((r) => r.code === code) ?? REGIONS[REGIONS.length - 1]!;
}

/** How long a successful attestation is considered valid. */
export const AGE_VERIFICATION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/** Earliest birth year we accept (guards against absurd values). */
export const MIN_BIRTH_YEAR = 1900;

export type AgeVerificationRecord = {
  region: RegionCode;
  /** ISO date string YYYY-MM-DD (UTC calendar date of birth). */
  birthDate: string;
  /** Epoch ms when the user attested. */
  attestedAt: number;
  /** Epoch ms when the attestation expires and must be repeated. */
  expiresAt: number;
  termsAcceptedAt: number;
  privacyAcceptedAt: number;
  version: 1;
};

export function ageInYears(birthDate: string, now: Date = new Date()): number {
  const parsed = new Date(`${birthDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return 0;
  const nowUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  let years = nowUtc.getUTCFullYear() - parsed.getUTCFullYear();
  const monthDelta = nowUtc.getUTCMonth() - parsed.getUTCMonth();
  if (
    monthDelta < 0 ||
    (monthDelta === 0 && nowUtc.getUTCDate() < parsed.getUTCDate())
  ) {
    years -= 1;
  }
  return years;
}

export type AgeCheckResult =
  | { ok: true; age: number; region: Region }
  | { ok: false; reason: AgeCheckFailure };

export type AgeCheckFailure =
  | "missing-birth-date"
  | "invalid-birth-date"
  | "birth-date-in-future"
  | "birth-date-too-old"
  | "underage"
  | "storage-unavailable";

export function evaluateAge(
  birthDate: string,
  regionCode: RegionCode | null | undefined,
  now: Date = new Date(),
): AgeCheckResult {
  if (!birthDate) return { ok: false, reason: "missing-birth-date" };

  const parsed = new Date(`${birthDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return { ok: false, reason: "invalid-birth-date" };
  }

  const nowUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  if (parsed.getTime() > nowUtc.getTime()) {
    return { ok: false, reason: "birth-date-in-future" };
  }

  if (parsed.getUTCFullYear() < MIN_BIRTH_YEAR) {
    return { ok: false, reason: "birth-date-too-old" };
  }

  const region = getRegion(regionCode);
  const age = ageInYears(birthDate, now);

  if (age < region.minimumAge) {
    return { ok: false, reason: "underage" };
  }

  return { ok: true, age, region };
}

export function isRecordValid(
  record: AgeVerificationRecord | null | undefined,
  now: number = Date.now(),
): record is AgeVerificationRecord {
  if (!record) return false;
  if (record.version !== 1) return false;
  if (!isRegionCode(record.region)) return false;
  if (!record.birthDate) return false;
  if (typeof record.attestedAt !== "number") return false;
  if (typeof record.expiresAt !== "number") return false;
  if (record.expiresAt <= now) return false;
  return true;
}

export function buildRecord(input: {
  region: RegionCode;
  birthDate: string;
  now?: number;
}): AgeVerificationRecord {
  const now = input.now ?? Date.now();
  return {
    region: input.region,
    birthDate: input.birthDate,
    attestedAt: now,
    expiresAt: now + AGE_VERIFICATION_TTL_MS,
    termsAcceptedAt: now,
    privacyAcceptedAt: now,
    version: 1,
  };
}

export const AGE_POLICY_VERSION = 1;
