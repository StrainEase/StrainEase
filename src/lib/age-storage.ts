// localStorage wrapper for the age-verification record. Centralized so the
// key, schema version, and SSR/disabled-storage guards live in one place.
//
// We deliberately store only the bare minimum: region code, ISO birth date,
// and timestamps. No PII like name, email, or IP. Re-attestation refreshes
// the timestamp and TTL.

import {
  buildRecord,
  isRecordValid,
  type AgeVerificationRecord,
  type RegionCode,
} from "./age-policy";

const STORAGE_KEY = "strainease.ageVerification.v1";

function hasStorage(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

export function readAgeVerification(): AgeVerificationRecord | null {
  if (!hasStorage()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    if (!isRecordValid(parsed as AgeVerificationRecord)) {
      // Schema drift or expired — drop the stale record.
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed as AgeVerificationRecord;
  } catch {
    return null;
  }
}

export function writeAgeVerification(input: {
  region: RegionCode;
  birthDate: string;
  now?: number;
}): AgeVerificationRecord | null {
  if (!hasStorage()) return null;
  const record = buildRecord(input);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    return record;
  } catch {
    return null;
  }
}

export function clearAgeVerification(): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}