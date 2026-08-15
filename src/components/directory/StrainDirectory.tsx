import { popularStrains as popularStrainsCall } from "@/lib/strain-api";
import { slugify } from "@/lib/saved-strains";
import { TYPE_LABEL, typeBadgeClass } from "@/lib/strain-ui";
import type { StrainProfile } from "@/lib/strain-profile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SkeletonLines } from "@/components/ui/skeleton-lines";
import { GitCompareArrows, Loader2, Search, Sparkles } from "lucide-react";
import { Link } from "react-router";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Browse the popular strains directory. Filters arrive in a follow-up
 * PR; for now this is a search box + a clean grid of strain cards so
 * the tab has something real behind it.
 */
export function StrainDirectory() {
  const [popular, setPopular] = useState<StrainProfile[] | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "indica" | "sativa" | "hybrid">(
    "all",
  );

  useEffect(() => {
    let cancelled = false;
    void popularStrainsCall()
      .then((list) => {
        if (!cancelled) setPopular(list);
      })
      .catch(() => {
        // Leafly unreachable — leave the directory empty.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!popular) return [];
    const q = query.trim().toLowerCase();
    return popular.filter((p) => {
      if (typeFilter !== "all" && p.type !== typeFilter) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [popular, query, typeFilter]);

  if (popular === null) {
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
          Live from Leafly. Click a strain to see the full profile, or
          jump straight into a side-by-side comparison.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-card px-6 py-12 text-center">
          <Sparkles className="size-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold tracking-tight">
            No strains match
          </p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            {popular.length === 0
              ? "We couldn't reach Leafly's directory right now. Try again in a minute."
              : "Try a different name or type."}
          </p>
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
              {p.description && (
                <p className="mt-3 line-clamp-3 text-xs leading-5 text-muted-foreground">
                  {p.description}
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
                <Button
                  asChild
                  size="sm"
                  className="cursor-pointer rounded-full"
                >
                  <Link
                    to={`/dashboard?mode=compare&strains=${encodeURIComponent(p.name)}`}
                  >
                    <GitCompareArrows className="size-3.5" />
                    Compare
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {popular.length > 0 && filtered.length < popular.length && (
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {popular.length} strains.
        </p>
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