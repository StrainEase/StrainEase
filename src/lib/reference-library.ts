// Client-side wrapper for the reference library (terpenes + cannabinoids).
// Mirrors the types in `functions/src/reference-library.ts`. Used by
// the future strain detail "why might this work for you" block in PR 7
// (Why This Strain). This PR just exposes the lookup; no UI is added
// yet on web or Android.

import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

export type EvidenceGrade = "strong" | "moderate" | "limited" | "anecdotal";
export type SourceKind = "pubmed" | "review" | "nor.org" | "other";
export type Psychoactivity = "none" | "mild" | "moderate" | "high";

export type ReferenceSource = {
  label: string;
  url: string;
  kind: SourceKind;
};

export type TerpeneRecord = {
  slug: string;
  displayName: string;
  classDescription: string;
  aroma: string;
  commonSources: string[];
  mechanism: string;
  commonlyReportedEffects: string[];
  evidenceGrade: EvidenceGrade;
  sources: ReferenceSource[];
};

export type CannabinoidRecord = {
  slug: string;
  displayName: string;
  cb1Affinity: string;
  cb2Affinity: string;
  psychoactivity: Psychoactivity;
  mechanism: string;
  commonlyReportedEffects: string[];
  evidenceGrade: EvidenceGrade;
  sources: ReferenceSource[];
};

export type ReferenceLibrary = {
  terpenes: TerpeneRecord[];
  cannabinoids: CannabinoidRecord[];
};

function call<TArgs, TResult>(name: string, args: TArgs): Promise<TResult> {
  if (!functions) {
    return Promise.reject(
      new Error(
        "Firebase isn't configured yet — add your VITE_FIREBASE_* keys in the Keys tab, then deploy the functions.",
      ),
    );
  }
  return httpsCallable<TArgs, TResult>(functions, name)(args).then(
    (res) => res.data,
  );
}

/**
 * Fetch the full reference library. Both arrays are returned in the
 * same call so the client can keep a single in-memory cache and avoid
 * one round-trip per kind.
 */
export function fetchReferenceLibrary(): Promise<ReferenceLibrary> {
  return call<Record<string, never>, ReferenceLibrary>(
    "getReferenceLibrary",
    {},
  );
}

/**
 * Look up a single terpene by slug. Returns null when the slug is
 * unknown. The client cache may serve this without a network call
 * once `fetchReferenceLibrary` has resolved.
 */
export async function fetchTerpeneBySlug(
  slug: string,
  cache?: ReferenceLibrary,
): Promise<TerpeneRecord | null> {
  const normalized = slug.trim().toLowerCase();
  if (cache) {
    return cache.terpenes.find((t) => t.slug === normalized) ?? null;
  }
  const result = await call<
    { kind: "terpene"; slug: string },
    ReferenceLibrary
  >("getReferenceLibrary", { kind: "terpene", slug });
  return result.terpenes[0] ?? null;
}

/**
 * Look up a single cannabinoid by slug. Same caching pattern as
 * `fetchTerpeneBySlug`.
 */
export async function fetchCannabinoidBySlug(
  slug: string,
  cache?: ReferenceLibrary,
): Promise<CannabinoidRecord | null> {
  const normalized = slug.trim().toLowerCase();
  if (cache) {
    return cache.cannabinoids.find((c) => c.slug === normalized) ?? null;
  }
  const result = await call<
    { kind: "cannabinoid"; slug: string },
    ReferenceLibrary
  >("getReferenceLibrary", { kind: "cannabinoid", slug });
  return result.cannabinoids[0] ?? null;
}
