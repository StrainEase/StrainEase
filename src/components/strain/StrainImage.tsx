import { useStrainImage } from "@/hooks/use-strain-image";
import { Leaf } from "lucide-react";
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
 */
export function StrainImage({
  src,
  alt,
  className,
  iconClassName,
  type,
}: {
  src?: string;
  alt: string;
  className?: string;
  iconClassName?: string;
  type?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  // Last URL that successfully painted. Kept across URL changes so we
  // can keep the previous image visible while the next one loads.
  const [stableUrl, setStableUrl] = useState<string | undefined>(undefined);
  const { url, retry } = useStrainImage(src);
  const prevUrlRef = useRef<string | undefined>(undefined);
  // True once the hook has acknowledged a failure for the current URL
  // and we are waiting for the next source. While this is set the
  // broken <img> is hidden behind the skeleton so the user never sees
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

  const showFallback = (!url && !stableUrl) || (url != null && failedSrc === url && !awaitingRetry);
  const tone = fallbackTone(type);

  // Prefer the newly resolved URL once it has loaded; otherwise keep
  // painting the last successful image. While a retry is in flight we
  // deliberately hide the failed <img> (it's broken) and let the
  // skeleton show, so the user doesn't see the browser's default
  // broken-image state between attempts.
  const displayUrl = loaded && url ? url : stableUrl ?? url;
  const hideCurrent = awaitingRetry && !loaded;

  if (showFallback && !displayUrl) {
    return (
      <div
        className={cn(
          "flex items-center justify-center",
          tone.box,
          className,
        )}
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
      {/* Skeleton while we have nothing to show OR while we are
          waiting for the hook to publish the next source after a
          failure. The second case used to render a broken <img>
          instead, which read as "gave up" even though the next
          retry was on its way. */}
      {(!displayUrl || hideCurrent) && (
        <span
          aria-hidden
          className="skeleton-line absolute inset-0"
        />
      )}
      {/* Keep the stable (previous) image under the new one while it loads. */}
      {stableUrl && stableUrl !== url && !hideCurrent && (
        <img
          src={stableUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-contain"
        />
      )}
      {url && (
        <img
          key={url}
          src={url}
          alt={alt}
          className={cn(
            "relative h-full w-full object-contain transition-opacity duration-300",
            hideCurrent
              ? "opacity-0"
              : loaded || !stableUrl
                ? "opacity-100"
                : "opacity-0",
          )}
          onLoad={() => {
            setLoaded(true);
            setStableUrl(url);
            setAwaitingRetry(false);
          }}
          onError={() => {
            if (!url) return;
            setFailedSrc(url);
            // Ask the hook to try the next source tier (upstream)
            // before we declare the image gone. The hook will
            // publish a new URL; the effect above will clear this
            // flag when the URL changes.
            setAwaitingRetry(true);
            retry();
          }}
        />
      )}
    </div>
  );
}
