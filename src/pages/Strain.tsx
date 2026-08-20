import { AppHeader, AppTabBar } from "@/components/home/AppHeader";
import { CompareToggleButton } from "@/components/compare/CompareToggleButton";
import {
  HYDRATING_SECTION_LABEL,
  HydratingLine,
  HydratingSection,
  type StrainHydrationSection,
} from "@/components/compare/HydratingSection";
import { CommunityVoices } from "@/components/compare/CommunityVoices";
import { ReliefLogButton } from "@/components/saved/ReliefLogButton";
import { SavedStrainNotes } from "@/components/saved/SavedStrainNotes";
import { StrainNoteIndicator } from "@/components/saved/StrainNoteIndicator";
import { Seo } from "@/components/Seo";
import { ShopLinks } from "@/components/strain/ShopLinks";
import { StrainDescriptionView } from "@/components/strain/StrainDescription";
import { StrainImage } from "@/components/strain/StrainImage";
import { TailoredDescriptionLoading } from "@/components/strain/TailoredDescriptionLoading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useCompareSelection } from "@/hooks/use-compare-selection";
import { useReliefSummary } from "@/hooks/use-relief-summary";
import { useTailoredDescription } from "@/hooks/use-tailored-description";
import { listenToSavedStrains, slugify } from "@/lib/saved-strains";
import { recordRecentlyViewed } from "@/lib/recently-viewed";
import {
  strainDescription,
  strainDisplayName,
  strainJsonLd,
} from "@/lib/seo";
import { documentTitle } from "@/lib/site";
import { searchStrain } from "@/lib/strain-api";
import { applyCatalogPhotos, CATALOG } from "@/lib/strain-catalog";
import { getFeaturedStrainProfile } from "@/lib/featured-strain-details";
import {
  dayNightLabel,
  dayNightScore,
  terpeneMeaning,
} from "@/lib/strain-meaning";
import { toTitleCase } from "@/lib/title-case";
import type { StrainProfile } from "@/lib/strain-profile";
import { TYPE_LABEL, typeBadgeClass } from "@/lib/strain-ui";
import { terpeneProfile, terpeneSlug } from "@/lib/terpenes";
import {
  Activity,
  ArrowLeft,
  Droplets,
  GitCompareArrows,
  HeartPulse,
  Moon,
  Search,
  Sparkles,
  Sun,
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";

function IntensityBar({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-[3px]" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 w-2.5 rounded-full ${i < value ? "bg-primary/80" : "bg-border"}`}
        />
      ))}
    </span>
  );
}

