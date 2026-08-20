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
  const { url } = useStrainImage(src);
  const prevUrlRef = useRef<string | undefined>(undefined);

  // When the resolved URL changes, mark the new candidate as not-yet-
  // loaded, but do NOT clear stableUrl — the previous image stays up.
  useEffect(() => {
    if (url === prevUrlRef.current) return;
    prevUrlRef.current = url;
    setLoaded(false);
    setFailedSrc(null);
  }, [url]);

  const showFallback = (!url && !stableUrl) || (url != null && failedSrc === url);
  const tone = fallbackTone(type);

  // Prefer the newly resolved URL once it has loaded; otherwise keep
  // painting the last successful image.
  const displayUrl = loaded && url ? url : stableUrl ?? url;

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
        "relative flex items-center justify-center overflow-hidden bg-white",
        className,
      )}
    >
      {/* Skeleton only on the very first load when we have nothing to show. */}
      {!displayUrl && (
        <span
          aria-hidden
          className="skeleton-line absolute inset-0"
        />
      )}
      {/* Keep the stable (previous) image under the new one while it loads. */}
      {stableUrl && stableUrl !== url && (
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
            loaded || !stableUrl ? "opacity-100" : "opacity-0",
          )}
          onLoad={() => {
            setLoaded(true);
            setStableUrl(url);
          }}
          onError={() => {
            if (url) setFailedSrc(url);
          }}
        />
      )}
    </div>
  );
}
