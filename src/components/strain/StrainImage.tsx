import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

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
 * image is in flight, falls back to a leaf icon when the source is
 * missing or fails to load. `key={src}` on the img element bumps the
 * loaded state back to false when the URL changes (e.g. strain page
 * navigates between two different strains).
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
  const showFallback = !src || failedSrc === src;
  const tone = fallbackTone(type);

  // Reset the loaded flag when the source URL changes so the new image
  // gets its own skeleton frame instead of flashing in.
  useEffect(() => {
    setLoaded(false);
    setFailedSrc(null);
  }, [src]);

  if (showFallback) {
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
      {!loaded && (
        <span
          aria-hidden
          className="skeleton-line absolute inset-0"
        />
      )}
      <img
        key={src}
        src={src}
        alt={alt}
        className={cn(
          "h-full w-full object-contain transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
        )}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (src) setFailedSrc(src);
        }}
      />
    </div>
  );
}
