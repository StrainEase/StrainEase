// Persistent cache for first-person Reddit quotes.
//
// PullPush is a volunteer-run Pushshift mirror that flakes multi-week
// outages; we never want the UI to come back empty when the upstream is
// having a bad day. This adds a Firestore-backed survival layer behind
// the in-memory cache already in `reddit.ts`:
//
//   1. In-memory cache (Map<key, {notes, fetchedAt, source}>) — covers
//      warm-instance repeat hits.
//   2. Firestore document at `redditQuoteCache/{key}` with the same
//      payload — survives cold starts AND upstream outages, so the UI
//      can show quotes that are stale by up to a week before giving up.
//
// TTL: 7 days. Reddit threads don't disappear that fast, and a quote
// from yesterday is still useful when we can't reach the upstream.
//
// Only the Cloud Functions admin SDK touches this collection; clients
// are not given direct access (see firestore.rules).
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { CommunityNote } from "./types";

if (getApps().length === 0) initializeApp();

const COLLECTION = "redditQuoteCache";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type RedditQuoteSource = "pullpush" | "arctic-shift" | "cache";

export type CachedRedditQuotes = {
  notes: CommunityNote[];
  fetchedAt: number;
  source: RedditQuoteSource;
};

type FirestoreShape = {
  notes: CommunityNote[];
  fetchedAt: number;
  source: RedditQuoteSource;
};

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("reddit-cache-timeout")), ms);
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

/** Cache key shared with the in-memory cache in `reddit.ts`. */
export function redditCacheKey(
  name: string,
  conditions: string[],
): string {
  const focus = conditions
    .map((c) => c.trim().toLowerCase())
    .filter((c) => c !== "");
  return `${name.trim().toLowerCase()}|${focus.length > 0 ? focus.join(",") : "general"}`;
}

async function readDoc(
  cacheKey: string,
): Promise<CachedRedditQuotes | null> {
  try {
    const snap = await withTimeout(
      getFirestore().collection(COLLECTION).doc(cacheKey).get(),
      1500,
    );
    if (!snap.exists) return null;
    const data = snap.data() as FirestoreShape | undefined;
    if (
      !data ||
      !Array.isArray(data.notes) ||
      typeof data.fetchedAt !== "number"
    ) {
      return null;
    }
    return {
      notes: data.notes,
      fetchedAt: data.fetchedAt,
      source: data.source,
    };
  } catch {
    // Firestore unreachable — let the caller fall through.
    return null;
  }
}

/**
 * Read a Firestore-cached quote set if it's still fresh enough.
 * Returns the cache entry tagged with `source: "cache"` so callers
 * can tell the difference between live and stale data.
 */
export async function readPersistedRedditQuotes(
  name: string,
  conditions: string[],
): Promise<CachedRedditQuotes | null> {
  const cacheKey = redditCacheKey(name, conditions);
  const hit = await readDoc(cacheKey);
  if (!hit) return null;
  if (Date.now() - hit.fetchedAt >= TTL_MS) return null;
  return { ...hit, source: "cache" };
}

/**
 * Persist a freshly-fetched quote set. We only write when we have at
 * least one note — empty results are not worth a Firestore document and
 * would just confuse future readers into thinking the upstream returned
 * empty for this strain.
 */
export async function writeRedditQuotes(
  name: string,
  conditions: string[],
  notes: CommunityNote[],
  source: Exclude<RedditQuoteSource, "cache">,
): Promise<void> {
  if (notes.length === 0) return;
  const cacheKey = redditCacheKey(name, conditions);
  const payload: FirestoreShape = {
    notes: notes.slice(0, 8),
    fetchedAt: Date.now(),
    source,
  };
  try {
    await withTimeout(
      getFirestore()
        .collection(COLLECTION)
        .doc(cacheKey)
        .set(payload, { merge: false }),
      1500,
    );
  } catch {
    // Best-effort. Live results still served from this call's in-memory
    // cache; a future cold start will re-attempt the upstream.
  }
}

/** Stats for tests + telemetry. Firestore state is not counted. */
export function redditCacheTtlMs(): number {
  return TTL_MS;
}

export const __test__ = { COLLECTION, redditCacheKey };
