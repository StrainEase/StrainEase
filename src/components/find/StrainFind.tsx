import { browseStrains, type StrainPreview } from "@/lib/strain-api";
import { slugify } from "@/lib/saved-strains";
import {
  CONDITIONS,
  CONDITION_ALIASES,
  TYPE_LABEL,
  typeBadgeClass,
} from "@/lib/strain-ui";
import type { StrainType } from "@/lib/strain-profile";
import { THC_BANDS, matchesThcBand, type ThcBand } from "@/lib/thc-bands";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StrainImage } from "@/components/strain/StrainImage";
import { getPhotoURL } from "@/lib/strain-catalog";
import { recordRecentlyViewed } from "@/lib/recently-viewed";
import { Loader2, Search, Sparkles, Star, X } from "lucide-react";
import { Link } from "react-router";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * How many strains to request from the backend per page while
 * streaming the catalog into memory. The catalog is fully drained
 * up-front so filters apply to the whole set, not the loaded
 * subset — that was the root cause of "Mild THC returns nothing" and
 * the "hit Load more multiple times for a single extra strain" UX.
 */
const BACKEND_PAGE_SIZE = 100;
/** How many filtered strains to show per page in the UI. */
const UI_PAGE_SIZE = 24;

type TypeFilter = "all" | StrainType;

/**
 * Curated effect buckets. Each one maps to a set of Leafly effect
 * names so we can answer "does this strain feel Relaxing?" without
 * hard-coding a single keyword. We keep this small (six buckets) so
 * the filter strip stays scannable.
 */
const EFFECT_BUCKETS: { id: string; label: string; match: string[] }[] = [
  {
    id: "relaxed",
    label: "Relaxing",
    match: ["relaxed", "calm", "calming", "soothing"],
  },
  { id: "sleepy", label: "Sleepy", match: ["sleepy", "sedated", "drowsy"] },
  {
    id: "happy",
    label: "Happy",
    match: ["happy", "euphoric", "uplifted", "giggly"],
  },
  {
    id: "focused",
    label: "Focused",
    match: ["focused", "creative", "aroused"],
  },
  {
    id: "energetic",
    label: "Energetic",
    match: ["energetic", "tingly", "talkative"],
  },
  { id: "hungry", label: "Hungry", match: ["hungry", "appetite"] },
];

/**
 * Browse the popular strains directory. Filters: type, THC band, and
 * effect buckets. The richer data (medicalUses, lineage, sideEffects)
 * lives on full profiles and is intentionally not filterable here —
 * the popular list is a discovery surface, not a clinical search.
 *
 * The catalog is streamed in from `browseStrains` once on mount. We
 * keep loading pages until the backend reports we've drained the
 * whole catalog (`previews.length === totalCount`), then filters
 * operate on the complete set. The user-facing pagination is purely
 * a UI concern — it slices the already-filtered set into
 * `UI_PAGE_SIZE`-sized windows.
 */
