// React hook over the localStorage-backed age gate. Mirrors `useAuth`'s
// pattern: a hook, not a provider. Returns the current verification state
// plus a `verify({ region, birthDate })` action and a `reset()` for shared
// devices.
//
// Local gate is the source of truth. No server-side custom claim enforcement
// — the AI synthesis and doctor callables trust the client's gate implicitly.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  evaluateAge,
  getRegion,
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
      return { ok: true as const, record: written };
    },
    [],
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