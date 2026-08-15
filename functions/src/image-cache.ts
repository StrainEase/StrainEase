// Server-side image cache. When the AI pipeline (or any future caller)
// wants a strain image, we don't want to re-download the same bytes
// from Leafly / Weedmaps every cold start. This module layers:
//
//   1. In-memory cache (Map<key, {bytes, contentType, fetchedAt}>).
//      Resets when the instance is recycled, but covers the common
//      case of repeated hits inside one warm window.
//   2. Firebase Storage bucket at `strain-images/{sha256(url)}`.
//      Survives cold starts and lets the AI rehydrate fast.
//   3. The network. Only hit on cache miss.
//
// Coalescing: concurrent requests for the same URL share a single
// in-flight promise so a freshly-uncached image doesn't trigger 50
// parallel downloads on a hot path.
//
// TTL: 7 days. Strain imagery on Leafly is stable enough that we can
// afford to hold on to bytes for a week before revalidating.

import { createHash } from "crypto";
import { getStorage } from "firebase-admin/storage";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

export type ImageSource = "memory" | "storage" | "network";

export type CachedImage = {
  bytes: Buffer;
  contentType: string;
  fetchedAt: number;
  source: ImageSource;
};

type CacheEntry = {
  bytes: Buffer;
  contentType: string;
  fetchedAt: number;
};

const memoryCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<CacheEntry>>();

/** Hash a URL into a stable, fixed-length cache key. */
export function imageCacheKey(url: string): string {
  return createHash("sha256").update(url).digest("hex");
}

async function fetchFromNetwork(
  url: string,
): Promise<{ bytes: Buffer; contentType: string }> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "image/*" },
  });
  if (!res.ok) {
    throw new Error(`Image fetch returned status ${res.status}`);
  }
  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  const arrayBuffer = await res.arrayBuffer();
  return { bytes: Buffer.from(arrayBuffer), contentType };
}

async function readFromStorage(
  key: string,
): Promise<CacheEntry | null> {
  try {
    const file = getStorage().bucket().file(`strain-images/${key}`);
    const [exists] = await file.exists();
    if (!exists) return null;
    const [metadata] = await file.getMetadata();
    const fetchedAtRaw = metadata.metadata?.fetchedAt;
    const fetchedAt =
      typeof fetchedAtRaw === "string" ? Number(fetchedAtRaw) : Date.now();
    if (!Number.isFinite(fetchedAt)) return null;
    if (Date.now() - fetchedAt >= CACHE_TTL_MS) return null;
    const [bytes] = await file.download();
    const contentType = metadata.contentType ?? "image/jpeg";
    return { bytes, contentType, fetchedAt };
  } catch {
    return null;
  }
}

async function writeToStorage(
  key: string,
  entry: CacheEntry,
): Promise<void> {
  try {
    const file = getStorage().bucket().file(`strain-images/${key}`);
    await file.save(entry.bytes, {
      contentType: entry.contentType,
      metadata: {
        metadata: { fetchedAt: String(entry.fetchedAt) },
        cacheControl: "public, max-age=604800",
      },
      resumable: false,
    });
  } catch {
    // Storage write is best-effort. The memory cache + a later retry
    // will cover the caller; we don't want a transient storage blip
    // to fail the whole image fetch.
  }
}

/**
 * Fetch a strain image with cache. Returns the raw bytes plus the
 * source they came from so callers can observe cache effectiveness.
 *
 * Concurrent calls for the same URL share a single in-flight
 * promise so a freshly-uncached image downloads once even when many
 * callers ask at the same time.
 */
export async function cachedFetchImage(url: string): Promise<CachedImage> {
  if (!url || !/^https?:\/\//i.test(url)) {
    throw new Error("Image URL must be an absolute http(s) URL.");
  }
  const key = imageCacheKey(url);
  const now = Date.now();

  const memHit = memoryCache.get(key);
  if (memHit && now - memHit.fetchedAt < CACHE_TTL_MS) {
    return { ...memHit, source: "memory" };
  }

  // Storage hit (best-effort). If it fails, fall through to network.
  const storageHit = await readFromStorage(key);
  if (storageHit) {
    memoryCache.set(key, storageHit);
    return { ...storageHit, source: "storage" };
  }

  // Network fetch — coalesce concurrent callers.
  let pending = inflight.get(key);
  if (!pending) {
    pending = (async () => {
      const fresh = await fetchFromNetwork(url);
      const entry: CacheEntry = {
        bytes: fresh.bytes,
        contentType: fresh.contentType,
        fetchedAt: Date.now(),
      };
      memoryCache.set(key, entry);
      // Fire-and-forget write to Storage. We don't want a transient
      // bucket error to block the caller, and the in-memory copy
      // already satisfies this request.
      void writeToStorage(key, entry);
      return entry;
    })();
    inflight.set(key, pending);
    pending.finally(() => inflight.delete(key));
  }
  const entry = await pending;
  return { ...entry, source: "network" };
}

/** Wipe the in-memory cache. Exposed for tests; not used in prod. */
export function clearImageCacheForTest(): void {
  memoryCache.clear();
  inflight.clear();
}

/**
 * Cache stats for telemetry / tests. Counts of entries currently held
 * in memory, including their age. Storage size is not measured (it
 * would require a Storage list call we don't want to run on every
 * request).
 */
export function imageCacheStats() {
  const now = Date.now();
  let fresh = 0;
  let stale = 0;
  for (const entry of memoryCache.values()) {
    if (now - entry.fetchedAt < CACHE_TTL_MS) fresh += 1;
    else stale += 1;
  }
  return { entries: memoryCache.size, fresh, stale };
}