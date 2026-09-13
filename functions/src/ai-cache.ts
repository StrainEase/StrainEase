// Generic Firestore-backed cache for AI callable results.
//
// Both `describeStrainForUser` and `compareStrains` are prompt-heavy
// Groq calls that get hit hard when a user opens multiple strain pages
// in a minute. Groq's free tier caps each model at 8000 TPM (tokens per
// minute); a single full-strain profile + ailments prompt is ~1.5–3K
// tokens, so 3–4 strain views in a minute trips the limit and the call
// returns 429 (which `callGroq` surfaces as a 500). Cache by stable
// input hash so repeat views of the same strain + ailments + meds +
// prefs return the stored response without spending tokens.
//
// Pattern (mirrors `strain-info-cache.ts`):
//   1. In-memory Map<key, entry>. Resets on cold start, covers the
//      hot loop of the same user re-opening the same page.
//   2. Firestore document at `${COLLECTION_PREFIX}{key}`. Survives
//      cold starts and is shared across Cloud Function instances.
//   3. Best-effort writes — a Firestore outage does not fail the
//      request, it just means the next cold start re-fetches.
//
// The cache is *global*, not per-user: the LLM response depends on
// the inputs (strain, ailments, meds, prefs, language, reliefHistory),
// not the caller's identity. Same inputs always produce the same
// response. Two signed-in users with the same inputs share the same
// cache entry.

import { createHash } from "node:crypto";
import { getFirestore } from "firebase-admin/firestore";

/** How long an entry is considered fresh. Strain data and ailment
 *  prompts change on the order of weeks; 14 days is the upper bound on
 *  "user re-opens a page and gets the same answer they would have
 *  gotten from a fresh call". */
export const AI_CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

/** Hard upper bound on Firestore writes/reads so a Firestore outage
 *  cannot stall a request. Mirrors strain-info-cache.ts. */
const FIRESTORE_TIMEOUT_MS = 1500;

type CacheEntry<T> = {
  result: T;
  createdAt: number;
  model: string;
};

// Per-collection memory + inflight maps. Keyed by `${collection}:${hash}`
// so two collections cannot collide in the same instance.
const memoryCache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<CacheEntry<unknown> | null>>();

export type AiCacheSource = "memory" | "firestore" | "network";

export type CachedAiResult<T> = {
  result: T;
  createdAt: number;
  source: AiCacheSource;
};

/**
 * Deterministic SHA-256 hash of any JSON-serializable input, returned
 * as lowercase hex (64 chars). Keys are sorted at every level so
 * `{a:1,b:2}` and `{b:2,a:1}` produce the same hash. Arrays keep
 * their order — `{ailments:["a","b"]}` and `{ailments:["b","a"]}` are
 * intentionally different cache entries (callers must pre-sort
 * order-sensitive lists like strain names).
 */
export function computeAiCacheKey(input: unknown): string {
  return createHash("sha256").update(canonicalize(input)).digest("hex");
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map((v) => canonicalize(v)).join(",") + "]";
  }
  // Plain object: sort keys for a stable serialization.
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const parts: string[] = [];
  for (const k of keys) {
    parts.push(JSON.stringify(k) + ":" + canonicalize(obj[k]));
  }
  return "{" + parts.join(",") + "}";
}

/** Stats for tests / monitoring. Does not touch Firestore. */
export function aiCacheStats(): {
  entries: number;
  collections: number;
} {
  const collections = new Set<string>();
  for (const k of memoryCache.keys()) {
    const colon = k.indexOf(":");
    if (colon > 0) collections.add(k.slice(0, colon));
  }
  return { entries: memoryCache.size, collections: collections.size };
}

/**
 * Drop every in-memory entry. Exposed for tests.
 */
export function clearAiCacheForTest(): void {
  memoryCache.clear();
  inflight.clear();
}

function isFresherThan<T>(entry: CacheEntry<T>, now: number): boolean {
  return now - entry.createdAt < AI_CACHE_TTL_MS;
}

function memoryKey(collection: string, hash: string): string {
  return `${collection}:${hash}`;
}

async function readFirestoreDoc<T>(
  collection: string,
  hash: string,
): Promise<CacheEntry<T> | null> {
  try {
    const snap = await withTimeout(
      getFirestore().collection(collection).doc(hash).get(),
      FIRESTORE_TIMEOUT_MS,
    );
    if (!snap.exists) return null;
    const data = snap.data() as
      | { result?: T; createdAt?: number; model?: string }
      | undefined;
    if (
      !data ||
      typeof data.createdAt !== "number" ||
      typeof data.model !== "string" ||
      data.result === undefined
    ) {
      return null;
    }
    return {
      result: data.result as T,
      createdAt: data.createdAt,
      model: data.model,
    };
  } catch {
    // Firestore unreachable — caller will fall through to the network.
    return null;
  }
}

async function writeFirestoreDoc<T>(
  collection: string,
  hash: string,
  entry: CacheEntry<T>,
): Promise<void> {
  try {
    await withTimeout(
      getFirestore().collection(collection).doc(hash).set(
        {
          result: entry.result,
          createdAt: entry.createdAt,
          model: entry.model,
        },
        { merge: false },
      ),
      FIRESTORE_TIMEOUT_MS,
    );
  } catch {
    // Best-effort write. Memory cache already satisfies this request.
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
 * Read an AI result from the cache. Returns `null` on miss or when the
 * only cached entry is too old to trust; callers should fall through
 * to the network in that case.
 */
export async function getCachedAiResult<T>(
  collection: string,
  hash: string,
): Promise<CachedAiResult<T> | null> {
  const memKey = memoryKey(collection, hash);
  const now = Date.now();
  const memHit = memoryCache.get(memKey) as CacheEntry<T> | undefined;
  if (memHit && isFresherThan(memHit, now)) {
    return {
      result: memHit.result,
      createdAt: memHit.createdAt,
      source: "memory",
    };
  }
  const fsHit = await readFirestoreDoc<T>(collection, hash);
  if (fsHit && isFresherThan(fsHit, now)) {
    memoryCache.set(memKey, fsHit as CacheEntry<unknown>);
    return {
      result: fsHit.result,
      createdAt: fsHit.createdAt,
      source: "firestore",
    };
  }
  return null;
}

/**
 * Persist a freshly-fetched AI result. The memory layer is updated
 * synchronously; the Firestore write is coalesced so concurrent calls
 * for the same key only fire one write.
 */
export async function putCachedAiResult<T>(
  collection: string,
  hash: string,
  result: T,
  model: string,
): Promise<void> {
  const entry: CacheEntry<T> = {
    result,
    createdAt: Date.now(),
    model,
  };
  memoryCache.set(memoryKey(collection, hash), entry as CacheEntry<unknown>);

  const memKey = memoryKey(collection, hash);
  let pending = inflight.get(memKey);
  if (!pending) {
    pending = writeFirestoreDoc(collection, hash, entry).then(
      () => entry as CacheEntry<unknown>,
    );
    inflight.set(memKey, pending);
    pending.finally(() => inflight.delete(memKey));
  }
  await pending;
}
