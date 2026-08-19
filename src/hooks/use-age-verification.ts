// React hook over the localStorage-backed age gate. Mirrors `useAuth`'s
// pattern: a hook, not a provider. Returns the current verification state
// plus a `verify({ region, birthDate })` action and a `reset()` for shared
// devices.
//
// When the caller is signed in, `verify` also notifies the Firebase backend
// (`setAgeVerified` callable) so the matching custom claim is set. That keeps
// the AI synthesis / doctor callables from rejecting the user with
// "permission-denied" right after they pass the gate.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { setAgeVerified } from "@/lib/strain-api";
import { auth } from "@/lib/firebase";
import {
  evaluateAge,
  isRecordValid,
  type AgeVerificationRecord,
  type AgeCheckFailure,
  type Region,
  type RegionCode,
} from "@/lib/age-policy";
import {
  clearAgeVerification,
  readAgeVerification,
  writeAgeVerification,
} from "@/lib/age-storage";

export type AgeVerificationState =
  | { status: "loading" }
  | { status: "unverified"; reason?: AgeCheckFailure; lastRecord?: AgeVerificationRecord }
  | {
      status: "verified";
      record: AgeVerificationRecord;
      region: Region;
      age: number;
    };

export type VerifyInput = {
  region: RegionCode;
  birthDate: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
};

// Deduplicate concurrent claim mirrors (e.g. three Ask Maya buttons on one
// page all hitting ensureBackendClaim after a permission-denied response).
let mirrorInFlight: Promise<boolean> | null = null;
let mirrorSucceeded = false;

async function mirrorClaimToBackend(record: AgeVerificationRecord): Promise<boolean> {
  if (mirrorSucceeded) return true;
  if (mirrorInFlight) return mirrorInFlight;

  mirrorInFlight = (async () => {
    try {
      await setAgeVerified({
        region: record.region,
        birthDate: record.birthDate,
        termsAccepted: true,
        privacyAccepted: true,
      });
      try {
        await auth?.currentUser?.getIdToken(true);
      } catch {
        // best-effort refresh; the next token cycle will pick up the claim
      }
      mirrorSucceeded = true;
      return true;
    } catch {
      console.warn(
        "[age-verification] Failed to mirror attestation to the backend; signed-in AI features may reject requests until the next verify.",
      );
      return false;
    } finally {
      mirrorInFlight = null;
    }
  })();

  return mirrorInFlight;
}

export function useAgeVerification(): {
  state: AgeVerificationState;
  verify: (input: VerifyInput) => Promise<
    | { ok: true; record: AgeVerificationRecord }
    | { ok: false; reason: AgeCheckFailure }
  >;
  /** Ensure the Firebase ageVerified claim is set from the local record. */
  ensureBackendClaim: () => Promise<boolean>;
  reset: () => void;
  recheck: () => void;
} {
  const { isAuthenticated } = useAuth();
  const [record, setRecord] = useState<AgeVerificationRecord | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const claimSyncedRef = useRef(false);

  useEffect(() => {
    setRecord(readAgeVerification());
    setHydrated(true);
  }, []);

  const reset = useCallback(() => {
    clearAgeVerification();
    setRecord(null);
    claimSyncedRef.current = false;
    mirrorSucceeded = false;
  }, []);

  const recheck = useCallback(() => {
    setRecord(readAgeVerification());
  }, []);

  const ensureBackendClaim = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated) return false;
    const current = record && isRecordValid(record) ? record : readAgeVerification();
    if (!current || !isRecordValid(current)) return false;
    const ok = await mirrorClaimToBackend(current);
    if (ok) claimSyncedRef.current = true;
    return ok;
  }, [isAuthenticated, record]);

  // Sync local attestation → Firebase custom claim whenever the user is
  // signed in with a valid local record. Previously this only ran on the
  // signed-out → signed-in transition, so users who were already signed in
  // when the page loaded (or who verified age while signed out, then signed
  // in on a later session) kept hitting "Please verify your age…" on AI
  // callables like Ask Maya.
  useEffect(() => {
    if (!hydrated || !isAuthenticated) return;
    if (!record || !isRecordValid(record)) return;
    if (claimSyncedRef.current) return;

    let cancelled = false;
    void mirrorClaimToBackend(record).then((ok) => {
      if (!cancelled && ok) claimSyncedRef.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, isAuthenticated, record]);

  const verify = useCallback(
    async (input: VerifyInput) => {
      const evaluation = evaluateAge(input.birthDate, input.region);
      if (!evaluation.ok) {
        return { ok: false as const, reason: evaluation.reason };
      }
      const written = writeAgeVerification({
        region: input.region,
        birthDate: input.birthDate,
      });
      if (!written) {
        return {
          ok: false as const,
          reason: "storage-unavailable" as AgeCheckFailure,
        };
      }
      setRecord(written);
      claimSyncedRef.current = false;
      mirrorSucceeded = false;

      // Sync to the backend when signed in. If Firebase isn't configured
      // (no env vars), the callable rejects — that's fine for local dev
      // without Firebase; the local gate still works.
      if (isAuthenticated) {
        const ok = await mirrorClaimToBackend(written);
        if (ok) claimSyncedRef.current = true;
      }

      return { ok: true as const, record: written };
    },
    [isAuthenticated],
  );

  // Drop expired / no-longer-valid records so the gate reappears.
  useEffect(() => {
    if (!hydrated || !record) return;
    if (record.expiresAt <= Date.now()) {
      clearAgeVerification();
      setRecord(null);
      return;
    }
    const evaluation = evaluateAge(record.birthDate, record.region);
    if (!evaluation.ok) {
      clearAgeVerification();
      setRecord(null);
    }
  }, [hydrated, record]);

  const state: AgeVerificationState = useMemo(() => {
    if (!hydrated) return { status: "loading" };
    if (!record) return { status: "unverified" };
    if (record.expiresAt <= Date.now()) {
      return { status: "unverified", reason: undefined, lastRecord: record };
    }
    const evaluation = evaluateAge(record.birthDate, record.region);
    if (!evaluation.ok) {
      return {
        status: "unverified",
        reason: evaluation.reason,
        lastRecord: record,
      };
    }
    return {
      status: "verified",
      record,
      region: evaluation.region,
      age: evaluation.age,
    };
  }, [record, hydrated]);

  return { state, verify, ensureBackendClaim, reset, recheck };
}