export default function Strain() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const compare = useCompareSelection();
  const { logs } = useReliefSummary();
  const [profile, setProfile] = useState<StrainProfile | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">(
    "loading",
  );
  const [savedNames, setSavedNames] = useState<string[]>([]);

  const catalogHit = CATALOG.find((item) => slugify(item.name) === slug);
  const featuredProfile = getFeaturedStrainProfile(slug);

  useEffect(() => {
    let cancelled = false;
    // Featured strains ship a preloaded profile — skip the Leafly scrape and
    // render the mock detail view immediately.
    if (featuredProfile) {
      setProfile(featuredProfile);
      setStatus("ready");
      return () => {
        cancelled = true;
      };
    }
    setStatus("loading");
    const name = catalogHit?.name ?? slug.replace(/-/g, " ");
    void searchStrain(name)
      .then((found) => {
        if (cancelled) return;
        if (found) {
          const [filled] = applyCatalogPhotos([found]);
          setProfile(filled ?? found);
          setStatus("ready");
        } else if (catalogHit) {
          const [filled] = applyCatalogPhotos([catalogHit]);
          setProfile(filled ?? catalogHit);
          setStatus("ready");
        } else {
          const [filled] = applyCatalogPhotos([
            { name, inKnowledgeBase: false },
          ]);
          setProfile(filled ?? { name, inKnowledgeBase: false });
          setStatus("missing");
        }
      })
      .catch(() => {
        if (cancelled) return;
        if (catalogHit) {
          const [filled] = applyCatalogPhotos([catalogHit]);
          setProfile(filled ?? catalogHit);
          setStatus("ready");
          return;
        }
        const [filled] = applyCatalogPhotos([
          { name, inKnowledgeBase: false },
        ]);
        setProfile(filled ?? { name, inKnowledgeBase: false });
        setStatus("missing");
      });
    return () => {
      cancelled = true;
    };
  }, [slug, catalogHit, featuredProfile]);

  useEffect(() => {
    if (!isAuthenticated || status !== "ready" || !profile) return;
    recordRecentlyViewed(profile);
  }, [isAuthenticated, status, profile]);

  useEffect(() => {
    if (!user) {
      setSavedNames([]);
      return;
    }
    return listenToSavedStrains(user.uid, (list) =>
      setSavedNames(list.map((s) => s.name)),
    );
  }, [user]);

  const score = profile ? dayNightScore(profile) : 50;
  const others = savedNames.filter(
    (n) => n.toLowerCase() !== (profile?.name ?? "").toLowerCase(),
  );
  const isSaved = useMemo(() => {
    if (!profile) return false;
    const target = profile.name.trim().toLowerCase();
    return savedNames.some((n) => n.trim().toLowerCase() === target);
  }, [profile, savedNames]);

  const isInCompareSelection = profile
    ? compare.isIn(profile.name)
    : false;
  const compareAtCap = compare.atCap;

  // Always show the strain name right away — derive it from the slug
  // while the profile is still hydrating so the header never blanks.
  // Names are normalised to title case so AI-researched and lowercase
  // catalog entries render the same way as curated ones, matching iOS.
  const displayName = useMemo(
    () => toTitleCase(strainDisplayName(profile, slug)),
    [profile, slug],
  );

  const subtitle = useMemo(() => {
    if (!profile) return "";
    return [
      profile.type ? TYPE_LABEL[profile.type] ?? profile.type : null,
      profile.thcRange ? `THC ${profile.thcRange}` : null,
      profile.thcRange && profile.cbdRange && profile.cbdRange !== "<1%"
        ? `CBD ${profile.cbdRange}`
        : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }, [profile]);

  // Sections that still need the live lookup before they have content.
  // Mirrors iOS `StrainProfile.pendingHydrationSections` so both surfaces
  // hydrate in the same order and the user always sees the full layout
  // with the right placeholder message.
  const pending: Set<StrainHydrationSection> = useMemo(() => {
    const p = new Set<StrainHydrationSection>();
    if (!profile) {
      // Cold start with no profile yet — every section is still hydrating.
      return new Set<StrainHydrationSection>([
        "lineage",
        "description",
        "dayNight",
        "uses",
        "effects",
        "terpenes",
        "sideEffects",
        "community",
      ]);
    }
    if (!profile.description) p.add("description");
    if (!profile.lineage) p.add("lineage");
    if (!profile.medicalUses || profile.medicalUses.length === 0)
      p.add("uses");
    if (!profile.effects || profile.effects.length === 0) {
      p.add("effects");
      p.add("dayNight");
    }
    if (!profile.terpenes || profile.terpenes.length === 0)
      p.add("terpenes");
    if (!profile.sideEffects || profile.sideEffects.length === 0)
      p.add("sideEffects");
    if (
      (!profile.communityNotes || profile.communityNotes.length === 0) &&
      !profile.leaflyRating
    ) {
      p.add("community");
    }
    return p;
  }, [profile]);

  const tailored = useTailoredDescription(profile);

  return (
    <main className="min-h-[100dvh] bg-background pb-24 text-foreground sm:pb-0">
      <Seo
        title={documentTitle(displayName)}
        description={strainDescription(profile, displayName)}
        path={`/strain/${slug}`}
        image={profile?.imageUrl}
        type="article"
        noindex={status === "missing"}
        jsonLd={
          status === "ready" && profile
            ? strainJsonLd(profile, slug)
            : undefined
        }
      />
      <AppHeader active="home" />

      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back
          </button>
          {profile ? (
            <CompareToggleButton
              isInSelection={isInCompareSelection}
              isFull={compareAtCap}
              onToggle={() => compare.toggle(profile.name)}
            />
          ) : (
            // Match the visible button footprint so the top bar doesn't
            // reflow when the profile lands.
            <span aria-hidden className="h-8 w-[7.5rem] rounded-full" />
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
          className="space-y-6"
        >
          {/* Header — image, name, subtitle, lineage. The name is always
              rendered (sourced from the slug while the profile is still
              loading) so the page never opens to a blank title. */}
          <header className="space-y-4">
            <StrainImage
              src={profile?.imageUrl}
              alt={`${displayName} flower`}
              type={profile?.type}
              className="h-72 w-full rounded-2xl border border-border/70"
            />
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {profile?.type ? (
                  <Badge className={typeBadgeClass(profile.type)}>
                    {TYPE_LABEL[profile.type] ?? profile.type}
                  </Badge>
                ) : null}
                {profile && !profile.inKnowledgeBase ? (
                  <Badge
                    variant="outline"
                    className="gap-1 border-primary/30 text-primary"
                  >
                    <Sparkles className="size-3" />
                    AI researched
                  </Badge>
                ) : null}
              </div>
              <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight">
                {displayName}
                {profile ? (
                  <StrainNoteIndicator strainName={profile.name} />
                ) : null}
              </h1>
              {subtitle ? (
                <p className="text-sm font-medium text-muted-foreground">
                  {subtitle}
                </p>
              ) : null}
              {pending.has("lineage") ? (
                <HydratingLine section="lineage" />
              ) : profile?.lineage ? (
                <p className="text-sm text-muted-foreground">
                  {profile.lineage}
                </p>
              ) : null}
            </div>
          </header>

          {/* Description — static text or AI-tailored three-section
              block. While the tailored fetch is in flight we keep the
              static description visible, falling back to a hydrating
              card only when neither is available. */}
          {tailored.description ? (
            <StrainDescriptionView description={tailored.description} />
          ) : tailored.isLoading && isAuthenticated ? (
            <TailoredDescriptionLoading />
          ) : profile?.description ? (
            <div className="rounded-2xl border border-border/70 bg-card p-5">
              <p className="text-sm leading-6 text-muted-foreground">
                {profile.description}
              </p>
            </div>
          ) : pending.has("description") ? (
            <HydratingSection section="description" />
          ) : null}

          {/* Day to night */}
          {pending.has("dayNight") ? (
            <HydratingSection section="dayNight" />
          ) : (
            <div className="rounded-2xl border border-border/70 bg-card p-5">
              <div className="mb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Sun className="size-3.5 text-primary" />
                  Day
                </span>
                <span className="flex items-center gap-1.5">
                  Night
                  <Moon className="size-3.5 text-primary" />
                </span>
              </div>
              <div
                className="relative h-2 rounded-full bg-gradient-to-r from-sky-300 via-sky-500 to-indigo-900 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]"
                role="meter"
                aria-valuenow={score}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Day-to-night rating"
              >
                <span
                  className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-indigo-900 shadow ring-1 ring-black/10"
                  style={{ left: `${100 - score}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {dayNightLabel(score)}
              </p>
            </div>
          )}

          {/* Reported uses */}
          {pending.has("uses") ? (
            <HydratingSection section="uses" />
          ) : profile?.medicalUses && profile.medicalUses.length > 0 ? (
            <ChipsCard
              label={HYDRATING_SECTION_LABEL.uses}
              icon={<HeartPulse className="size-3.5 text-primary" />}
              items={profile.medicalUses}
            />
          ) : null}

          {/* Effects */}
          {pending.has("effects") ? (
            <HydratingSection section="effects" />
          ) : profile?.effects && profile.effects.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {HYDRATING_SECTION_LABEL.effects}
              </p>
              <div className="rounded-2xl border border-border/70 bg-card p-5">
                <div className="space-y-2.5">
                  {profile.effects.map((effect) => (
                    <div
                      key={effect.name}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="text-sm">{effect.name}</span>
                      <IntensityBar value={effect.intensity} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {/* Terpenes */}
          {pending.has("terpenes") ? (
            <HydratingSection section="terpenes" />
          ) : profile?.terpenes && profile.terpenes.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Droplets className="size-3.5 text-primary" />
                {HYDRATING_SECTION_LABEL.terpenes}
              </p>
              <ul className="space-y-2.5">
                {profile.terpenes.map((t) => {
                  const curated = terpeneProfile(t.name);
                  const meaning = terpeneMeaning(t.name) ?? t.profile;
                  return (
                    <li
                      key={t.name}
                      className="rounded-2xl border border-border/70 bg-card p-5"
                    >
                      <p className="text-sm font-medium">
                        {curated ? (
                          <Link
                            to={`/terpene/${terpeneSlug(t.name)}`}
                            className="text-foreground transition-colors hover:text-primary"
                          >
                            {t.name}
                          </Link>
                        ) : (
                          t.name
                        )}
                      </p>
                      {meaning ? (
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {meaning}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {/* Side effects / watch for */}
          {pending.has("sideEffects") ? (
            <HydratingSection section="sideEffects" />
          ) : profile?.sideEffects && profile.sideEffects.length > 0 ? (
            <ChipsCard
              label={HYDRATING_SECTION_LABEL.sideEffects}
              icon={<Activity className="size-3.5 text-primary" />}
              items={profile.sideEffects}
            />
          ) : null}

          {/* Shop links — only meaningful once we have a real profile. */}
          {profile ? <ShopLinks strain={profile} /> : null}

          {/* Community voices */}
          {pending.has("community") ? (
            <HydratingSection section="community" />
          ) : profile &&
            (profile.communityNotes?.length || profile.leaflyRating) ? (
            <CommunityVoices
              notes={profile.communityNotes}
              strainName={profile.name}
              leaflyRating={profile.leaflyRating}
              leaflyReviewCount={profile.leaflyReviewCount}
            />
          ) : null}

          {/* AI-researched missing-state callout. Only shown once the
              lookup has settled so it doesn't flash on every page. */}
          {profile && !profile.inKnowledgeBase && status !== "loading" ? (
            <div className="flex items-start gap-2.5 rounded-2xl border border-primary/25 bg-primary/5 p-5">
              <Search className="mt-0.5 size-4 shrink-0 text-primary" />
              <p className="text-xs leading-5 text-muted-foreground">
                Not listed on Leafly or Weedmaps — this profile is researched
                by the AI from public sources. Reddit quotes appear below
                when patients mention your symptoms.
              </p>
            </div>
          ) : null}

          {/* Compare with saved strains — auth-gated, so the section is
              only shown once we know who the user is. */}
          {isAuthenticated && others.length > 0 && profile ? (
            <div className="rounded-2xl border border-primary/25 bg-primary/5 p-5">
              <p className="text-sm font-semibold tracking-tight">
                Compare with what you saved
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {others.slice(0, 4).map((name) => (
                  <Button
                    key={name}
                    asChild
                    size="sm"
                    variant="outline"
                    className="cursor-pointer rounded-full"
                  >
                    <Link
                      to={`/dashboard?mode=compare&strains=${encodeURIComponent(`${profile.name},${name}`)}`}
                    >
                      <GitCompareArrows className="size-3.5" />
                      vs {name}
                      <StrainNoteIndicator strainName={name} />
                    </Link>
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Auth-gated log + notes. */}
          {isAuthenticated && profile ? (
            <>
              <div className="rounded-2xl border border-border/70 bg-card p-5">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Relief log
                </p>
                <ReliefLogButton
                  strainName={profile.name}
                  variant="button"
                />
                {logs.filter(
                  (log) =>
                    log.strainName.trim().toLowerCase() ===
                    profile.name.trim().toLowerCase(),
                ).length > 0 ? (
                  <ul className="mt-4 space-y-2">
                    {logs
                      .filter(
                        (log) =>
                          log.strainName.trim().toLowerCase() ===
                          profile.name.trim().toLowerCase(),
                      )
                      .slice(0, 6)
                      .map((log) => (
                        <li
                          key={log.id}
                          className="rounded-xl border border-border/60 bg-background px-4 py-3 text-sm"
                        >
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-medium capitalize">
                              {log.fit.replace("-", " ")}
                            </span>
                            <span className="text-muted-foreground">
                              {log.relief}/5 relief
                            </span>
                          </div>
                          {log.note ? (
                            <p className="mt-1.5 text-sm leading-6">
                              {log.note}
                            </p>
                          ) : null}
                        </li>
                      ))}
                  </ul>
                ) : null}
              </div>
              <SavedStrainNotes
                slug={slugify(profile.name)}
                strainName={profile.name}
                isSaved={isSaved}
              />
            </>
          ) : null}
        </motion.div>
      </div>
      <AppTabBar active="home" />
    </main>
  );
}

/** Uppercase eyebrow + flow of pill chips inside a single card. Used
 *  for the "Reported uses" and "Watch for" sections, both of which are
 *  tag lists on iOS. */
function ChipsCard({
  label,
  icon,
  items,
}: {
  label: string;
  icon?: React.ReactNode;
  items: string[];
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </p>
      <div className="rounded-2xl border border-border/70 bg-card p-5">
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item}
              className="rounded-full border border-border/70 bg-background px-3 py-1.5 text-sm"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
