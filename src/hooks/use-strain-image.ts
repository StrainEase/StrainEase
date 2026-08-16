import { useEffect, useState } from "react";
import { cachedStrainImage } from "@/lib/strain-api";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const STORAGE_KEY = "strain-image-cache:v1";

type CacheEntry = {
  url: string;
  contentType?: string;
  expiresAt: number;
};

type Cache = Record<string, CacheEntry>;

function readCache(): Cache {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Cache;
    const now = Date.now();
    const fresh: Cache = {};
    for (const [key, entry] of Object.entries(parsed)) {
      if (entry.expiresAt > now) fresh[key] = entry;
    }
    return fresh;
  } catch {
    return {};
  }
}

function writeCache(cache: Cache) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Quota or private mode — fall back to per-request calls.
  }
}

function shouldProxy(src: string): boolean {
  // Already on Firebase Storage (from a previous proxy call) — fetch directly.
  if (/^https?:\/\/storage\.googleapis\.com\//i.test(src)) return false;
  // Firebase signed URLs from getSignedUrl — fetch directly.
  if (src.includes("googleapis.com/")) return false;
  // Data URIs and blobs — fetch directly.
  if (src.startsWith("data:") || src.startsWith("blob:")) return false;
  // Anything absolute http(s) — proxy through the cache callable.
  return /^https?:\/\//i.test(src);
}

/**
 * Proxy an external strain image through the cachedStrainImage Firebase
 * callable. The callable downloads the upstream bytes once, caches them
 * in Firebase Storage, and returns a signed URL the browser can hit
 * directly with normal HTTP caching.
 *
 * Repeat calls within 24h hit the signed URL directly without another
 * callable round-trip — we stash the signed URL + content type in
 * localStorage so the browser and the function both agree the image is
 * good.
 *
 * Returns `undefined` while the proxy call is in flight, `null` if the
 * proxy rejected (e.g. Leafly 404), or the (possibly cached) signed URL.
 * Callers should treat `undefined` as "keep the skeleton" and `null` as
 * "swap to your fallback".
 */
export function useStrainImage(src: string | undefined): {
  url: string | undefined | null;
} {
  const [url, setUrl] = useState<string | undefined | null>(
    src && !shouldProxy(src) ? src : undefined,
  );

  useEffect(() => {
    if (!src) {
      setUrl(undefined);
      return;
    }
    if (!shouldProxy(src)) {
      setUrl(src);
      return;
    }

    let cancelled = false;
    const cache = readCache();
    const cached = cache[src];
    if (cached) {
      setUrl(cached.url);
      return () => {
        cancelled = true;
      };
    }

    setUrl(undefined);
    void cachedStrainImage(src)
      .then((res) => {
        if (cancelled) return;
        const next: Cache = readCache();
        next[src] = {
          url: res.url,
          contentType: res.contentType,
          expiresAt: Date.now() + CACHE_TTL_MS,
        };
        writeCache(next);
        setUrl(res.url);
      })
      .catch(() => {
        if (cancelled) return;
        setUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  return { url };
}