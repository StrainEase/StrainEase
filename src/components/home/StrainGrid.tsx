import { ComparableStrainPoster } from "@/components/strain/ComparableStrainPoster";
import { profileSlug } from "@/lib/strain-catalog";
import type { StrainProfile } from "@/lib/strain-profile";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/** First page rendered before the user scrolls. Matches the directory
 *  page's `PAGE_SIZE` so users see the same starting window on both
 *  surfaces. */
const INITIAL_GRID_PAGE = 24;
/** How many more strains each scroll-driven load adds. Keeps the
 *  IntersectionObserver firing at most a couple of times before the
 *  full list is on screen. */
const GRID_PAGE_STEP = 24;

/**
 * 2-column strain grid with IntersectionObserver-driven infinite
 * scroll. Mirrors the iOS `StrainGridView` (LazyVGrid) and Android
 * `StrainGridView` (LazyVerticalGrid) experience: cells appear as
 * the user scrolls instead of mounting the full list up front.
 *
 * Pass the full filtered list (`/browse/sativa` etc.) and the grid
 * progressively reveals it. When the list has 24 or fewer entries
 * the observer is skipped and everything renders at once — no extra
 * ceremony for the common case.
 */
export function StrainGrid({ strains }: { strains: StrainProfile[] }) {
  const [visibleCount, setVisibleCount] = useState(
    Math.min(INITIAL_GRID_PAGE, strains.length),
  );

  // Reset the visible window whenever the underlying list changes
  // (e.g. user navigates from /browse/sativa to /browse/hybrid) so
  // the page doesn't get stuck showing 24 strains from the old
  // section after the new one paints.
  useEffect(() => {
    setVisibleCount(Math.min(INITIAL_GRID_PAGE, strains.length));
  }, [strains]);

  const hasMore = visibleCount < strains.length;
  const visible = strains.slice(0, visibleCount);

  // IntersectionObserver sentinel: when it scrolls into view, expand
  // the visible window. Matches the iOS LazyVGrid / Android
  // LazyVerticalGrid experience: cells appear as the user scrolls.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setVisibleCount((current) =>
          Math.min(current + GRID_PAGE_STEP, strains.length),
        );
      },
      { rootMargin: "320px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, strains.length]);

  if (strains.length === 0) {
    return (
      <div className="px-2 py-20 text-center">
        <p className="font-display text-2xl tracking-tight">No strains yet</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          Check back after you browse a little more.
        </p>
      </div>
    );
  }

  // Two columns at every breakpoint, matching the iOS directory grid
  // (`DirectoryView.swift`).
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {visible.map((profile) => (
          <ComparableStrainPoster
            key={profileSlug(profile)}
            profile={profile}
            className="min-w-0"
          />
        ))}
      </div>
      {hasMore ? (
        <div
          ref={sentinelRef}
          aria-hidden
          className="flex h-12 items-center justify-center text-xs text-muted-foreground"
        >
          <Loader2
            className="size-4 animate-spin"
            aria-label="Loading more strains"
          />
        </div>
      ) : null}
    </div>
  );
}
