import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

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
  const showFallback = !src || failedSrc === src;
  const tone = fallbackTone(type);

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
        "flex items-center justify-center overflow-hidden bg-white",
        className,
      )}
    >
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-contain"
        onError={() => {
          if (src) setFailedSrc(src);
        }}
      />
    </div>
  );
}
