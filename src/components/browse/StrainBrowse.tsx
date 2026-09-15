import { recommendStrains as recommendStrainsCall } from "@/lib/strain-api";
import { useEffect, useMemo, useRef, useState } from "react";
import { cacheKey, cachedRun } from "@/lib/ai-cache";
import {
  loadResearch,
  rememberCloud,
  rememberLocal,
} from "@/lib/research-history";
import { useAuth } from "@/hooks/use-auth";
import { useReliefSummary } from "@/hooks/use-relief-summary";
import { useThcSensitivity } from "@/hooks/use-thc-sensitivity";
import { useMedications } from "@/hooks/use-medications";
import { pullQuotesFromStrains } from "@/lib/quotes";
import { SaveStrainButton } from "@/components/saved/SaveStrainButton";
import { StrainNoteIndicator } from "@/components/saved/StrainNoteIndicator";
import { StrainImage } from "@/components/strain/StrainImage";
import { getPhotoURL } from "@/lib/strain-catalog";
import { slugify } from "@/lib/saved-strains";
import {
  longPressRingClass,
  useCompareLongPress,
} from "@/hooks/use-compare-long-press";
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
import { ReasoningTrace } from "@/components/compare/ReasoningTrace";
import { RedditThreads } from "@/components/compare/RedditThreads";
import { PatientPrefsFields } from "@/components/browse/PatientPrefsFields";
import { compactPrefs, type ResearchPrefs, type ThcSensitivity } from "@/lib/research-prefs";
import { CONDITIONS, TYPE_LABEL, typeBadgeClass } from "@/lib/strain-ui";
import { thcSensitivityLabel } from "@/lib/thc-sensitivity";
import { THC_BANDS, type ThcBand } from "@/lib/thc-bands";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Check,
  GitCompareArrows,
  HeartPulse,
  Loader2,
  Moon,
  Pill,
  Plus,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { Link } from "react-router";
import { useRef, useState, useEffect } from "react";

type Potency = "" | Exclude<ThcBand, "any">;

const POTENCY_OPTIONS: { value: Potency; label: string; hint: string }[] =
  THC_BANDS.map((band) => ({
    // Keep the historical `""` sentinel for "Any THC" so the rest of
    // this file (and the API contract) doesn't need to special-case
    // a new string. Bands live in lib/thc-bands so a tweak there
    // propagates here automatically.
    value: band.value === "any" ? "" : band.value,
    label: band.label,
    hint: band.hint,
  }));

const QUICK_AILMENTS = ["Insomnia", "Chronic pain", "Anxiety", "Migraine"];

const RESEARCH_STEPS = [
  "Pulling full Leafly & Weedmaps profiles…",
  "Collecting Reddit quotes for your symptoms…",
  "Ranking the best strains with Dr. Kaya…",
];

/**
 * Single recommendation card with the "press and hold to add to compare"
 * gesture wired up. Extracted from the parent so the long-press hook
 * lives on the card's own wrapper span, matching how
 * {@link import("@/components/strain/ComparableStrainPoster")} wires
 * the gesture on Home rails and the Browse grid. The visible "Add to
 * compare" button stays as the affordance; the hold is a shortcut.
 *
 * A plain tap on the strain name link still navigates to the strain
 * page; the long-press handler swallows the release click only when
 * the hold timer actually fired.
 */
