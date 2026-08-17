import { useEffect, useState } from "react";
import { cachedStrainImage } from "@/lib/strain-api";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
// v2: switch from signed URLs (which expired after 7 days and required
// iam.serviceAccounts.signBlob on the runtime SA) to permanent public
// storage URLs. Bumping the key invalidates any stale signed URLs left
// over from before the deploy.
const STORAGE_KEY = "strain-image-cache:v2";

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
 * If the proxy call rejects (e.g. Firebase isn't configured yet, or the
 * upstream returned a non-image response) we hand the original URL back
 * to the browser so the image still loads. The caller swaps to the leaf
 * fallback only when both the proxy and the direct fetch fail.
 *
 * Returns `undefined` while the proxy call is in flight, or the URL the
 * browser should load (proxy-served when available, otherwise the
 * upstream URL). Callers should treat `undefined` as "keep the skeleton"
 * and let their own `<img onError>` swap to the leaf when the URL fails.
 */
export function useStrainImage(src: string | undefined): {
  url: string | undefined;
} {
  const [url, setUrl] = useState<string | undefined>(
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
        // Proxy failed (Firebase not configured, function not deployed,
        // or upstream returned a non-image response). Let the browser try
        // the original Leafly URL directly — most catalog photos are
        // still hosted there, and the <img onError> in StrainImage will
        // swap to the leaf fallback when even that fails.
        if (cancelled) return;
        setUrl(src);
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  return { url };
}