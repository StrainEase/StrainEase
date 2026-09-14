import { browseStrains, type StrainPreview } from "@/lib/strain-api";
import { slugify } from "@/lib/saved-strains";
import {
  CONDITIONS,
  CONDITION_ALIASES,
  TYPE_LABEL,
  typeBadgeClass,
} from "@/lib/strain-ui";
import type { StrainType } from "@/lib/strain-profile";
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

const PAGE_SIZE = 24;
const BATCH_SIZE = 24;

type TypeFilter = "all" | StrainType;
type ThcBand = "any" | "mild" | "balanced" | "strong";

/**
 * Parse the THC range strings Leafly emits (e.g. "17-24%", "~20%",
 * "<1%") and return the numeric midpoint, or null if we can't make
 * sense of it. Used to bucket strains into the same Mild / Balanced
 * / Strong ranges as the Finder's potency preference.
 */
function thcMidpoint(range: string | undefined): number | null {
  if (!range) return null;
  const cleaned = range.replace(/[%~\s<>]/g, "").trim();
  if (!cleaned) return null;
  // "<1" → 0.5
  if (range.includes("<")) {
    const n = Number(cleaned.replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? Math.max(0, n - 0.5) : null;
  }
  // "17-24" → 20.5
  const dash = cleaned.split("-");
  if (dash.length === 2) {
    const a = Number(dash[0]);
    const b = Number(dash[1]);
    if (Number.isFinite(a) && Number.isFinite(b)) return (a + b) / 2;
  }
  const single = Number(cleaned);
  if (Number.isFinite(single)) return single;
  return null;
}

const THC_BANDS: {
  value: ThcBand;
  label: string;
  range: string;
  test: (m: number) => boolean;
}[] = [
  { value: "any", label: "Any THC", range: "no preference", test: () => true },
  { value: "mild", label: "Mild", range: "under ~15%", test: (m) => m < 15 },
  {
    value: "balanced",
    label: "Balanced",
    range: "~15–22%",
    test: (m) => m >= 15 && m < 22,
  },
  {
    value: "strong",
    label: "Strong",
    range: "above ~22%",
    test: (m) => m >= 22,
  },
];

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

/** Curated ailment chips. Curated list lives in src/lib/strain-ui.ts so
 *  the same options surface across the homepage carousel, the directory,
 *  and the strain page. Filter matches against `medicalUses` aliases. */

/**
 * Browse the popular strains directory. Filters: type, THC band, and
 * effect buckets. The richer data (medicalUses, lineage, sideEffects)
 * lives on full profiles and is intentionally not filterable here —
 * the popular list is a discovery surface, not a clinical search.
 */
export function StrainDirectory() {
  // All loaded previews (accumulated across Load more batches)
  const [allPreviews, setAllPreviews] = useState<StrainPreview[] | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [thcBand, setThcBand] = useState<ThcBand>("any");
  const [effectFilter, setEffectFilter] = useState<string[]>([]);
  const [ailmentFilter, setAilmentFilter] = useState<string[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Initial load (first PAGE_SIZE strains)
  useEffect(() => {
    let cancelled = false;
    void browseStrains({ offset: 0, limit: PAGE_SIZE })
      .then((page) => {
        if (cancelled) return;
        setAllPreviews(page.previews);
        setTotalCount(page.totalCount);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadMore() {
    if (!allPreviews || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await browseStrains({
        offset: allPreviews.length,
        limit: BATCH_SIZE,
      });
      setAllPreviews((prev) => [...(prev ?? []), ...page.previews]);
    } catch {
      // Best-effort — leave what's already loaded
    } finally {
      setLoadingMore(false);
    }
  }

  const hasMore = allPreviews ? allPreviews.length < totalCount : false;

  const filtered = useMemo(() => {
    if (!allPreviews) return [];
    const q = query.trim().toLowerCase();
    const thc = THC_BANDS.find((b) => b.value === thcBand) ?? THC_BANDS[0];
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
        // Alias pass for the common cases where the catalog stores a synonym
        // (e.g. "insomnia" appears as "sleep", "ADHD" as "ADD/ADHD").
        const aliases = CONDITION_ALIASES[label] ?? [];
        return aliases.some((alias) => names.has(alias.toLowerCase()));
      });
    };
    return allPreviews.filter((p) => {
      if (typeFilter !== "all" && p.type !== typeFilter) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      const mid = thcMidpoint(p.thcRange);
      if (thcBand !== "any") {
        if (mid === null) return false;
        if (!thc.test(mid)) return false;
      }
      if (!effectMatch(p)) return false;
      if (!ailmentMatch(p)) return false;
      return true;
    });
  }, [allPreviews, query, typeFilter, thcBand, effectFilter, ailmentFilter]);

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

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Strain directory
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Browse popular strains
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

        {/* Row 2: Ailment chips */}
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

        {/* Row 3: THC band */}
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
              title={band.range}
            >
              {band.label}
            </button>
          ))}
        </div>

        {/* Row 4: effect buckets */}
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

      {allPreviews === null ? (
        // Filters paint immediately; the grid hydrates with a skeleton
        // that matches the eventual card shape so the layout doesn't
        // jump when the first batch of previews lands.
        <DirectoryGridSkeleton count={PAGE_SIZE} />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-card px-6 py-12 text-center">
          <Sparkles className="size-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold tracking-tight">
            No strains match
          </p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            {loadError
              ? "Couldn't load the catalog right now. Try again in a minute."
              : "Try widening the type or THC filter."}
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
        <div className="grid grid-cols-2 gap-4">
          {filtered.map((p) => (
            <DirectoryPreviewCard key={p.name} preview={p} />
          ))}
        </div>
      )}

      {allPreviews !== null &&
        allPreviews.length > 0 &&
        filtered.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Showing {filtered.length}
            {filtersActive ? " filtered" : ""} of {totalCount.toLocaleString()}{" "}
            strains.
          </p>
        )}

      {/* Load more — hidden once the catalog is exhausted, and also hidden
          when the current filters yield no matches (the empty state
          already prompts the user to reset). The "X remaining" message
          reflects the unfiltered catalog, so showing it under an empty
          filtered grid would be misleading. */}
      {hasMore && allPreviews !== null && filtered.length > 0 && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadMore}
            disabled={loadingMore}
            className="cursor-pointer gap-2 rounded-full px-6"
          >
            {loadingMore ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Loading…
              </>
            ) : (
              `Load more (${totalCount - allPreviews.length} remaining)`
            )}
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
function DirectoryPreviewCard({ preview }: { preview: StrainPreview }) {
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
        alt=""
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
export function DirectoryGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-4"
      aria-busy="true"
      aria-live="polite"
      data-testid="directory-grid-skeleton"
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
