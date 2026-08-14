import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import logo from "@/assets/logo.svg";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AnalysisPanel } from "@/components/compare/AnalysisPanel";
import { StrainDetailCard } from "@/components/compare/StrainDetailCard";
import { typeBadgeClass, TYPE_LABEL } from "@/lib/strain-ui";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Check,
  FlaskConical,
  Loader2,
  LogOut,
  Search,
  Sparkles,
  X,
} from "lucide-react";

type StrainDoc = Doc<"strains">;

const CONDITIONS = [
  "Chronic pain",
  "Anxiety",
  "Insomnia",
  "Depression",
  "Nausea & appetite",
  "Inflammation",
  "Migraine",
  "Muscle spasm",
  "PTSD",
  "Fatigue",
  "Arthritis",
  "Stress",
];

const QUICK_PICKS: { label: string; condition: string; strains: string[] }[] = [
  {
    label: "Chronic pain",
    condition: "Chronic pain",
    strains: ["Blue Dream", "OG Kush"],
  },
  {
    label: "Insomnia",
    condition: "Insomnia",
    strains: ["Granddaddy Purple", "Northern Lights"],
  },
  {
    label: "Anxiety",
    condition: "Anxiety",
    strains: ["Blue Dream", "Gelato"],
  },
  {
    label: "Depression & fatigue",
    condition: "Depression",
    strains: ["Jack Herer", "Sour Diesel"],
  },
];

