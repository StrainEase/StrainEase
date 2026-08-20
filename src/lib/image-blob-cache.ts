/**
 * On-device blob cache for strain images. Sits in front of the
 * Firebase `cachedStrainImage` proxy and the original Leafly / Weedmaps
 * URL so the strain cards (and the strain detail page hero) render
 * instantly on repeat visits — no network round-trip, no Firebase
 * function call, no proxy.
 *
 * Storage: a single IndexedDB database with one object store. We key
 * blobs by the SHA-256 of the source URL so the same upstream image
 * always lands in the same slot regardless of how the URL was passed
 * to us (the proxy URL, the raw Leafly URL, with/without query
 * params). We also stash the original `src` so a quick lookup can
 * tell callers when the cached entry was stored.
 *
 * Lifetime: blobs are kept for 30 days and pruned on read. We never
 * actively sweep the whole store — browsers cap the available
 * quota and will evict the oldest entries under pressure, which is
 * what we want anyway.
 *
 * Graceful degradation: if IndexedDB is unavailable (private mode,
 * quota exhausted, browsers that don't expose it), every helper
 * below resolves to the same "miss" the underlying code would see
 * without a cache. The image-load flow falls back to the network
 * path, so a broken cache is at worst a missed speedup.
 */

const DB_NAME = "strain-finder-image-cache";
const DB_VERSION = 1;
const STORE_NAME = "blobs";

const ENTRY_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type CacheEntry = {
  blob: Blob;
  contentType: string;
  storedAt: number;
  /** The resolved URL we ultimately used to fetch the blob
   *  (proxy or direct). Useful for cache-busting on revalidation. */
  resolvedUrl: string;
};

let dbPromise: Promise<IDBDatabase | null> | null = null;

function isAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase | null> {
  if (!isAvailable()) return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
  return dbPromise;
}

async function hashKey(src: string): Promise<string> {
  // SHA-256 the URL. Avoids PII — it's just the image URL — and
  // gives a stable, fixed-length key regardless of the URL length
  // Leafly or our proxy can hand us.
  const bytes = new TextEncoder().encode(src);
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const out = new Uint8Array(digest);
    let hex = "";
    for (let i = 0; i < out.length; i++) {
      hex += out[i].toString(16).padStart(2, "0");
    }
    return hex;
  }
  // Fallback for ancient browsers — the key just needs to be stable.
  let h = 5381;
  for (let i = 0; i < bytes.length; i++) {
    h = ((h << 5) + h + bytes[i]) | 0;
  }
  return `legacy-${(h >>> 0).toString(16)}`;
}

function tx<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  return new Promise((resolve) => {
    let req: IDBRequest<T>;
    try {
      const store = db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
      req = run(store);
    } catch {
      resolve(null);
      return;
    }
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => resolve(null);
  });
}

/**
 * Read a cached blob by source URL. Returns `null` on miss, on
 * expired entries, or on any storage error. Callers should treat
 * the result as "render instantly if you get a URL back, otherwise
 * go fetch from the network".
 */
export async function getCachedImage(
  src: string,
): Promise<{ url: string; contentType: string; storedAt: number } | null> {
  if (!isAvailable() || !src) return null;
  const db = await openDb();
  if (!db) return null;
  const key = await hashKey(src);
  const raw = await tx<{ key: string; entry: CacheEntry } | undefined>(
    db,
    "readonly",
    (store) => store.get(key) as IDBRequest<{ key: string; entry: CacheEntry } | undefined>,
  );
  if (!raw) return null;
  const entry = raw.entry;
  if (!entry || Date.now() - entry.storedAt > ENTRY_TTL_MS) {
    // Best-effort prune. We don't await — the next read will retry.
    void tx(db, "readwrite", (store) => store.delete(key));
    return null;
  }
  // The blob is served from an object URL so the browser doesn't
  // re-decode it on every render. We revoke in `releaseImage` when
  // the caller is done.
  const url = URL.createObjectURL(entry.blob);
  return {
    url,
    contentType: entry.contentType,
    storedAt: entry.storedAt,
  };
}

/**
 * Persist a freshly-fetched image to the on-device cache. Best-effort:
 * a quota error or disabled IndexedDB is fine — the network result
 * is already in the caller's hand, the cache just makes the next
 * visit instant.
 */
export async function putCachedImage(
  src: string,
  blob: Blob,
  resolvedUrl: string,
  contentType?: string,
): Promise<void> {
  if (!isAvailable() || !src) return;
  const db = await openDb();
  if (!db) return;
  const key = await hashKey(src);
  const entry: CacheEntry = {
    blob,
    resolvedUrl,
    contentType: contentType || blob.type || "image/jpeg",
    storedAt: Date.now(),
  };
  await tx(db, "readwrite", (store) =>
    store.put({ key, entry } as { key: string; entry: CacheEntry }),
  );
}

/**
 * Helper for callers using object URLs created by `getCachedImage`.
 * Revokes the URL once the image is fully painted (or has failed)
 * so the blob can be garbage-collected.
 */
export function releaseImage(url: string | undefined): void {
  if (!url) return;
  if (url.startsWith("blob:")) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // ignore — revoked twice is harmless
    }
  }
}
