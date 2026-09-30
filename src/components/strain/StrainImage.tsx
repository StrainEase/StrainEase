import { useStrainImage } from "@/hooks/use-strain-image";
import { Leaf, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

function fallbackTone(type?: string) {
  switch (type) {
    case "indica":
      return {
        box: "bg-amber-500/14",
        icon: "text-amber-700/70 dark:text-amber-400/70",
      };
    case "sativa":
      return {
        box: "bg-sky-500/14",
        icon: "text-sky-700/70 dark:text-sky-400/70",
      };
    default:
      return { box: "bg-primary/10", icon: "text-primary/70" };
  }
}

/**
 * Strain photo with graceful loading. Paints a skeleton block while the
 * first image for this component is in flight, falls back to a leaf
 * icon when the source is missing or fails to load.
 *
 * Once an image has successfully loaded we keep showing it while a new
 * URL is resolving (src change or cache layer upgrade). That avoids the
 * flash back to the gradient skeleton that previously happened when the
 * proxy overwrote a blob-cache hit, or when navigating between strains.
 *
 * If the resolved URL fails to load (the proxy returned a stale or
 * deleted object, the upstream is being slow, etc.) the component
 * keeps the skeleton up instead of flashing the browser's broken-image
 * icon, then asks the hook to publish the next-best source. The leaf
 * fallback only shows once the hook has exhausted every source — the
 * user no longer sees a "giving up too soon" placeholder mid-retry.
 *
 * `fallbackSrc` is an optional curated direct upstream URL (typically
 * `getPhotoURL(slug)` from `@/lib/strain-catalog`). It is the *fourth*
 * tier in the resolver — consulted only after the primary `src` has
 * been tried and failed at the cache, proxy, and upstream tiers. This
 * mirrors the iOS / Android `StrainPhoto` story: a dead Firebase
 * Storage URL falls back to the catalog's curated Leafly / Weedmaps
 * direct URL instead of leaving the user with a leaf placeholder.
 * Callers without a per-strain slug (e.g. the terpene rail, where the
 * row is keyed by a strain profile but a catalog slug isn't always
 * available) just omit this prop.
 */
export function StrainImage({
  src,
  alt,
  className,
  iconClassName,
  type,
  fallbackSrc,
}: {
  src?: string;
  alt: string;
  className?: string;
  iconClassName?: string;
  type?: string;
  fallbackSrc?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  // Last URL that successfully painted. Kept across URL changes so we
  // can keep the previous image visible while the next one loads.
  const [stableUrl, setStableUrl] = useState<string | undefined>(undefined);
  const { url, retry, exhausted } = useStrainImage(src, { fallback: fallbackSrc });
  const prevUrlRef = useRef<string | undefined>(undefined);
  // True once the hook has acknowledged a failure for the current URL
  // and we are waiting for the next source. While this is set the
  // broken <img> is hidden behind the spinner so the user never sees
  // a browser "missing image" icon between retries.
  const [awaitingRetry, setAwaitingRetry] = useState(false);

  // When the resolved URL changes, mark the new candidate as not-yet-
  // loaded, but do NOT clear stableUrl — the previous image stays up.
  useEffect(() => {
    if (url === prevUrlRef.current) return;
    prevUrlRef.current = url;
    setLoaded(false);
    setFailedSrc(null);
    setAwaitingRetry(false);
  }, [url]);

  // Once the hook reports every source tier has been tried, surface
  // the leaf fallback. Without this, the shimmer would sit forever
  // after the upstream URL also failed.
  const showFallback =
    exhausted ||
    (!url && !stableUrl) ||
    (url != null && failedSrc === url && !awaitingRetry);
  const tone = fallbackTone(type);

  // Prefer the newly resolved URL once it has loaded; otherwise keep
  // painting the last successful image. While a retry is in flight we
  // deliberately hide the failed <img> (it's broken) and let the
  // skeleton show, so the user doesn't see the browser's default
  // broken-image state between attempts.
  const displayUrl = loaded && url ? url : (stableUrl ?? url);
  const hideCurrent = awaitingRetry && !loaded;

  if (exhausted || (showFallback && !displayUrl)) {
    return (
      <div
        className={cn("flex items-center justify-center", tone.box, className)}
        aria-hidden
      >
        <Leaf className={cn("size-6", tone.icon, iconClassName)} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex items-center justify-center bg-white overflow-hidden",
        className,
      )}
    >
      {/* First-load placeholder (no prior image to keep up). Once
          we have a stable image, this never reappears — subsequent
          URL swaps just paint the previous image behind the retry
          spinner. */}
      {!displayUrl && (
        <span aria-hidden className="skeleton-line absolute inset-0" />
      )}
      {/* Retry spinner. The repository convention is to use
          <Loader2 /> for loading states rather than skeletons;
          the spinner only appears when an image failed and we
          are waiting for the next source, so it never races
          with the first-load skeleton above. */}
      {hideCurrent && (
        <Loader2
          className="size-5 animate-spin text-muted-foreground/60"
          aria-label="Loading alternate image"
        />
      )}
      {/* Show the previous loaded image while the new URL is
          resolving. We deliberately don't render the new <img>
          visually until it has actually loaded — the browser would
          otherwise paint a broken-image glyph for the few hundred
          ms between src swap and load completion, which read as
          "image gone" even when the next source was about to come
          through. The new <img> is still in the DOM (sr-only) so
          its onLoad / onError handlers fire and can drive the
          retry path. */}
      {displayUrl && (
        <img
          src={displayUrl}
          alt={alt}
          className="absolute inset-0 h-full w-full object-contain"
        />
      )}
      {url && (
        <img
          key={url}
          src={url}
          alt=""
          aria-hidden
          className="sr-only"
          onLoad={() => {
            setLoaded(true);
            setStableUrl(url);
            setAwaitingRetry(false);
          }}
          onError={() => {
            if (!url) return;
            setFailedSrc(url);
            // Ask the hook to try the next source tier (upstream
            // first, then the curated fallback) before we declare
            // the image gone. The hook will publish a new URL;
            // the effect above will clear this flag when the URL
            // changes.
            setAwaitingRetry(true);
            retry();
          }}
        />
      )}
    </div>
  );
}