const RESEARCH_STEPS = [
  "Loading strain profiles…",
  "Cross-referencing Leafly, Weedmaps & Reddit…",
  "Synthesizing the comparison with MiniMax AI…",
];

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const strains = useQuery(api.strains.listStrains);
  const seedStrains = useMutation(api.strains.seedStrains);
  const runComparison = useAction(api.compare.compareStrains);

  type CompareResult = Awaited<ReturnType<typeof runComparison>>;

  const [selectedIds, setSelectedIds] = useState<Id<"strains">[]>([]);
  const [condition, setCondition] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<CompareResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Lazily seed the knowledge base the first time the workspace loads.
  useEffect(() => {
    if (strains !== undefined && strains.length === 0) {
      void seedStrains();
    }
  }, [strains, seedStrains]);

  // Cycle through research status messages while a comparison runs.
  useEffect(() => {
    if (!isRunning) {
      setStepIndex(0);
      return;
    }
    const timer = setInterval(
      () => setStepIndex((i) => Math.min(i + 1, RESEARCH_STEPS.length - 1)),
      1600,
    );
    return () => clearInterval(timer);
  }, [isRunning]);

  const selectedStrains = useMemo(
    () =>
      (strains ?? []).filter((s) => selectedIds.includes(s._id)) as StrainDoc[],
    [strains, selectedIds],
  );

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return (strains ?? [])
      .filter((s) => {
        const haystack = [
          s.name,
          s.type,
          s.lineage,
          ...s.medicalUses,
          ...s.effects.map((e) => e.name),
          ...s.terpenes.map((t) => t.name),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 8);
  }, [strains, query]);

  const toggleStrain = (id: Id<"strains">) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const toggleCondition = (c: string) => {
    setCondition((prev) => (prev === c ? null : c));
  };

  const handleCompare = async (
    ids: Id<"strains">[] = selectedIds,
    focus: string | null = condition,
  ) => {
    if (ids.length < 2 || isRunning) return;
    setIsRunning(true);
    setError(null);
    try {
      const comparison = await runComparison({
        strainIds: ids,
        condition: focus ?? undefined,
      });
      setResult(comparison);
      requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsRunning(false);
    }
  };

  const applyQuickPick = async (pick: (typeof QUICK_PICKS)[number]) => {
    if (!strains) return;
    const ids = strains
      .filter((s) => pick.strains.includes(s.name))
      .map((s) => s._id);
    if (ids.length < 2) return;
    setSelectedIds(ids);
    setCondition(pick.condition);
    setResult(null);
    setQuery("");
    await handleCompare(ids, pick.condition);
  };

  const resetComparison = () => {
    setResult(null);
    setError(null);
    setSelectedIds([]);
    setCondition(null);
  };

  const atCap = selectedIds.length >= 3;

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src={logo}
              alt="StrainWise logo"
              width={30}
              height={30}
              className="rounded-lg"
            />
            <span className="text-base font-semibold tracking-tight">
              StrainWise
            </span>
          </Link>
          <div className="flex items-center gap-4">
            {user?.name && (
              <span className="hidden text-sm text-muted-foreground sm:block">
                {user.name}
              </span>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer gap-2"
              onClick={() => void signOut()}
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="grid items-start gap-8 lg:grid-cols-[340px_1fr]">
          {/* ── Config panel ───────────────────────────────── */}
          <aside className="lg:sticky lg:top-24">
            <Card className="border-border/70 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FlaskConical className="size-4 text-primary" />
                  New comparison
                </CardTitle>
                <CardDescription>
                  Pick 2–3 strains and, optionally, the condition you&apos;re
                  treating.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Strain picker */}
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    1 · Choose strains (2–3)
                  </p>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search strains, effects, conditions…"
                      className="pl-9"
                    />
                  </div>

                  {selectedStrains.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {selectedStrains.map((s) => (
                        <span
                          key={s._id}
                          className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/8 py-1 pl-3 pr-1.5 text-xs font-medium text-primary"
                        >
                          {s.name}
                          <button
                            type="button"
                            aria-label={`Remove ${s.name}`}
                            className="rounded-full p-0.5 transition-colors hover:bg-primary/15"
                            onClick={() => toggleStrain(s._id)}
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {searchResults.length > 0 ? (
                    <div className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-border/70 bg-background">
                      {searchResults.map((s) => {
                        const isSelected = selectedIds.includes(s._id);
                        const disabled = atCap && !isSelected;
                        return (
                          <button
                            key={s._id}
                            type="button"
                            disabled={disabled}
                            onClick={() => toggleStrain(s._id)}
                            className={cn(
                              "flex w-full items-center justify-between gap-3 border-b border-border/50 px-3.5 py-2.5 text-left transition-colors last:border-b-0",
                              isSelected
                                ? "bg-primary/5"
                                : "hover:bg-accent/60",
                              disabled && "cursor-not-allowed opacity-40",
                            )}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {s.name}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {s.medicalUses.slice(0, 3).join(" · ")}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <Badge
                                className={cn(
                                  typeBadgeClass(s.type),
                                  "capitalize",
                                )}
                              >
                                {TYPE_LABEL[s.type]}
                              </Badge>
                              {isSelected && (
                                <Check className="size-4 text-primary" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    query.trim() !== "" && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        No strains match “{query}”.
                      </p>
                    )
                  )}
                </div>

                {/* Condition focus */}
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    2 · Condition focus (optional)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {CONDITIONS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleCondition(c)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                          condition === c
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border/70 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Run */}
                <div className="space-y-2 pt-1">
                  <Button
                    type="button"
                    className="w-full cursor-pointer rounded-full"
                    size="lg"
                    disabled={selectedIds.length < 2 || isRunning}
                    onClick={() => void handleCompare()}
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Researching…
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4" />
                        Compare strains
                      </>
                    )}
                  </Button>
                  {selectedIds.length < 2 && (
                    <p className="text-center text-xs text-muted-foreground">
                      Select at least two strains to compare.
                    </p>
                  )}
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertTitle>Comparison failed</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </aside>

          {/* ── Results ─────────────────────────────────────── */}
          <section ref={resultsRef} className="scroll-mt-24">
            {isRunning ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-border/70 bg-card px-8 py-20 text-center shadow-sm">
                <div className="relative">
                  <Loader2 className="size-9 animate-spin text-primary" />
                </div>
                <p className="mt-6 text-base font-semibold tracking-tight">
                  {RESEARCH_STEPS[stepIndex]}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Usually takes 5–15 seconds. We&apos;re reading across Leafly,
                  Weedmaps, Reddit, Google and dispensary menus.
                </p>
              </div>
            ) : result ? (
              <div className="space-y-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                      Your comparison
                    </p>
                    <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                      {result.strains.map((s) => s.name).join(" vs. ")}
                      {result.analysis.forCondition && (
                        <span className="text-muted-foreground">
                          {" "}
                          · for {condition ?? "your condition"}
                        </span>
                      )}
                    </h1>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer rounded-full"
                    onClick={resetComparison}
                  >
                    New comparison
                  </Button>
                </div>

                <AnalysisPanel analysis={result.analysis} />

                <div
                  className={cn(
                    "grid gap-6",
                    result.strains.length === 3
                      ? "md:grid-cols-2 xl:grid-cols-3"
                      : "md:grid-cols-2",
                  )}
                >
                  {result.strains.map((s) => {
                    const best = result.analysis.forCondition?.best;
                    const runnerUp = result.analysis.forCondition?.runnerUp;
                    const norm = (v: string) => v.trim().toLowerCase();
                    let badge: "best" | "runnerUp" | null = null;
                    if (best && norm(s.name) === norm(best)) badge = "best";
                    else if (
                      runnerUp &&
                      norm(s.name) === norm(runnerUp)
                    )
                      badge = "runnerUp";
                    return (
                      <StrainDetailCard key={s._id} strain={s} badge={badge} />
                    );
                  })}
                </div>

                <p className="flex items-center gap-2 text-xs leading-5 text-muted-foreground">
                  <Sparkles className="size-3.5 shrink-0 text-primary" />
                  AI comparison generated with MiniMax-M2.5-highspeed from aggregated
                  public sources. Not medical advice — consult your healthcare
                  provider.
                </p>
              </div>
            ) : (
              /* ── Empty state ─────────────────────────────── */
              <div className="space-y-8">
                <div className="rounded-2xl border border-border/70 bg-card px-8 py-12 text-center shadow-sm">
                  <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <FlaskConical className="size-7" />
                  </div>
                  <h1 className="mt-5 text-2xl font-semibold tracking-tight">
                    Pick two or three strains to begin
                  </h1>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                    Choose strains on the left (search by name, effect or
                    condition), or jump in with a ready-made comparison below.
                  </p>
                </div>

                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Quick starts
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {QUICK_PICKS.map((pick) => (
                      <button
                        key={pick.label}
                        type="button"
                        disabled={isRunning}
                        onClick={() => void applyQuickPick(pick)}
                        className="group flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-5 py-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md disabled:opacity-50"
                      >
                        <div>
                          <p className="text-sm font-semibold tracking-tight">
                            {pick.strains.join(" vs. ")}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Focus: {pick.condition}
                          </p>
                        </div>
                        <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
