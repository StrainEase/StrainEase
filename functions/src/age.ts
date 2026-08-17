// Server-side age policy. Duplicates the rules in `src/lib/age-policy.ts`
// because the functions package uses a separate node_modules from the web
// app. Keep the two in sync if you change the region list.

export const AGE_CLAIM_TTL_MS = 30 * 24 * 60 * 60 * 1000;

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

type CallableTokenLike = Record<string, unknown>;

type CallableAuthLike = {
  uid?: string;
  token?: CallableTokenLike;
};

export type CallableRequestLike = {
  auth?: CallableAuthLike | null;
};

/**
 * Throws HttpsError if the request is unauthenticated or the caller does not
 * have a non-expired age-verified custom claim.
 */
export function requireAgeVerified(
  request: CallableRequestLike,
  HttpsErrorCtor: new (
    code:
      | "unauthenticated"
      | "permission-denied"
      | "failed-precondition"
      | "invalid-argument",
    message: string,
  ) => Error,
): { uid: string; region: string } {
  const auth = request.auth;
  if (!auth || !auth.uid) {
    throw new HttpsErrorCtor("unauthenticated", "Sign in to use this feature.");
  }
  const token = auth.token ?? {};
  if (token.ageVerified !== true) {
    throw new HttpsErrorCtor(
      "permission-denied",
      "Please verify your age before using this feature.",
    );
  }
  const expiresAt =
    typeof token.ageVerifiedExpiresAt === "number"
      ? token.ageVerifiedExpiresAt
      : 0;
  if (expiresAt <= Date.now()) {
    throw new HttpsErrorCtor(
      "permission-denied",
      "Your age verification has expired. Please verify again.",
    );
  }
  const region =
    typeof token.ageVerifiedRegion === "string"
      ? token.ageVerifiedRegion
      : "OTHER";
  return { uid: auth.uid, region };
}