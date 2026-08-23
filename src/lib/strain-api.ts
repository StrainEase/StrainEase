import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import type { ResearchPrefs } from "./research-prefs";
import type { RedditSource, StrainProfile } from "./strain-profile";

// Response shapes returned by the Firebase Functions backend (functions/src).
export type StrainAnalysis = {
  headline: string;
  summary: string;
  forCondition: {
    best: string;
    why: string;
    runnerUp: string;
  } | null;
  keyDifferences: string[];
  commonGround: string[];
  cautions: string[];
  redditSources?: RedditSource[];
};

export type StrainComparison = {
  strains: StrainProfile[];
  analysis: StrainAnalysis;
  resultId?: string;
};

export type StrainRecommendation = {
  strainName: string;
  reason: string;
  bestFor: string;
  caution: string;
};

export type RecommendationResult = {
  headline: string;
  summary: string;
  recommendations: StrainRecommendation[];
  strains: StrainProfile[];
  redditSources?: RedditSource[];
  resultId?: string;
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

/** Popular strains on Leafly right now (public callable). */
export function popularStrains(): Promise<StrainProfile[]> {
  return call<Record<string, never>, StrainProfile[]>("popularStrains", {});
}

/** Look up one strain by name on Leafly (public callable). */
export function searchStrain(name: string): Promise<StrainProfile | null> {
  return call<{ name: string }, StrainProfile | null>("searchStrain", {
    name,
  });
}

/** Side-by-side comparison (auth-gated callable). */
export function compareStrains(args: {
  strainNames: string[];
  condition?: string[];
  prefs?: ResearchPrefs;
  /** Human-readable language name, e.g. "English". Defaults to English. */
  language?: string;
}): Promise<StrainComparison> {
  return call<typeof args, StrainComparison>("compareStrains", args);
}

/** Best strains for a patient's symptoms (auth-gated callable). */
export function recommendStrains(args: {
  conditions: string[];
  potency?: "mild" | "balanced" | "strong";
  prefs?: ResearchPrefs;
  /** Human-readable language name, e.g. "English". Defaults to English. */
  language?: string;
}): Promise<RecommendationResult> {
  return call<typeof args, RecommendationResult>(
    "recommendStrainsForConditions",
    args,
  );
}

/** One of the three sections returned by describeStrainForUser. */
export type StrainDescriptionSection = {
  heading: string;
  body: string;
};

/**
 * Three-section description payload. Always exactly three sections:
 *   - "Overview"
 *   - "What it might do for you"
 *   - "What to expect"
 */
export type StrainDescription = {
  sections: [StrainDescriptionSection, StrainDescriptionSection, StrainDescriptionSection];
};

/**
 * Generate a three-section, patient-tailored description for a single
 * strain. The middle section is written around the patient's saved
 * ailments, with medications and recent relief-log history used to
 * calibrate (caution-only on meds — never "stop your prescription").
 * Surrounding sections stay mostly general. The function is auth-gated
 * on the backend so the saved ailments are not exposed to guest
 * traffic, but it will also rate-limit guest callers.
 */
export function describeStrainForUser(args: {
  strain: StrainProfile;
  ailments: string[];
  medications?: string[];
  /** Pre-summarized relief log prose, newest first. Backend caps at 800 chars. */
  reliefHistory?: string;
  /** Human-readable language name, e.g. "English". Defaults to English. */
  language?: string;
}): Promise<StrainDescription> {
  return call<typeof args, StrainDescription>("describeStrainForUser", args);
}

/** Result for a cached strain image request. */
export type CachedStrainImage = {
  url: string;
  contentType: string;
  bytes: number;
  source: "memory" | "storage" | "network";
};

/**
 * Cache a strain image and return a signed URL the browser can fetch
 * directly. Repeated calls for the same URL hit the Storage copy
 * instead of re-downloading from Leafly, so images load much faster
 * after the first request.
 */
export function cachedStrainImage(url: string): Promise<CachedStrainImage> {
  return call<{ url: string }, CachedStrainImage>("cachedStrainImage", {
    url,
  });
}

/** Lightweight strain preview used for directory listings and browse pagination. */
export type StrainPreview = {
  name: string;
  slug: string;
  type?: string;
  thcRange?: string;
  imageUrl?: string;
  leaflyRating?: number;
};

/** A page of catalog previews from browseStrains. */
export type BrowseCatalogPage = {
  previews: StrainPreview[];
  totalCount: number;
  offset: number;
  fetchedAt: number;
};

/** Browse the full Leafly catalog with pagination. Returns lightweight previews. */
export function browseStrains(args: {
  offset?: number;
  limit?: number;
}): Promise<BrowseCatalogPage> {
  return call<{ offset: number; limit: number }, BrowseCatalogPage>(
    "browseStrains",
    { offset: args.offset ?? 0, limit: args.limit ?? 24 },
  );
}

/** A medical-marijuana doctor clinic scraped from Leafly's public directory. */
export type Doctor = {
  id: string;
  name: string;
  slug: string;
  url: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  lat: number | null;
  lon: number | null;
  /** Distance from the caller's coordinates in miles. Null when coords were not provided. */
  distanceMi: number | null;
  rating: number | null;
  reviewCount: number | null;
  reviewSnippet: string | null;
  logoUrl: string | null;
  timezone: string | null;
};

export type DoctorQuery = {
  lat?: number;
  lon?: number;
  city?: string;
  state?: string;
  zip?: string;
  radiusMiles?: number;
};

export type DoctorResult = {
  doctors: Doctor[];
  resolvedLocation: { city: string; state: string; lat: number; lon: number } | null;
  source: string;
};

/**
 * Look up medical-marijuana doctors near the patient. Public callable —
 * no sign-in required. Returns Leafly's top 30 clinics closest to the
 * resolved location, re-ranked by haversine distance from the caller's
 * coordinates when lat/lon is provided.
 */
export function findDoctors(args: DoctorQuery): Promise<DoctorResult> {
  return call<DoctorQuery, DoctorResult>("findDoctors", args);
}

/**
 * Result for an `elaborateSection` request.
 *
 * `elaboration` is a short prose expansion of one of the three sections
 * returned by `describeStrainForUser` (Overview / What it might do for
 * you / What to expect). The body is 2-4 paragraphs separated by blank
 * lines, written for this strain and the caller's saved ailments /
 * medications / relief-log history.
 */
export type ElaboratedSection = {
  elaboration: string;
};

/**
 * Ask the AI to expand a single section of the tailored strain
 * description. The web client surfaces this behind the ✨ Ask Maya
 * button on each section header. Same age-verification + rate-limit
 * contract as `describeStrainForUser`.
 */
export function elaborateSection(args: {
  strain: StrainProfile;
  /** The heading of the section to expand, e.g. "What it might do for you". */
  sectionHeading: string;
  /** The current body of the section, so the model can extend it. */
  sectionBody: string;
  ailments?: string[];
  medications?: string[];
  reliefHistory?: string;
  language?: string;
}): Promise<ElaboratedSection> {
  return call<typeof args, ElaboratedSection>("elaborateSection", args);
}

/** Community star rating for a strain. */
export type StrainReview = {
  id: string;
  strainSlug: string;
  uid: string;
  displayName: string;
  starRating: number;
  reviewText?: string;
  consumptionForm?: "flower" | "cart" | "edible" | "tincture";
  createdAt: number;
  updatedAt?: number;
};

/** Aggregated rating for a strain. */
export type StrainRating = {
  strainSlug: string;
  avgRating: number;
  reviewCount: number;
  totalStars: number;
};

/**
 * Submit or update a star rating + optional written review for a strain.
 * Auth-gated + age-verified on the server. Returns the updated aggregate.
 */
export function submitStrainReview(args: {
  strainSlug: string;
  starRating: number;
  reviewText?: string;
  consumptionForm?: "flower" | "cart" | "edible" | "tincture";
}): Promise<{ ok: true; reviewId: string; avgRating: number; reviewCount: number }> {
  return call<typeof args, { ok: true; reviewId: string; avgRating: number; reviewCount: number }>(
    "submitStrainReview",
    args,
  );
}
