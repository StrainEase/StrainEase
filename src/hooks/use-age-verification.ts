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
  getRegion,
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

export function useAgeVerification(): {
  state: AgeVerificationState;
  verify: (input: VerifyInput) => Promise<
    | { ok: true; record: AgeVerificationRecord }
    | { ok: false; reason: AgeCheckFailure }
  >;
  reset: () => void;
  recheck: () => void;
} {
  const { isAuthenticated } = useAuth();
  const [record, setRecord] = useState<AgeVerificationRecord | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setRecord(readAgeVerification());
    setHydrated(true);
  }, []);

  const reset = useCallback(() => {
    clearAgeVerification();
    setRecord(null);
  }, []);

  const recheck = useCallback(() => {
    setRecord(readAgeVerification());
  }, []);

  const prevAuthenticated = useRef(isAuthenticated);

  useEffect(() => {
    if (
      isAuthenticated &&
      !prevAuthenticated.current &&
      record &&
      isRecordValid(record) &&
      hydrated
    ) {
      setAgeVerified({
        region: record.region,
        birthDate: record.birthDate,
        termsAccepted: true,
        privacyAccepted: true,
      }).then(() => auth?.currentUser?.getIdToken(true)).catch(() => {});
    }
    prevAuthenticated.current = isAuthenticated;
  }, [isAuthenticated, record, hydrated]);

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
          reason: "invalid-birth-date" as AgeCheckFailure,
        };
      }
      setRecord(written);

      // Sync to the backend when signed in. If Firebase isn't configured
      // (no env vars), the callable rejects — that's fine for local dev
      // without Firebase; the local gate still works.
      if (isAuthenticated) {
        try {
          await setAgeVerified({
            region: input.region,
            birthDate: input.birthDate,
            termsAccepted: input.termsAccepted,
            privacyAccepted: input.privacyAccepted,
          });
          try {
            await auth?.currentUser?.getIdToken(true);
          } catch {
            // best-effort refresh; the next token cycle will pick up the claim
          }
        } catch {
          // Surface a soft warning to the caller via console — the UI
          // shouldn't block on this, since the local gate is the source of
          // truth for the page-level experience.
          console.warn(
            "[age-verification] Failed to mirror attestation to the backend; signed-in AI features may reject requests until the next verify.",
          );
        }
      }

      return { ok: true as const, record: written };
    },
    [isAuthenticated],
  );

  const state: AgeVerificationState = useMemo(() => {
    if (!hydrated) return { status: "loading" };
    if (!record) return { status: "unverified" };
    if (record.expiresAt <= Date.now()) {
      return { status: "unverified", reason: undefined, lastRecord: record };
    }
    const region = getRegion(record.region);
    const age = evaluateAge(record.birthDate, record.region).ok
      ? (evaluateAge(record.birthDate, record.region) as { age: number }).age
      : 0;
    return { status: "verified", record, region, age };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record, hydrated]);

  return { state, verify, reset, recheck };
}