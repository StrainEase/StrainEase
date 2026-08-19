import { useEffect, useRef, useState } from "react";
import { cachedStrainImage } from "@/lib/strain-api";
import {
  getCachedImage,
  putCachedImage,
  releaseImage,
} from "@/lib/image-blob-cache";

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
 * Returns `undefined` only on the very first resolve for a given
 * component mount (no prior image). After that the last good URL
 * stays until a better one arrives or the component unmounts.
 */
export function useStrainImage(src: string | undefined): {
  url: string | undefined;
} {
  const [url, setUrl] = useState<string | undefined>(undefined);
  // Track the blob URL we own so we can revoke it safely on unmount
  // (or when we deliberately replace it). Never revoke while the
  // published `url` still points at it.
  const ownedBlobRef = useRef<string | undefined>(undefined);
  // Once any layer has published a URL for the current `src`, later
  // layers are ignored.
  const resolvedForSrcRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!src) {
      // Clear only when there is truly no source. Keep the previous
      // image if the parent briefly passes undefined during a re-render.
      return;
    }
    if (!shouldProxy(src)) {
      resolvedForSrcRef.current = src;
      setUrl(src);
      return;
    }

    // New src → allow a fresh first-success for this key. Do NOT clear
    // `url` so the previous image stays visible while we resolve.
    if (resolvedForSrcRef.current !== src) {
      resolvedForSrcRef.current = undefined;
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
          releaseImage(previousBlob);
        });
      }
    };

    // 1) On-device blob cache — runs in parallel with the proxy.
    getCachedImage(src)
      .then((hit) => {
        if (cancelled || !hit) return;
        publish(hit.url, true);
      })
      .catch(() => {
        // IndexedDB unavailable or errored — fall through to proxy.
      });

    // 2) Proxy via the Firebase function.
    void cachedStrainImage(src)
      .then(async (res) => {
        if (cancelled) return;
        publish(res.url, false);
        // Hydrate the blob cache in the background regardless of
        // whether we won the race — next visit benefits either way.
        try {
          const r = await fetch(res.url, { cache: "force-cache" });
          if (!r.ok) return;
          const blob = await r.blob();
          await putCachedImage(src, blob, res.url, res.contentType);
        } catch {
          // Network blip or CORS — next visit will retry.
        }
      })
      .catch(() => {
        if (cancelled) return;
        // 3) Last-resort fallback: original Leafly / Weedmaps URL.
        // Only publish if nothing has won yet.
        publish(src, false);
        void fetch(src, { cache: "force-cache" })
          .then(async (r) => {
            if (!r.ok) return;
            const blob = await r.blob();
            const contentType = r.headers.get("content-type") ?? undefined;
            await putCachedImage(src, blob, src, contentType);
          })
          .catch(() => {});
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
          releaseImage(blob);
        });
      }
    };
  }, [src]);

  return { url };
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