export function StrainFind() {
  // All previews the backend has ever returned, accumulated across
  // background pages. `null` while the first page is still in flight.
  const [allPreviews, setAllPreviews] = useState<StrainPreview[] | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  // How many pages we've already pulled. Drives the "Loading N of M"
  // copy under the filter strip and lets the spinner disappear once
  // the catalog is fully drained.
  const [loadedCount, setLoadedCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [thcBand, setThcBand] = useState<ThcBand>("any");
  const [effectFilter, setEffectFilter] = useState<string[]>([]);
  const [ailmentFilter, setAilmentFilter] = useState<string[]>([]);
  /** UI-only page size for the already-filtered list. */
  const [visibleCount, setVisibleCount] = useState(UI_PAGE_SIZE);

  // Stream the whole catalog in the background. We never block the
  // UI on this — the filter strip paints immediately, the skeleton
  // hydrates the grid with the first batch, and subsequent pages
  // refill the cache as they arrive.
  useEffect(() => {
    let cancelled = false;
    const accumulated: StrainPreview[] = [];
    async function drain() {
      let offset = 0;
      // Pull until the backend reports we've hit the end. Guarded by
      // a hard upper bound so a misbehaving server can't loop us
      // forever.
      for (let safety = 0; safety < 200; safety++) {
        if (cancelled) return;
        try {
          const page = await browseStrains({
            offset,
            limit: BACKEND_PAGE_SIZE,
          });
          if (cancelled) return;
          accumulated.push(...page.previews);
          offset += page.previews.length;
          if (cancelled) return;
          setAllPreviews([...accumulated]);
          setLoadedCount(accumulated.length);
          setTotalCount(page.totalCount);
          if (
            page.previews.length === 0 ||
            accumulated.length >= page.totalCount
          ) {
            setLoadingMore(false);
            return;
          }
        } catch {
          if (cancelled) return;
          setLoadError(true);
          setLoadingMore(false);
          return;
        }
      }
      setLoadingMore(false);
    }
    void drain();
    return () => {
      cancelled = true;
    };
  }, []);

  // Whenever the filter set changes, reset the UI window so the user
  // sees the top of the freshly filtered list instead of page 4 of
  // something they no longer recognize.
  useEffect(() => {
    setVisibleCount(UI_PAGE_SIZE);
  }, [query, typeFilter, thcBand, effectFilter, ailmentFilter]);

  const filtered = useMemo(() => {
    if (!allPreviews) return [];
    const q = query.trim().toLowerCase();
    const selectedEffects = EFFECT_BUCKETS.filter((b) =>
      effectFilter.includes(b.id),
    );
    const effectMatch = (p: StrainPreview): boolean => {
      if (selectedEffects.length === 0) return true;
      const names = new Set((p.effects ?? []).map((e) => e.name.toLowerCase()));
      return selectedEffects.every((b) => b.match.some((kw) => names.has(kw)));
    };
    const ailmentMatch = (p: StrainPreview): boolean => {
      if (ailmentFilter.length === 0) return true;
      const names = new Set(
        (p.medicalUses ?? []).map((m) => m.name.toLowerCase()),
      );
      return ailmentFilter.every((label) => {
        const needle = label.toLowerCase();
        if (names.has(needle)) return true;
        // Alias pass for the common cases where the catalog stores a
        // synonym (e.g. "Insomnia" appears as "Sleep", "ADHD" as
        // "ADD/ADHD"). The shared alias table lives in strain-ui.
        const aliases = CONDITION_ALIASES[label] ?? [];
        return aliases.some((alias) => names.has(alias.toLowerCase()));
      });
    };
    return allPreviews.filter((p) => {
      if (typeFilter !== "all" && p.type !== typeFilter) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (!matchesThcBand(p.thcRange, thcBand)) return false;
      if (!effectMatch(p)) return false;
      if (!ailmentMatch(p)) return false;
      return true;
    });
  }, [allPreviews, query, typeFilter, thcBand, effectFilter, ailmentFilter]);

  const visible = filtered.slice(0, visibleCount);
  const filteredHasMore = filtered.length > visibleCount;

  const filtersActive =
    typeFilter !== "all" ||
    thcBand !== "any" ||
    effectFilter.length > 0 ||
    ailmentFilter.length > 0 ||
    query.trim() !== "";

  const resetFilters = () => {
    setQuery("");
    setTypeFilter("all");
    setThcBand("any");
    setEffectFilter([]);
    setAilmentFilter([]);
  };

  const toggleEffect = (id: string) => {
    setEffectFilter((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleAilment = (name: string) => {
    setAilmentFilter((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name],
    );
  };

  const catalogDoneLoading = !loadingMore && allPreviews !== null;
  const loadingProgress =
    totalCount > 0
      ? `Loading ${loadedCount.toLocaleString()} of ${totalCount.toLocaleString()}…`
      : `Loading the catalog…`;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Strain directory
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Find popular strains
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse the catalog. Filter by type or THC, then jump into a
          side-by-side comparison.
        </p>
      </div>

      <div className="space-y-4">
        {/* Row 1: search + type + reset */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the catalog"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(["all", "indica", "sativa", "hybrid"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setTypeFilter(opt)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  typeFilter === opt
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/70 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                {opt === "all" ? "All types" : TYPE_LABEL[opt]}
              </button>
            ))}
          </div>
          {filtersActive && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="cursor-pointer self-start text-muted-foreground hover:text-foreground sm:ml-auto"
            >
              <X className="size-3.5" />
              Reset filters
            </Button>
          )}
        </div>

        {/* Row 2: Commonly used for — uses the same chip list as the
             Find tab so the ailment vocabulary matches across the app. */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Commonly used for
          </span>
          {CONDITIONS.map((condition) => {
            const active = ailmentFilter.includes(condition);
            return (
              <button
                key={condition}
                type="button"
                onClick={() => toggleAilment(condition)}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/70 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                {condition}
              </button>
            );
          })}
        </div>

        {/* Row 3: THC — same labels and ranges as the Find tab's
             Potency preference. Bands live in lib/thc-bands so a
             tweak in one place propagates everywhere. */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            THC
          </span>
          {THC_BANDS.map((band) => (
            <button
              key={band.value}
              type="button"
              onClick={() => setThcBand(band.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                thcBand === band.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/70 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
              title={band.hint}
            >
              {band.label}
            </button>
          ))}
        </div>

        {/* Row 4: Feels like — curated effect buckets. */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Feels like
          </span>
          {EFFECT_BUCKETS.map((bucket) => {
            const active = effectFilter.includes(bucket.id);
            return (
              <button
                key={bucket.id}
                type="button"
                onClick={() => toggleEffect(bucket.id)}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/70 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                {bucket.label}
              </button>
            );
          })}
        </div>
      </div>

      {!catalogDoneLoading && allPreviews === null ? (
        // First page is still in flight — paint a skeleton that
        // matches the eventual card shape so the layout doesn't jump
        // when previews land.
        <FindGridSkeleton count={UI_PAGE_SIZE} />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-card px-6 py-12 text-center">
          <Sparkles className="size-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold tracking-tight">
            No strains match
          </p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            {loadError
              ? "Couldn't load the catalog right now. Try again in a minute."
              : filtersActive
                ? "Try removing a filter or two to widen the search."
                : loadingMore
                  ? "Still loading the catalog — give it a second."
                  : "The catalog is empty."}
          </p>
          {filtersActive && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetFilters}
              className="mt-4 cursor-pointer rounded-full"
            >
              Reset filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {visible.map((p) => (
            <FindPreviewCard key={p.name} preview={p} />
          ))}
        </div>
      )}

      {allPreviews !== null && allPreviews.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing {Math.min(visible.length, filtered.length).toLocaleString()}
          {filtersActive ? " filtered" : ""} of{" "}
          {filtered.length.toLocaleString()}
          {filtersActive
            ? ` matching · ${totalCount.toLocaleString()} in catalog`
            : ""}
          {!catalogDoneLoading && (
            <span className="ml-1">· {loadingProgress}</span>
          )}
        </p>
      )}

      {/* UI-only Load more — slices the already-filtered set, so
          filters never silently drop rows that haven't streamed in
          yet (the old bug). Also hidden under an empty filtered
          grid so the user isn't invited to "load" rows that don't
          match their filters. */}
      {filteredHasMore && filtered.length > 0 && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setVisibleCount((c) => c + UI_PAGE_SIZE)
            }
            className="cursor-pointer gap-2 rounded-full px-6"
          >
            {`Load more (${(filtered.length - visible.length).toLocaleString()} remaining)`}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Lightweight directory preview card. Mirrors the home / browse rail
 * `StrainPoster` so the directory surface feels like the rest of the
 * app: rounded photo on top, type badge + name, THC range, Leafly
 * rating. The whole card is a single `Link`, so taps anywhere open
 * the strain page — no separate "View" button to find.
 *
 * Lighter than the full `StrainPoster` because it consumes
 * `StrainPreview` data (no medicalUses / effects / lineage) and
 * doesn't go through the long-press compare gesture.
 */
function FindPreviewCard({ preview }: { preview: StrainPreview }) {
  const href = `/strain/${slugify(preview.name)}`;
  const type = preview.type;

  return (
    <Link
      to={href}
      onClick={() =>
        recordRecentlyViewed({
          name: preview.name,
          inKnowledgeBase: true,
          type: type as StrainType | undefined,
          thcRange: preview.thcRange,
          imageUrl: preview.imageUrl,
          leaflyRating: preview.leaflyRating,
        })
      }
      className="group flex min-w-0 flex-col gap-2 text-left"
    >
      <StrainImage
        src={preview.imageUrl}
        fallbackSrc={getPhotoURL(preview.name)}
        alt={`${preview.name} flower`}
        type={type}
        className="aspect-[4/3] w-full rounded-2xl border border-border/70"
        iconClassName="size-7"
      />
      {type && (
        <Badge className={cn(typeBadgeClass(type), "self-start capitalize")}>
          {TYPE_LABEL[type] ?? type}
        </Badge>
      )}
      <p className="min-h-[38px] font-display text-[16px] font-semibold leading-snug text-pretty line-clamp-2">
        {preview.name}
      </p>
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {preview.thcRange && (
          <span className="font-mono text-[11px] tracking-wide text-muted-foreground">
            THC {preview.thcRange}
          </span>
        )}
        {typeof preview.leaflyRating === "number" && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wide text-primary"
            title={`Leafly average rating: ${preview.leaflyRating.toFixed(1)}`}
          >
            <Star className="size-3 fill-primary text-primary" aria-hidden />
            {preview.leaflyRating.toFixed(1)}
          </span>
        )}
      </div>
    </Link>
  );
}

/**
 * Skeleton that mirrors the directory card shape: a photo block, a
 * title bar, and a couple of meta lines. Renders `count` cards in the
 * same 2-column grid the populated state uses, so the page doesn't
 * jump when the first batch of previews lands.
 */
export function FindGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-3"
      aria-busy="true"
      aria-live="polite"
      data-testid="find-grid-skeleton"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex min-w-0 flex-col gap-2">
          <div className="skeleton-line aspect-[4/3] w-full rounded-2xl" />
          <div className="skeleton-line h-4 w-16 rounded-full" />
          <div className="skeleton-line h-4 w-3/4 rounded-full" />
          <div className="skeleton-line h-3 w-1/2 rounded-full" />
        </div>
      ))}
    </div>
  );
}
