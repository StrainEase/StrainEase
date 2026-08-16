import { cn } from "@/lib/utils";

type SkeletonLinesProps = {
  /**
   * Optional row layout. Defaults to a single heading + a paragraph of
   * varying-width lines, sized for the Strain info page card.
   */
  variant?: "strain-card" | "compact" | "strain-page" | "doctor-list";
  className?: string;
};

/**
 * Gradient shimmer placeholders for content that's loading. Used when a
 * spinner would feel like an incomplete page (e.g. waiting on a network
 * call that paints a real layout once it lands).
 *
 * Each row is a soft gradient that slides left-to-right on a slow loop.
 * The motion respects `prefers-reduced-motion` via a global rule in
 * index.css (animation-duration set to 0 there).
 */
export function SkeletonLines({
  variant = "strain-card",
  className,
}: SkeletonLinesProps) {
  if (variant === "compact") {
    return (
      <div
        aria-hidden
        role="status"
        className={cn("flex flex-col gap-2", className)}
      >
        <span className="skeleton-line h-3 w-2/3 rounded-full" />
        <span className="skeleton-line h-3 w-1/2 rounded-full" />
        <span className="skeleton-line h-3 w-3/5 rounded-full" />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  if (variant === "strain-page") {
    // Full strain info page: photo + heading + description, then a
    // day-night card, then a notes card. Each block lives in its own
    // border/card so the layout the user lands on matches the
    // unloaded placeholder.
    return (
      <div
        aria-hidden
        role="status"
        className={cn("flex flex-col gap-6", className)}
      >
        <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-6">
          <span className="skeleton-line h-72 w-full rounded-xl" />
          <span className="skeleton-line mt-2 h-7 w-1/2 rounded-full" />
          <span className="skeleton-line h-4 w-3/4 rounded-full" />
          <span className="skeleton-line h-4 w-full rounded-full" />
          <span className="skeleton-line h-4 w-11/12 rounded-full" />
          <span className="skeleton-line h-4 w-2/3 rounded-full" />
        </div>
        <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-6">
          <span className="skeleton-line h-3 w-1/4 rounded-full" />
          <span className="skeleton-line h-2 w-full rounded-full" />
          <span className="skeleton-line h-3 w-1/3 rounded-full" />
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-6">
          <span className="skeleton-line h-3 w-1/4 rounded-full" />
          <span className="skeleton-line h-4 w-full rounded-full" />
          <span className="skeleton-line h-4 w-3/4 rounded-full" />
        </div>
        <span className="sr-only">Loading strain…</span>
      </div>
    );
  }

  return (
    <div
      aria-hidden
      role="status"
      className={cn("flex flex-col gap-4", className)}
    >
      <span className="skeleton-line h-7 w-1/2 rounded-full" />
      <span className="skeleton-line h-4 w-3/4 rounded-full" />
      <span className="skeleton-line h-4 w-full rounded-full" />
      <span className="skeleton-line h-4 w-11/12 rounded-full" />
      <span className="skeleton-line h-4 w-2/3 rounded-full" />
      <span className="skeleton-line mt-2 h-32 w-full rounded-2xl" />
      <span className="skeleton-line h-4 w-full rounded-full" />
      <span className="skeleton-line h-4 w-5/6 rounded-full" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}