import { cn } from "@/lib/utils";

/**
 * Uses the iOS AppIcon mark as the web logo. Light mode keeps the green mark
 * on white; dark mode turns the mark white and gives it a dark green surface.
 */
export function BrandLogo({
  alt = "StrainEase logo",
  className,
}: {
  alt?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white dark:bg-[#0c5238]",
        className,
      )}
    >
      <img
        src="/icon-512.png"
        alt={alt}
        className="size-full object-contain dark:hidden"
      />
      <img
        src="/icon-dark-1024.png"
        alt=""
        aria-hidden="true"
        className="hidden size-full object-contain dark:block dark:brightness-0 dark:invert"
      />
    </span>
  );
}
