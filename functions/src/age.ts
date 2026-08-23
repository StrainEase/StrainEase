// Server-side age policy. Duplicates the rules in `src/lib/age-policy.ts`
// because the functions package uses a separate node_modules from the web
// app. Keep the two in sync if you change the region list.

export type RegionCode =
  | "US"
  | "CA"
  | "CA-AB"
  | "EU"
  | "UK"
  | "AU"
  | "OTHER";

const REGION_MIN_AGE: Record<RegionCode, number> = {
  US: 21,
  CA: 19,
  "CA-AB": 18,
  EU: 18,
  UK: 18,
  AU: 18,
  OTHER: 21,
};

export function isRegionCode(value: unknown): value is RegionCode {
  return typeof value === "string" && value in REGION_MIN_AGE;
}

export function minimumAgeFor(region: RegionCode): number {
  return REGION_MIN_AGE[region];
}

export function calculateAge(birthDate: string, now: Date = new Date()): number {
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

export type AgeEvaluation =
  | { ok: true; age: number; region: RegionCode }
  | { ok: false; reason: AgeEvaluationFailure };

export type AgeEvaluationFailure =
  | "invalid-region"
  | "invalid-birth-date"
  | "birth-date-in-future"
  | "underage";

export function evaluateAge(
  region: unknown,
  birthDate: unknown,
  now: Date = new Date(),
): AgeEvaluation {
  if (!isRegionCode(region)) return { ok: false, reason: "invalid-region" };
  if (typeof birthDate !== "string" || birthDate === "") {
    return { ok: false, reason: "invalid-birth-date" };
  }

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

  const age = calculateAge(birthDate, now);
  if (age < REGION_MIN_AGE[region]) {
    return { ok: false, reason: "underage" };
  }
  if (age > 120) {
    return { ok: false, reason: "invalid-birth-date" };
  }

  return { ok: true, age, region };
}