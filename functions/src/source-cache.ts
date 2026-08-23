// Per-source strain profile cache.
//
// The existing `strain-info-cache` stores a *single* merged profile
// per strain. This module stores each source's raw response
// separately so the consolidator can average numbers and surface
// disagreements to Dr. Kaya. Firestore document shape:
//
//   sourceCache/{slug}: {
//     leafly:    { profile, fetchedAt },
//     weedmaps:  { profile, fetchedAt },
//     allbud:    { profile, fetchedAt },
//   }
//
// The collection is admin-SDK only — never exposed to clients — and
// a single document write per source keeps the cost at one Firestore
// read per strain instead of three. TTL is 24h, same as the merged
// cache; the consolidator decides which sources still have a fresh
// contribution to include.

import { getFirestore } from "firebase-admin/firestore";
import type { StrainProfile } from "./types";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const COLLECTION = "sourceCache";

export type SourceId = "leafly" | "weedmaps" | "allbud";

export type SourceEntry = {
  profile: StrainProfile;
  fetchedAt: number;
};

export type SourceCache = Partial<Record<SourceId, SourceEntry>>;

const memoryCache = new Map<string, SourceCache>();
const inflight = new Map<string, Promise<SourceCache | null>>();

/** Reset the in-memory cache (tests only). */
export function clearSourceCacheForTest(): void {
  memoryCache.clear();
  inflight.clear();
}

/** Stats for telemetry / tests. Firestore size is not measured. */
export function sourceCacheStats() {
  let entries = 0;
  let fresh = 0;
  let stale = 0;
  const now = Date.now();
  for (const doc of memoryCache.values()) {
    for (const entry of Object.values(doc)) {
      if (!entry) continue;
      entries += 1;
      if (now - entry.fetchedAt < CACHE_TTL_MS) fresh += 1;
      else stale += 1;
    }
  }
  return { docs: memoryCache.size, entries, fresh, stale };
}

function isFresherThan(entry: SourceEntry, now: number): boolean {
  return now - entry.fetchedAt < CACHE_TTL_MS;
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

function readFirestoreDoc(slug: string): Promise<SourceCache | null> {
  return (async () => {
    try {
      const snap = await withTimeout(
        getFirestore().collection(COLLECTION).doc(slug).get(),
        1500,
      );
      if (!snap.exists) return null;
      const data = snap.data() as Record<string, unknown> | undefined;
      if (!data) return null;
      const out: SourceCache = {};
      for (const source of ["leafly", "weedmaps", "allbud"] as SourceId[]) {
        const raw = data[source] as
          | { profile?: StrainProfile; fetchedAt?: number }
          | undefined;
        if (
          raw &&
          raw.profile &&
          typeof raw.fetchedAt === "number" &&
          isFresherThan(
            { profile: raw.profile, fetchedAt: raw.fetchedAt },
            Date.now(),
          )
        ) {
          out[source] = { profile: raw.profile, fetchedAt: raw.fetchedAt };
        }
      }
      return Object.keys(out).length > 0 ? out : null;
    } catch {
      return null;
    }
  })();
}

async function writeFirestoreDoc(
  slug: string,
  source: SourceId,
  entry: SourceEntry,
): Promise<void> {
  try {
    await withTimeout(
      getFirestore()
        .collection(COLLECTION)
        .doc(slug)
        .set(
          { [source]: { profile: entry.profile, fetchedAt: entry.fetchedAt } },
          { merge: true },
        ),
      1500,
    );
  } catch {
    // Best-effort: a future cold start will simply re-fetch.
  }
}

/**
 * Read every still-fresh source for a strain. Returns an empty
 * object on miss / Firestore unreachable.
 */
export async function getSourceCache(slug: string): Promise<SourceCache> {
  if (!slug) return {};
  const memHit = memoryCache.get(slug);
  if (memHit && Object.keys(memHit).length > 0) {
    // Prune any stale entries on read so the caller doesn't have to.
    const now = Date.now();
    const pruned: SourceCache = {};
    for (const [s, e] of Object.entries(memHit) as [
      SourceId,
      SourceEntry,
    ][]) {
      if (e && isFresherThan(e, now)) pruned[s] = e;
    }
    if (Object.keys(pruned).length > 0) return pruned;
  }
  const fsHit = await readFirestoreDoc(slug);
  if (fsHit) {
    memoryCache.set(slug, fsHit);
    return fsHit;
  }
  return {};
}

/**
 * Persist a single source's freshly-fetched profile to both memory
 * and Firestore. Writes are coalesced per slug so concurrent fetches
 * don't step on each other.
 */
export async function putSourceCache(
  slug: string,
  source: SourceId,
  profile: StrainProfile,
): Promise<void> {
  if (!slug) return;
  const entry: SourceEntry = { profile, fetchedAt: Date.now() };
  // Update the memory doc in place; concurrent callers get the new
  // value the next time they read.
  const existing = memoryCache.get(slug) ?? {};
  existing[source] = entry;
  memoryCache.set(slug, existing);
  let pending = inflight.get(slug);
  if (!pending) {
    pending = writeFirestoreDoc(slug, source, entry).then(() => existing);
    inflight.set(slug, pending);
    pending.finally(() => inflight.delete(slug));
  }
  await pending;
}
