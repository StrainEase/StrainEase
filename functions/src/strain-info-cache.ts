// Server-side strain info cache.
//
// The Leafly scrapes are read-only and the resulting StrainProfile changes
// on the order of weeks. We don't want to re-fetch + re-parse the same
// strain detail page on every cold start of the Cloud Function instance,
// so we layer the same memory-then-storage pattern we use for images:
//
//   1. In-memory cache (Map<slug, {profile, fetchedAt}>). Resets when the
//      instance is recycled, but covers the common case of repeated hits
//      inside one warm window.
//   2. Firestore document at `strainCache/{slug}` with the parsed
//      StrainProfile JSON + fetchedAt timestamp. Survives cold starts.
//   3. The leafly.ts fallback. Only hit on cache miss.
//
// The Firestore path is best-effort: if the doc is missing or unreadable
// we fall through to the network. The admin SDK only has access to
// `strainCache`, so we do not need to expose this collection to clients.
//
// TTL: 24 hours. Strain data on Leafly is stable enough that we can hold
// onto a parsed profile for a full day before revalidating. We track
// `fetchedAt` so callers can choose to invalidate earlier if needed.

import { getFirestore } from "firebase-admin/firestore";
import type { StrainProfile } from "./types";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const COLLECTION = "strainCache";

type CacheEntry = {
  profile: StrainProfile;
  fetchedAt: number;
};

const memoryCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<CacheEntry | null>>();

export type StrainInfoSource = "memory" | "firestore" | "network";

export type CachedStrainInfo = {
  profile: StrainProfile;
  fetchedAt: number;
  source: StrainInfoSource;
};

/**
 * Restart the in-memory cache. Exposed for tests; not used in prod.
 */
export function clearStrainInfoCacheForTest(): void {
  memoryCache.clear();
  inflight.clear();
}

/** Stats for telemetry / tests. Firestore size is not measured. */
export function strainInfoCacheStats() {
  const now = Date.now();
  let fresh = 0;
  let stale = 0;
  for (const entry of memoryCache.values()) {
    if (now - entry.fetchedAt < CACHE_TTL_MS) fresh += 1;
    else stale += 1;
  }
  return { entries: memoryCache.size, fresh, stale };
}

function isFresherThan(entry: CacheEntry, now: number): boolean {
  return now - entry.fetchedAt < CACHE_TTL_MS;
}

function readFirestoreDoc(slug: string): Promise<CacheEntry | null> {
  return (async () => {
    try {
      const snap = await withTimeout(
        getFirestore().collection(COLLECTION).doc(slug).get(),
        1500,
      );
      if (!snap.exists) return null;
      const data = snap.data() as
        | { profile?: StrainProfile; fetchedAt?: number }
        | undefined;
      if (!data || !data.profile || typeof data.fetchedAt !== "number") {
        return null;
      }
      return { profile: data.profile, fetchedAt: data.fetchedAt };
    } catch {
      // Firestore unreachable — let the caller fall through to the network.
      return null;
    }
  })();
}

async function writeFirestoreDoc(
  slug: string,
  entry: CacheEntry,
): Promise<void> {
  try {
    await withTimeout(
      getFirestore()
        .collection(COLLECTION)
        .doc(slug)
        .set(
          { profile: entry.profile, fetchedAt: entry.fetchedAt },
          { merge: false },
        ),
      1500,
    );
  } catch {
    // Best-effort write. The memory cache already satisfies this request,
    // and a future cold start will simply re-fetch.
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("firestore-timeout")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (err) => {
        clearTimeout(t);
        reject(err);
      },
    );
  });
}

/**
 * Read a strain profile from the cache. Returns `null` on miss or when
 * the only cached entry is too old to trust; callers should fall through
 * to the network in that case.
 */
export async function getCachedStrainProfile(
  slug: string,
): Promise<CachedStrainInfo | null> {
  if (!slug) return null;
  const now = Date.now();

  const memHit = memoryCache.get(slug);
  if (memHit && isFresherThan(memHit, now)) {
    return { ...memHit, source: "memory" };
  }

  const fsHit = await readFirestoreDoc(slug);
  if (fsHit && isFresherThan(fsHit, now)) {
    memoryCache.set(slug, fsHit);
    return { ...fsHit, source: "firestore" };
  }

  return null;
}

/**
 * Persist a freshly-fetched profile to both the memory and Firestore
 * caches. Use this after a network success so the next cold start reads
 * from Firestore instead of re-hitting Leafly.
 */
export async function putCachedStrainProfile(
  slug: string,
  profile: StrainProfile,
): Promise<void> {
  if (!slug) return;
  const entry: CacheEntry = { profile, fetchedAt: Date.now() };
  memoryCache.set(slug, entry);
  // Coalesce concurrent writes: only one Firestore write per slug per
  // window. Subsequent callers reuse the inflight promise.
  let pending = inflight.get(slug);
  if (!pending) {
    pending = writeFirestoreDoc(slug, entry).then(() => entry);
    inflight.set(slug, pending);
    pending.finally(() => inflight.delete(slug));
  }
  await pending;
}
