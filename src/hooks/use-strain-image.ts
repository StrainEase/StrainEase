import { useCallback, useEffect, useRef, useState } from "react";
import { cachedStrainImage } from "@/lib/strain-api";
import {
  getCachedImage,
  putCachedImage,
  releaseImage,
} from "@/lib/image-blob-cache";

/**
 * Wrapper that catches Safari-specific DOM errors during blob URL revocation.
 * Safari sometimes throws "insertBefore@[native code]" errors when revoking
 * blob URLs during React's render cycle or Framer Motion animations. These
 * errors are harmless but can pollute the console.
 */
function safeReleaseImage(url: string | undefined): void {
  try {
    releaseImage(url);
  } catch {
    // Already handled in releaseImage, but this catches any edge cases
  }
}

/**
 * Options for `useStrainImage`.
 *
 * `fallback` is an optional curated direct upstream URL (typically
 * `getPhotoURL(slug)` from `@/lib/strain-catalog`) the caller can supply
 * as a *fourth* tier in the resolver. The first three tiers (cache, proxy,
 * upstream) are tried in order; if the primary `src` URL is dead at every
 * one of those tiers, the fallback is published as a last-ditch attempt
 * before the hook reports `exhausted`. This mirrors the iOS / Android
 * resilience story (see `ios/StrainEase/Home/StrainPoster.swift` and
 * `android/.../StrainPhoto.kt`): the dead Firebase Storage URL falls back
 * to a curated direct Leafly / Weedmaps URL instead of flashing the leaf.
 */
export type UseStrainImageOptions = {
  fallback?: string;
};

/**
 * Resolve a strain image through three (or four) layered caches:
 *
 *   1. **IndexedDB blob cache** (`getCachedImage`) — on-device, instant
 *      on repeat visits. Best path for the Home rail once a user has
 *      scrolled through it once.
 *   2. **Firebase `cachedStrainImage` proxy** — a public Storage URL
 *      served from the same CDN as the rest of the app. Survives
 *      cold starts and works across devices.
 *   3. **Direct upstream URL** (Leafly / Weedmaps) — last-resort
 *      fallback. Sometimes 404s, sometimes slow, but it's the source
 *      of truth.
 *   4. **Caller-supplied `fallback` URL** (optional) — typically a
 *      curated direct photo URL looked up via `getPhotoURL(slug)`. The
 *      primary use case is when the primary `src` is a Firebase Storage
 *      URL that has been deleted or is on a stale CDN edge; the proxy
 *      tier (2) re-resolves that same Storage URL and so can also fail.
 *      In that case the curated direct URL is a genuinely different
 *      source with a different failure surface.
 *
 * On every successful network response (proxy, upstream, or fallback) we
 * also hydrate the IndexedDB blob cache so the next visit is instant.
 *
 * First successful result wins. Later results are ignored so a slow
 * proxy cannot overwrite a fast blob hit (which previously caused a
 * flash-to-skeleton and, when the blob URL was revoked, a missing
 * image). The previous successful URL is kept across `src` changes
 * until the new resolution finishes, so the caller can keep painting
 * the old image instead of resetting to the gradient skeleton.
 *
 * The hook also exposes a `retry` callback the caller fires from the
 * `<img>` `onError` handler. The proxy can return a URL that no
 * longer resolves in Storage (the cached object was deleted, the CDN
 * edge is stale, etc.). When that happens the proxy call has already
 * resolved successfully so the hook would otherwise sit on the bad
 * URL forever. `retry` tells the hook the current URL is dead and
 * to publish the next-best source — upstream first, then the
 * caller-supplied fallback, then exhausted.
 *
 * Returns `undefined` only on the very first resolve for a given
 * component mount (no prior image). After that the last good URL
 * stays until a better one arrives or the component unmounts.
 *
 * `exhausted` is `true` once every source tier (proxy + upstream +
 * fallback, if provided) has been tried and the last one also failed
 * to load. The caller renders the leaf fallback once it goes `true`;
 * without it the leaf never shows because the hook would otherwise
 * sit on the dead URL indefinitely.
 */
