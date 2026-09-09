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
 * Resolve a strain image through three layered caches:
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
 *
 * On every successful network response (proxy or direct) we also
 * hydrate the IndexedDB blob cache so the next visit is instant.
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
 * to publish the next-best source — first the upstream, then a fresh
 * proxy attempt if the upstream is also bad.
 *
 * Returns `undefined` only on the very first resolve for a given
 * component mount (no prior image). After that the last good URL
 * stays until a better one arrives or the component unmounts.
 *
 * `exhausted` is `true` once every source tier (proxy + upstream)
 * has been tried and the upstream URL also failed to load. The
 * caller renders the leaf fallback once it goes `true`; without
 * it the leaf never shows because the hook would otherwise sit on
 * the dead upstream URL indefinitely.
 */
export function useStrainImage(src: string | undefined): {
  url: string | undefined;
  retry: () => void;
  exhausted: boolean;
} {
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
  const tierRef = useRef<"proxy" | "upstream" | "done">("proxy");

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
      tierRef.current = "proxy";
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
        tierRef.current = "done";
        publish(hit.url, true);
      })
      .catch(() => {
        // IndexedDB unavailable or errored — fall through to proxy.
      });

    // 2) Proxy via the Firebase function.
    void cachedStrainImage(src)
      .then(async (res) => {
        if (cancelled) return;
        // Keep tierRef at "proxy" here. If the proxy URL turns out
        // to be dead (object deleted, stale CDN edge), retry()
        // needs to be able to advance to the upstream tier, and
        // jumping straight to "done" would skip the original
        // Leafly / Weedmaps URL and leave the user on a broken
        // image forever.
        tierRef.current = "proxy";
        publish(res.url, false);
        fetchUpstreamBlob(res.url);
      })
      .catch(() => {
        if (cancelled) return;
        // 3) Last-resort fallback: original Leafly / Weedmaps URL.
        // Only publish if nothing has won yet.
        tierRef.current = "done";
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
    // Allow the next tier to publish even though we already have a
    // URL for this src — the current one just failed to load.
    resolvedForSrcRef.current = undefined;
    if (tierRef.current === "proxy") {
      // Proxy already gave us a URL once and it didn't load. Skip
      // straight to the upstream source.
      tierRef.current = "done";
      setUrl(src);
      void fetch(src, { cache: "force-cache" })
        .then(async (r) => {
          if (!r.ok) return;
          const blob = await r.blob();
          const contentType = r.headers.get("content-type") ?? undefined;
          await putCachedImage(src, blob, src, contentType);
        })
        .catch(() => {});
    } else {
      // Either tierRef is "upstream" (we already advanced past the
      // proxy and the upstream also just failed) or tierRef is
      // "done" because the proxy call itself threw and the catch
      // handler published the upstream URL — either way, nothing
      // left to try. Signal exhaustion to the component so it can
      // show the leaf fallback instead of sitting on the shimmer.
      tierRef.current = "done";
      setExhausted(true);
    }
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
