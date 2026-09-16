import { cn } from "@/lib/utils";

/**
 * Renders the StrainEase iOS app icon (green rounded square + leaf + rod of
 * Asclepius) as the web brand mark. The asset is the 1024×1024 PNG from
 * `marketing/icons/light-rounded.png` — self-contained, pixel-stable, no
 * SVG viewBox math, no theme trick. Used in the landing-page header,
 * footer, and mobile-menu trigger.
 */
export function BrandLogo({
  alt = "StrainEase logo",
  className,
}: {
  alt?: string;
  className?: string;
}) {
  return (
    <img
      src="/logo.png"
      alt={alt}
      width={1024}
      height={1024}
      className={cn("shrink-0", className)}
    />
  );
}