function ComparableRecommendation({
  recommendation,
  index,
  profile,
  added,
  disabled,
  compareAtCap,
  onAddToCompare,
}: {
  recommendation: import("@/lib/strain-api").StrainRecommendation;
  index: number;
  profile: import("@/lib/strain-api").RecommendationResult["strains"][number] | undefined;
  added: boolean;
  disabled: boolean;
  compareAtCap: boolean | undefined;
  onAddToCompare?: (name: string) => void;
}) {
  const { handlers, flash, inCompare } = useCompareLongPress(
    recommendation.strainName,
  );
  return (
    <div
      {...handlers}
      className={cn(
        "relative flex min-w-0 snap-start flex-col rounded-2xl border border-border/70 bg-card p-5",
        flash && longPressRingClass(flash),
      )}
    >
      {inCompare && (
        <span
          aria-hidden
          className="pointer-events-none absolute right-1.5 top-1.5 z-10 flex size-6 items-center justify-center rounded-full border border-primary/50 bg-background text-primary"
          title="In the compare tray"
        >
          <Check className="size-3.5" strokeWidth={2.75} />
        </span>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {index + 1}
          </span>
          <h3 className="flex items-center gap-1.5 text-base font-semibold tracking-tight">
            <Link
              to={`/strain/${slugify(recommendation.strainName)}`}
              className="hover:text-primary"
            >
              {recommendation.strainName}
            </Link>
            <StrainNoteIndicator strainName={recommendation.strainName} />
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SaveStrainButton
            profile={
              profile ?? {
                name: recommendation.strainName,
                inKnowledgeBase: false,
              }
            }
          />
          {profile?.type && (
            <Badge
              className={cn(
                typeBadgeClass(profile.type),
                "capitalize",
              )}
            >
              {TYPE_LABEL[profile.type]}
            </Badge>
          )}
        </div>
      </div>
      {onAddToCompare && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={added ? "secondary" : "outline"}
            className={cn(
              "cursor-pointer rounded-full",
              added &&
                "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15",
              disabled && "cursor-not-allowed opacity-50",
            )}
            disabled={disabled}
            onClick={() => onAddToCompare(recommendation.strainName)}
            title={
              added
                ? "Remove from compare selection"
                : compareAtCap
                  ? "Compare is full (3 strains)"
                  : "Add to your compare selection"
            }
          >
            {added ? (
              <>
                <Check className="size-3.5" />
                Added to compare
              </>
            ) : (
              <>
                <GitCompareArrows className="size-3.5" />
                Add to compare
              </>
            )}
          </Button>
          <span className="text-xs text-muted-foreground">
            Researching only? Pick strains here, run the comparison when
            you&apos;re ready.
          </span>
        </div>
      )}
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {recommendation.reason}
      </p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {recommendation.bestFor && (
          <span className="rounded-full bg-primary/8 px-2.5 py-1 text-xs font-medium text-primary">
            Best for: {recommendation.bestFor}
          </span>
        )}
        {recommendation.caution && (
          <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700">
            Caution: {recommendation.caution}
          </span>
        )}
      </div>
      <ReasoningTrace reasoning={recommendation.reasoning} />
    </div>
  );
}

/**
 * Horizontal scroll section of strain cards with rich recommendation info.
 * Combines photo, strain info, and Add to compare functionality in ONE card per strain.
 */
function StrainCardsSection({
  recommendations,
  profilesByName,
  inCompareSelection,
  compareAtCap,
  onAddToCompare,
}: {
  recommendations: import("@/lib/strain-api").StrainRecommendation[];
  profilesByName: Map<string, import("@/lib/strain-api").RecommendationResult["strains"][number]>;
  inCompareSelection?: (name: string) => boolean;
  compareAtCap?: boolean;
  onAddToCompare?: (name: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const visibleRecommendations = recommendations.slice(0, 6);

  // Track scroll position to update active dot
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const scrollLeft = scrollContainer.scrollLeft;
      const cardWidth = scrollContainer.offsetWidth * 0.85 + 16; // card width + gap
      const newIndex = Math.round(scrollLeft / cardWidth);
      setActiveIndex(Math.min(newIndex, visibleRecommendations.length - 1));
    };

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, [visibleRecommendations.length]);

  // Scroll to specific card when dot is clicked
  const scrollToCard = (index: number) => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;
    const cardWidth = scrollContainer.offsetWidth * 0.85 + 16; // card width + gap
    scrollContainer.scrollTo({
      left: index * cardWidth,
      behavior: "smooth",
    });
    setActiveIndex(index);
  };

  return (
    <div className="space-y-3 -mx-4 px-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Tap a strain for details
      </p>
      <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth [-webkit-overflow-scrolling:touch]">
        {recommendations.slice(0, 6).map((rec, i) => {
          const profile = profilesByName.get(rec.strainName.toLowerCase());
          const strainSlug = slugify(rec.strainName);
          const added = inCompareSelection?.(rec.strainName) ?? false;
          const disabled = !added && (compareAtCap ?? false);
          return (
            <div
              key={`${rec.strainName}-${i}`}
              className="group relative flex min-w-[85vw] max-w-[85vw] snap-start flex-col rounded-2xl border border-border/70 bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md sm:min-w-[280px] sm:max-w-[280px]"
            >
              {/* Rank badge */}
              <span className="absolute left-3 top-3 z-10 flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {i + 1}
              </span>

              {/* Save button */}
              <div className="absolute right-3 top-3 z-10">
                <SaveStrainButton
                  profile={
                    profile ?? {
                      name: rec.strainName,
                      inKnowledgeBase: false,
                    }
                  }
                />
              </div>

              {/* Strain photo with proper loading - clickable to details */}
              <Link to={`/strain/${strainSlug}`} className="block overflow-hidden rounded-xl">
                <StrainImage
                  src={profile?.imageUrl}
                  alt={rec.strainName}
                  fallbackSrc={profile ? getPhotoURL(slugify(profile.name)) : undefined}
                  type={profile?.type}
                  className="h-32 w-full"
                />
              </Link>

              {/* Strain name - clickable to details */}
              <Link to={`/strain/${strainSlug}`} className="mt-3 flex items-center gap-1.5 text-sm font-semibold hover:text-primary">
                {rec.strainName}
                <StrainNoteIndicator strainName={rec.strainName} />
              </Link>

              {/* THC & Type badges */}
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {profile?.thcRange && (
                  <span className="rounded-full bg-primary/8 px-2 py-0.5 text-[10px] font-medium text-primary">
                    THC {profile.thcRange}
                  </span>
                )}
                {profile?.cbdRange && (
                  <span className="rounded-full bg-green-500/8 px-2 py-0.5 text-[10px] font-medium text-green-700">
                    CBD {profile.cbdRange}
                  </span>
                )}
                {profile?.type && (
                  <Badge
                    className={cn(
                      typeBadgeClass(profile.type),
                      "capitalize text-[10px]",
                    )}
                  >
                    {TYPE_LABEL[profile.type]}
                  </Badge>
                )}
              </div>

              {/* Best for */}
              {rec.bestFor && (
                <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
                  <span className="font-medium text-primary">Best for:</span> {rec.bestFor}
                </p>
              )}

              {/* Caution */}
              {rec.caution && (
                <p className="mt-1 text-[11px] leading-4 text-amber-700">
                  <span className="font-medium">Caution:</span> {rec.caution}
                </p>
              )}

              {/* Reason snippet */}
              {rec.reason && (
                <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                  {rec.reason}
                </p>
              )}

              {/* Matched prefs from reasoning */}
              {rec.reasoning?.preferencesApplied && rec.reasoning.preferencesApplied.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {rec.reasoning.preferencesApplied.slice(0, 2).map((pref: string, j: number) => (
                    <span
                      key={j}
                      className="rounded-full bg-amber-500/8 px-1.5 py-0.5 text-[9px] font-medium text-amber-700"
                    >
                      {pref}
                    </span>
                  ))}
                  {rec.reasoning.preferencesApplied.length > 2 && (
                    <span className="text-[9px] text-muted-foreground">
                      +{rec.reasoning.preferencesApplied.length - 2}
                    </span>
                  )}
                </div>
              )}

              {/* Add to compare button */}
              {onAddToCompare && (
                <div className="mt-3">
                  <Button
                    type="button"
                    size="sm"
                    variant={added ? "secondary" : "outline"}
                    className={cn(
                      "w-full cursor-pointer rounded-full text-xs",
                      added && "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15",
                      disabled && "cursor-not-allowed opacity-50",
                    )}
                    disabled={disabled}
                    onClick={() => onAddToCompare(rec.strainName)}
                  >
                    {added ? (
                      <>
                        <Check className="size-3" />
                        Added
                      </>
                    ) : (
                      <>
                        <GitCompareArrows className="size-3" />
                        Compare
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Indicator dots */}
      {visibleRecommendations.length > 1 && (
        <div className="flex justify-center gap-2 pt-1">
          {visibleRecommendations.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollToCard(i)}
              className={cn(
                "h-2 w-2 rounded-full transition-all duration-200",
                i === activeIndex
                  ? "w-5 bg-primary"
                  : "bg-primary/30 hover:bg-primary/50",
              )}
              aria-label={`Go to card ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function StrainBrowse({
  onCompare,
  onAddToCompare,
  inCompareSelection,
  compareAtCap,
  defaultMedications,
  defaultAilments,
  restoreId,
}: {
  onCompare: (names: string[], focus: string[]) => void;
  /**
   * Toggle a strain in the parent's compare selection. Wired to the
   * recommendation card's "Add to compare" button so a research session
   * doesn't auto-run a comparison.
   */
  onAddToCompare?: (name: string) => void;
  /** True when the named strain is already in the compare selection. */
  inCompareSelection?: (name: string) => boolean;
  /** True when the compare selection is full (e.g. 3-strain cap). */
  compareAtCap?: boolean;
  /** Pre-fill the medications field with the user's saved list. */
  defaultMedications?: string[];
  /** Pre-fill symptom chips from the user's saved ailments. */
  defaultAilments?: string[];
  restoreId?: string;
}) {
  type RecommendResult = Awaited<ReturnType<typeof recommendStrainsCall>>;

  const { user } = useAuth();
  const { hint: reliefHint, summary: reliefSummary } = useReliefSummary();
  const thcSensitivity = useThcSensitivity();
  const medications = useMedications();
  const [ailments, setAilments] = useState<string[]>([]);
  const [searched, setSearched] = useState<string[]>([]);
  const [customAilment, setCustomAilment] = useState("");
  const [potency, setPotency] = useState<Potency>("");
  const [prefs, setPrefs] = useState<ResearchPrefs>({});
  const seededMedsRef = useRef(false);
  const seededAilmentsRef = useRef(false);
  const seededSensitivityRef = useRef(false);
  const [result, setResult] = useState<RecommendResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Seed prefs.medications from the user's saved profile list on first mount.
  // Only happens once; later edits to the field win. Use hook medications if no prop provided.
  useEffect(() => {
    if (seededMedsRef.current) return;
    const meds = defaultMedications && defaultMedications.length > 0
      ? defaultMedications
      : medications.names;
    if (!meds || meds.length === 0) return;
    setPrefs((p) =>
      p.medications && p.medications !== ""
        ? p
        : { ...p, medications: meds.join(", ") },
    );
    seededMedsRef.current = true;
  }, [defaultMedications, medications.names]);

  // Seed symptom chips from Account saved ailments once, if Find is empty.
  useEffect(() => {
    if (seededAilmentsRef.current) return;
    if (!defaultAilments || defaultAilments.length === 0) return;
    setAilments((prev) => (prev.length > 0 ? prev : defaultAilments));
    seededAilmentsRef.current = true;
  }, [defaultAilments]);

  // Seed THC sensitivity from user's saved profile on first mount.
  // Always import the saved sensitivity by default.
  useEffect(() => {
    if (seededSensitivityRef.current) return;
    if (!thcSensitivity.value) return;
    setPrefs((p) =>
      p.thcSensitivity ? p : { ...p, thcSensitivity: thcSensitivity.value as ThcSensitivity },
    );
    seededSensitivityRef.current = true;
  }, [thcSensitivity.value]);

  useEffect(() => {
    if (!restoreId) return;
    let cancelled = false;
    void loadResearch(restoreId).then((stored) => {
      if (cancelled || !stored || stored.kind !== "find") return;
      const args = stored.args as { conditions?: string[] };
      if (Array.isArray(args.conditions)) setSearched(args.conditions);
      setResult(stored.result as RecommendResult);
    });
    return () => {
      cancelled = true;
    };
  }, [restoreId]);

  // Cycle through research status messages while a search runs.
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

  // Scroll the results into view once a search finishes rendering.
  useEffect(() => {
    if (!result) return;
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);

  const toggleAilment = (name: string) => {
    setAilments((prev) =>
      prev.some((a) => a.toLowerCase() === name.toLowerCase())
        ? prev.filter((a) => a.toLowerCase() !== name.toLowerCase())
        : [...prev, name],
    );
  };

  const addCustomAilment = () => {
    const trimmed = customAilment.trim();
    if (trimmed === "") return;
    toggleAilment(trimmed);
    setCustomAilment("");
  };

  const removeAilment = (name: string) =>
    setAilments((prev) =>
      prev.filter((a) => a.toLowerCase() !== name.toLowerCase()),
    );

  const customAilments = ailments.filter(
    (a) => !CONDITIONS.some((c) => c.toLowerCase() === a.toLowerCase()),
  );

  const handleFind = async (
    targets: string[] = ailments,
    pref: Potency = potency,
  ) => {
    if (targets.length === 0 || isRunning) return;
    setIsRunning(true);
    setError(null);
    setSearched(targets);
    try {
      const args = {
        conditions: targets,
        potency: pref === "" ? undefined : pref,
        prefs: compactPrefs({ ...prefs, reliefSummary }),
      };
      const res = await cachedRun(cacheKey("recommend", args), () =>
        recommendStrainsCall(args),
      );
      setResult(res);
      if (res.resultId) {
        const entry = {
          id: res.resultId,
          kind: "find" as const,
          title: `Best strains for ${targets.join(", ")}`,
          createdAt: Date.now(),
        };
        rememberLocal(entry);
        if (user) void rememberCloud(user.uid, entry);
      }
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

  const resetSearch = () => {
    setResult(null);
    setError(null);
    setAilments([]);
    setSearched([]);
    setPotency("");
    setPrefs({});
  };

  const profilesByName = useMemo(() => {
    const map = new Map<string, RecommendResult["strains"][number]>();
    for (const s of result?.strains ?? []) map.set(s.name.toLowerCase(), s);
    return map;
  }, [result]);

  const topNames =
    result?.recommendations.slice(0, 3).map((r) => r.strainName) ?? [];

  const verdictQuotes = useMemo(
    () => pullQuotesFromStrains(result?.strains ?? [], searched),
    [result, searched],
  );

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[340px_1fr]">
      {/* ── Config panel ───────────────────────────────── */}
      <aside className="min-w-0 lg:sticky lg:top-24">
        <Card className="border-border/70">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <HeartPulse className="size-4 text-primary" />
              Find best strains
            </CardTitle>
            <CardDescription>
              Tell us what you&apos;re treating — we&apos;ll research the
              strains patients report work best for it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Ailments */}
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                1 · Commonly used for
              </p>
              <div className="flex flex-wrap gap-1.5">
                {/* My Ailments chip with gold gradient - always first */}
                {defaultAilments && defaultAilments.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      // Import all saved ailments
                      setAilments((prev) => {
                        const merged = [...new Set([...prev, ...defaultAilments])];
                        return merged;
                      });
                    }}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500",
                      "border-amber-400/50 text-amber-900",
                      "hover:from-amber-400 hover:via-yellow-300 hover:to-amber-400",
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      <Star className="size-3" />
                      My Ailments ({defaultAilments.length})
                    </span>
                  </button>
                )}
                {CONDITIONS.map((c) => {
                  const active = ailments.some(
                    (a) => a.toLowerCase() === c.toLowerCase(),
                  );
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleAilment(c)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/70 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                      )}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex gap-2">
                <Input
                  value={customAilment}
                  onChange={(e) => setCustomAilment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomAilment();
                    }
                  }}
                  placeholder="Any other symptom — e.g. sciatica…"
                  className="h-9"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 cursor-pointer"
                  onClick={addCustomAilment}
                >
                  <Plus className="size-4" />
                  Add
                </Button>
              </div>
              {customAilments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {customAilments.map((a) => (
                    <span
                      key={a}
                      className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/8 py-1 pl-3 pr-1.5 text-xs font-medium text-primary"
                    >
                      {a}
                      <button
                        type="button"
                        aria-label={`Remove ${a}`}
                        className="rounded-full p-0.5 transition-colors hover:bg-primary/15"
                        onClick={() => removeAilment(a)}
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Potency */}
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                2 · THC (optional)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {POTENCY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPotency(opt.value)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      potency === opt.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/70 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {potency !== "" && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {POTENCY_OPTIONS.find((o) => o.value === potency)?.hint}
                </p>
              )}
            </div>

            {reliefHint && (
              <div className="flex items-start gap-2.5 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
                <Moon className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-xs leading-5 text-foreground">
                  {reliefHint}
                </p>
              </div>
            )}

            {/* Show imported sensitivity indicator */}
            {thcSensitivity.value && (
              <div className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500/10 via-yellow-400/10 to-amber-500/10 px-3 py-2 text-xs">
                <Sparkles className="size-3 text-amber-600" />
                <span className="text-muted-foreground">
                  Sensitivity from profile:{" "}
                  <span className="font-medium text-amber-700">
                    {thcSensitivityLabel(thcSensitivity.value)}
                  </span>
                </span>
              </div>
            )}

            {/* Show imported medications indicator */}
            {medications.names.length > 0 && prefs.medications && (
              <div className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500/10 to-indigo-500/10 px-3 py-2 text-xs">
                <Pill className="size-3 text-blue-600" />
                <span className="text-muted-foreground">
                  Medications from profile:{" "}
                  <span className="font-medium text-blue-700">
                    {medications.names.slice(0, 3).join(", ")}
                    {medications.names.length > 3 && ` +${medications.names.length - 3} more`}
                  </span>
                </span>
              </div>
            )}

            <PatientPrefsFields prefs={prefs} onChange={setPrefs} startAt={3} />

            {/* Run */}
            <div className="space-y-2 pt-1">
              <Button
                type="button"
                className="w-full cursor-pointer rounded-full"
                size="lg"
                disabled={ailments.length === 0 || isRunning}
                onClick={() => void handleFind()}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Researching…
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Find best strains
                  </>
                )}
              </Button>
              {ailments.length === 0 && (
                <p className="text-center text-xs text-muted-foreground">
                  Pick a symptom or two to get started.
                </p>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Search failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </aside>

      {/* ── Results ─────────────────────────────────────── */}
      <section ref={resultsRef} className="min-w-0 scroll-mt-24">
        {isRunning ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border/70 bg-card px-8 py-20 text-center">
            <Loader2 className="size-9 animate-spin text-primary" />
            <p className="mt-6 text-base font-semibold tracking-tight">
              {RESEARCH_STEPS[stepIndex]}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Ranking full strain profiles against your symptoms and attaching
              Reddit quotes when we find them — usually 8–20 seconds.
            </p>
          </div>
        ) : result ? (
          <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Top picks
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                  Best strains for {searched.join(", ")}
                  {(potency !== "" || prefs.timeOfDay) && (
                    <span className="text-muted-foreground">
                      {potency !== "" ? ` · ${potency} potency` : ""}
                      {prefs.timeOfDay && prefs.timeOfDay !== "anytime"
                        ? ` · ${prefs.timeOfDay}`
                        : ""}
                    </span>
                  )}
                </h1>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer rounded-full"
                onClick={resetSearch}
              >
                New search
              </Button>
            </div>

            <div>
              <h2 className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">
                {result.headline}
              </h2>
              {/* Split summary into paragraphs for better readability */}
              <div className="mt-3 max-w-3xl space-y-3 text-sm leading-7 text-muted-foreground sm:text-base">
                {result.summary
                  .split(/\n\n|\n/)
                  .filter((p) => p.trim())
                  .map((paragraph, idx) => (
                    <p key={idx}>{paragraph.trim()}</p>
                  ))}
              </div>
              {verdictQuotes.length > 0 && (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {verdictQuotes.map(({ strain, note }) => (
                    <blockquote
                      key={`${strain}-${note.source}`}
                      className="rounded-xl bg-card px-4 py-3"
                    >
                      <p className="text-sm leading-6">“{note.text}”</p>
                      <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-primary">
                        {strain} · {note.source}
                      </p>
                    </blockquote>
                  ))}
                </div>
              )}
            </div>

            {/* Horizontal scroll strain cards - ONE card per strain with photo, info, and compare */}
            {result.recommendations.length > 0 && (
              <StrainCardsSection
                recommendations={result.recommendations}
                profilesByName={profilesByName}
                inCompareSelection={inCompareSelection}
                compareAtCap={compareAtCap}
                onAddToCompare={onAddToCompare}
              />
            )}

            {/* Disclaimer above compare card */}
            <p className="flex items-center gap-2 text-xs leading-5 text-muted-foreground">
              <Sparkles className="size-3.5 shrink-0 text-primary" />
              Recommendations by Dr. Kaya, our AI cannabis care assistant.
              Synthesized from aggregated public sources. Not medical advice.
              Consult your healthcare provider.
            </p>

            {/* Compare card - full width with stacked layout */}
            <div className="space-y-3 rounded-2xl border border-primary/25 bg-primary/5 px-5 py-4">
              <div>
                <p className="text-sm font-semibold tracking-tight">
                  Narrowed it down?
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Turn your top picks into a full side-by-side comparison with
                  differences, common ground, and cautions.
                </p>
              </div>
              {topNames.length < 2 ? (
                <p className="text-xs text-muted-foreground">
                  Add at least two recommendations to compare — or use the compare
                  tab to pick your own strains.
                </p>
              ) : (
                <Button
                  type="button"
                  className="w-full cursor-pointer rounded-full"
                  disabled={topNames.length < 2}
                  onClick={() => onCompare(topNames, searched)}
                >
                  <GitCompareArrows className="size-4" />
                  Compare the top picks
                </Button>
              )}
            </div>

            <RedditThreads
              sources={result.redditSources ?? []}
              title="Reddit threads for these symptoms"
              description="Real public threads, surfaced by the model from a curated list of moderated medical and cannabis communities."
            />
          </div>
        ) : (
          /* ── Empty state ─────────────────────────────── */
          <div className="space-y-8">
            <div className="rounded-2xl border border-border/70 bg-card px-8 py-12 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <HeartPulse className="size-7" />
              </div>
              <h1 className="mt-5 text-2xl font-semibold tracking-tight">
                Start with your symptoms
              </h1>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                Pick what you&apos;re treating on the left — or jump in with a
                common starting point below. The AI ranks Leafly&apos;s strains
                by what patients report works best.
              </p>
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Quick starts
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {QUICK_AILMENTS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    disabled={isRunning}
                    onClick={() => {
                      setAilments([a]);
                      void handleFind([a]);
                    }}
                    className="group flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-5 py-4 text-left transition-[border-color,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:border-primary/40 disabled:opacity-50"
                  >
                    <div>
                      <p className="text-sm font-semibold tracking-tight">
                        Best strains for {a}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Researched across Leafly, Weedmaps &amp; Reddit
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
  );
}