export function useStrainImage(
  src: string | undefined,
  options: UseStrainImageOptions = {},
): {
  url: string | undefined;
  retry: () => void;
  exhausted: boolean;
} {
  const fallback = options.fallback;
  const [url, setUrl] = useState<string | undefined>(undefined);
  // True once the hook has tried every source tier and none of them
  // could deliver a paintable image. Stays true until the next src
  // arrives, which resets the tier counter.
  const [exhausted, setExhausted] = useState(false);
  // Track the blob URL we own so we can revoke it safely on unmount
  // (or when we deliberately replace it). Never revoke while the
  // published `url` still points at it.
  const ownedBlobRef = useRef<string | undefined>(undefined);
  // Once any layer has published a URL for the current `src`, later
  // layers are ignored.
  const resolvedForSrcRef = useRef<string | undefined>(undefined);
  // The URL the component rendered last and the <img> failed to load.
  // retry() uses this to decide which fallback tier to publish next.
  const failedUrlRef = useRef<string | undefined>(undefined);
  // Tracks which source tiers have been published for the current src
  // so retry() can advance to the next tier instead of repeating.
  // The order is cache → proxy → upstream → fallback (optional) → done,
  // and tierRef stays on the tier we last published from until retry()
  // bumps it. The "fallback" tier is only ever reached when the caller
  // passed a `fallback` option that is distinct from `src` and from
  // the proxy URL.
  const tierRef = useRef<
    "cache" | "proxy" | "upstream" | "fallback" | "done"
  >("cache");
  // Remember the proxy URL even when the cache wins the race, so
  // retry() can publish the proxy tier after a cache miss.
  const proxyUrlRef = useRef<string | undefined>(undefined);
  // Remember the proxy content type for the same reason.
  const proxyContentTypeRef = useRef<string | undefined>(undefined);
  // The fallback option for the current src, so the cleanup-then-rerun
  // path on src change can reset tier state and pick up a new fallback
  // without races.
  const fallbackRef = useRef<string | undefined>(fallback);
  fallbackRef.current = fallback;

  useEffect(() => {
    if (!src) {
      return;
    }
    if (!shouldProxy(src)) {
      resolvedForSrcRef.current = src;
      tierRef.current = "done";
      setUrl(src);
      setExhausted(false);
      return;
    }

    // New src → allow a fresh first-success for this key. Do NOT clear
    // `url` so the previous image stays visible while we resolve.
    if (resolvedForSrcRef.current !== src) {
      resolvedForSrcRef.current = undefined;
      tierRef.current = "cache";
      proxyUrlRef.current = undefined;
      proxyContentTypeRef.current = undefined;
      failedUrlRef.current = undefined;
      setExhausted(false);
    }

    let cancelled = false;

    const publish = (next: string, isBlob: boolean) => {
      if (cancelled) return;
      // First successful result wins for this src.
      if (resolvedForSrcRef.current === src) return;
      resolvedForSrcRef.current = src;

      const previousBlob = ownedBlobRef.current;
      if (isBlob) {
        ownedBlobRef.current = next;
      } else {
        ownedBlobRef.current = undefined;
      }

      setUrl(next);

      // Only revoke the previous blob after we've swapped the published
      // URL away from it. A short delay lets the <img> pick up the new
      // src before the old object URL is invalidated.
      if (previousBlob && previousBlob !== next) {
        requestAnimationFrame(() => {
          safeReleaseImage(previousBlob);
        });
      }
    };

    const fetchUpstreamBlob = (resolvedUrl: string) => {
      // Best-effort hydration of the blob cache so the next visit is
      // instant, regardless of which tier served the bytes.
      void fetch(resolvedUrl, { cache: "force-cache" })
        .then(async (r) => {
          if (!r.ok) return;
          const blob = await r.blob();
          const contentType = r.headers.get("content-type") ?? undefined;
          await putCachedImage(src, blob, resolvedUrl, contentType);
        })
        .catch(() => {});
    };

    // 1) On-device blob cache — runs in parallel with the proxy.
    getCachedImage(src)
      .then((hit) => {
        if (cancelled || !hit) return;
        // Only mark the cache tier as "done" if we actually won the
        // race. If the proxy already published, resolvedForSrcRef
        // is already src and publish() below will be a no-op — but
        // flipping tierRef here would block retry() from advancing
        // to the proxy tier if the cache URL turns out to be dead.
        if (resolvedForSrcRef.current === src) return;
        publish(hit.url, true);
        tierRef.current = "cache";
      })
      .catch(() => {
        // IndexedDB unavailable or errored — fall through to proxy.
      });

    // 2) Proxy via the Firebase function.
    void cachedStrainImage(src)
      .then(async (res) => {
        if (cancelled) return;
        // Remember the proxy URL even when the cache wins the race,
        // so retry() can publish the proxy tier after a cache miss.
        proxyUrlRef.current = res.url;
        proxyContentTypeRef.current = res.contentType;
        // If the cache already published first, only republish the
        // proxy URL when retry() has bumped tierRef to "proxy" (the
        // cache URL just failed). Otherwise the cache hit is still
        // good and we should leave it alone.
        if (resolvedForSrcRef.current === src && tierRef.current !== "proxy") return;
        // Clear resolvedForSrcRef so the publish() guard below lets
        // us through — the cache's publish set it to src and would
        // otherwise block our republish. Also clear failedUrlRef
        // because retry() set it to the cache URL on the cache-tier
        // bump; the next retry (when the proxy URL also fails) must
        // not hit the duplicate-failure guard against the new src.
        resolvedForSrcRef.current = undefined;
        failedUrlRef.current = undefined;
        tierRef.current = "proxy";
        publish(res.url, false);
        fetchUpstreamBlob(res.url);
      })
      .catch(() => {
        if (cancelled) return;
        // 3) Last-resort fallback: original Leafly / Weedmaps URL.
        // Only publish if nothing has won yet.
        if (resolvedForSrcRef.current === src) return;
        tierRef.current = "upstream";
        publish(src, false);
        fetchUpstreamBlob(src);
      });

    return () => {
      cancelled = true;
      // On unmount (or src change that tears this effect down), revoke
      // the blob we still own. The next effect run for a different src
      // will publish its own URL; keeping the previous painted image
      // during the brief overlap is handled by not clearing `url` state.
      const blob = ownedBlobRef.current;
      ownedBlobRef.current = undefined;
      if (blob) {
        // Defer so any in-flight <img> load from this same effect can
        // finish painting before the object URL disappears.
        requestAnimationFrame(() => {
          safeReleaseImage(blob);
        });
      }
    };
  }, [src]);

  const retry = useCallback(() => {
    const src = resolvedForSrcRef.current;
    if (!src || !shouldProxy(src)) return;
    if (failedUrlRef.current === resolvedForSrcRef.current) return;
    failedUrlRef.current = resolvedForSrcRef.current;
    if (tierRef.current === "cache") {
      // Cache hit URL failed. Advance to the proxy tier if we
      // already know its URL (the proxy call ran in parallel and
      // resolved before the cache did). If the proxy hasn't
      // resolved yet, the proxy .then handler will publish when
      // it does — but the component will keep showing the cache
      // spinner in the meantime, which is the right behavior.
      if (proxyUrlRef.current) {
        tierRef.current = "proxy";
        setUrl(proxyUrlRef.current);
        failedUrlRef.current = undefined;
        return;
      }
      // Proxy hasn't resolved yet. Bump tierRef so the next retry
      // (after the proxy resolves) skips the cache tier and goes
      // straight to upstream.
      tierRef.current = "proxy";
      return;
    }
    if (tierRef.current === "proxy") {
      // Proxy URL failed. Publish the upstream source and reset
      // failedUrlRef so the next retry (when the upstream also
      // fails) is not treated as a duplicate attempt for the
      // same URL.
      tierRef.current = "upstream";
      setUrl(src);
      failedUrlRef.current = undefined;
      void fetch(src, { cache: "force-cache" })
        .then(async (r) => {
          if (!r.ok) return;
          const blob = await r.blob();
          const contentType = r.headers.get("content-type") ?? undefined;
          await putCachedImage(src, blob, src, contentType);
        })
        .catch(() => {});
      return;
    }
    if (tierRef.current === "upstream") {
      // Upstream URL (== src) failed. If the caller passed a
      // distinct fallback URL, publish it as a 4th tier. If the
      // fallback is the same as src (or there is no fallback),
      // fall through to the exhausted branch.
      const fb = fallbackRef.current;
      if (
        fb &&
        fb !== src &&
        !fb.startsWith("data:") &&
        !fb.startsWith("blob:") &&
        /^https?:\/\//i.test(fb) &&
        // Avoid re-publishing the proxy URL on the fallback tier:
        // the proxy is the tier that already failed.
        fb !== proxyUrlRef.current
      ) {
        tierRef.current = "fallback";
        setUrl(fb);
        failedUrlRef.current = undefined;
        void fetch(fb, { cache: "force-cache" })
          .then(async (r) => {
            if (!r.ok) return;
            const blob = await r.blob();
            const contentType = r.headers.get("content-type") ?? undefined;
            await putCachedImage(src, blob, fb, contentType);
          })
          .catch(() => {});
        return;
      }
      // No usable fallback — mark exhausted.
      tierRef.current = "done";
      setExhausted(true);
      return;
    }
    if (tierRef.current === "fallback") {
      // The 4th-tier fallback URL also failed. Mark exhausted so
      // the component can render the leaf placeholder.
      tierRef.current = "done";
      setExhausted(true);
      return;
    }
    // tierRef is "done" — already exhausted.
  }, []);

  return { url, retry, exhausted };
}

function shouldProxy(src: string): boolean {
  // Already on Firebase Storage (from a previous proxy call) — fetch
  // directly. The browser's HTTP cache will pick these up on repeat
  // visits, and the IndexedDB blob cache above will pick them up
  // even faster.
  if (/^https?:\/\/storage\.googleapis\.com\//i.test(src)) return false;
  if (src.includes("googleapis.com/")) return false;
  if (src.startsWith("data:")) return false;
  if (src.startsWith("blob:")) return false;
  return /^https?:\/\//i.test(src);
}
