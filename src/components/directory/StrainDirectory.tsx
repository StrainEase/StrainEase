import { browseStrains, type StrainPreview } from "@/lib/strain-api";
import { slugify } from "@/lib/saved-strains";
import { CONDITIONS, TYPE_LABEL, matchesCondition, typeBadgeClass } from "@/lib/strain-ui";
import type { StrainType } from "@/lib/strain-profile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SkeletonLines } from "@/components/ui/skeleton-lines";
import { Loader2, Search, Sparkles, X } from "lucide-react";
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

const THC_BANDS: { value: ThcBand; label: string; range: string; test: (m: number) => boolean }[] = [
  { value: "any", label: "Any THC", range: "no preference", test: () => true },
  { value: "mild", label: "Mild", range: "under ~15%", test: (m) => m < 15 },
  { value: "balanced", label: "Balanced", range: "~15–22%", test: (m) => m >= 15 && m < 22 },
  { value: "strong", label: "Strong", range: "above ~22%", test: (m) => m >= 22 },
];

/**
 * Curated effect buckets. Each one maps to a set of Leafly effect
 * names so we can answer "does this strain feel Relaxing?" without
 * hard-coding a single keyword. We keep this small (six buckets) so
 * the filter strip stays scannable.
 */
const EFFECT_BUCKETS: { id: string; label: string; match: string[] }[] = [
  { id: "relaxed", label: "Relaxing", match: ["relaxed", "calm", "calming", "soothing"] },
  { id: "sleepy", label: "Sleepy", match: ["sleepy", "sedated", "drowsy"] },
  { id: "happy", label: "Happy", match: ["happy", "euphoric", "uplifted", "giggly"] },
  { id: "focused", label: "Focused", match: ["focused", "creative", "aroused"] },
  { id: "energetic", label: "Energetic", match: ["energetic", "tingly", "talkative"] },
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
    return allPreviews.filter((p) => {
      if (typeFilter !== "all" && p.type !== typeFilter) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      const mid = thcMidpoint(p.thcRange);
      if (thcBand !== "any") {
        if (mid === null) return false;
        if (!thc.test(mid)) return false;
      }
      // Note: effect bucket and ailment filters require full StrainProfile data
      // (effects[], medicalUses[]) which are not in the lightweight StrainPreview.
      // They are intentionally disabled when browsing the full catalog to keep
      // the initial load fast. Full profile data is fetched on the strain page.
      return true;
    });
  }, [allPreviews, query, typeFilter, thcBand]);

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

  if (allPreviews === null) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card p-6">
        <SkeletonLines variant="strain-card" />
      </div>
    );
  }

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
              placeholder="Filter by name…"
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

      {filtered.length === 0 ? (
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <div
              key={p.name}
              className="flex flex-col rounded-2xl border border-border/70 bg-card p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-semibold tracking-tight">
                  <Link
                    to={`/strain/${slugify(p.name)}`}
                    className="hover:text-primary"
                  >
                    {p.name}
                  </Link>
                </h3>
                {p.type && (
                  <Badge className={cn(typeBadgeClass(p.type), "capitalize")}>
                    {TYPE_LABEL[p.type] ?? p.type}
                  </Badge>
                )}
              </div>
              {p.thcRange && (
                <p className="mt-1 font-mono text-[11px] tracking-wide text-muted-foreground">
                  THC {p.thcRange}
                </p>
              )}
              {p.leaflyRating != null && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  ★ {p.leaflyRating.toFixed(1)}
                </p>
              )}
              <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="cursor-pointer rounded-full"
                >
                  <Link to={`/strain/${slugify(p.name)}`}>View</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {allPreviews.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length}
          {filtersActive ? " filtered" : ""} of {totalCount.toLocaleString()} strains.
        </p>
      )}

      {/* Load more */}
      {hasMore && (
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

/** Re-export so other PRs can wrap the directory with extra filter chips. */
export function DirectoryGridSkeleton() {
  return (
    <div className="flex justify-center py-16">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}