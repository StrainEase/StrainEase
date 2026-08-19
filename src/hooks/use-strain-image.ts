import { useEffect, useState } from "react";
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
 * Returns `undefined` while the first cache lookup is in flight (the
 * caller's `<img>` stays hidden), then either a blob URL, the
 * proxied URL, or the upstream URL. If every layer fails the caller
 * renders the leaf fallback.
 */
export function useStrainImage(src: string | undefined): {
  url: string | undefined;
} {
  const [url, setUrl] = useState<string | undefined>(undefined);

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
    let lastBlobUrl: string | undefined;

    const publish = (next: string | undefined) => {
      if (cancelled) return;
      setUrl(next);
    };

    // 1) On-device blob cache. Promise-based so we can fire it in
    //    parallel with the proxy warmup below; whichever wins first
    //    paints the image. A blob hit means zero network round-trips
    //    for this render.
    getCachedImage(src)
      .then((hit) => {
        if (cancelled || !hit) return;
        lastBlobUrl = hit.url;
        publish(hit.url);
      })
      .catch(() => {
        // IndexedDB unavailable or errored — fall through to proxy.
      });

    // 2) Proxy via the Firebase function. The proxy returns a public
    //    Storage URL we hand to the <img> tag. We also fetch the
    //    bytes once and stash them in IndexedDB so the next visit
    //    lands in the cache above.
    void cachedStrainImage(src)
      .then(async (res) => {
        if (cancelled) return;
        publish(res.url);
        // Hydrate the blob cache. Failures here are silent — the
        // proxy URL is already in the caller's hand.
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
        // 3) Last-resort fallback: let the browser hit the original
        //    Leafly / Weedmaps URL directly. Most catalog photos are
        //    still served from there, and <img onError> in StrainImage
        //    will swap to the leaf fallback when even that fails.
        publish(src);
        // Also hydrate the blob cache from the direct URL so a
        // second visit doesn't have to retry either.
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
      releaseImage(lastBlobUrl);
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
