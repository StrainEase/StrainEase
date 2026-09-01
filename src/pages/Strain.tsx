import { AppHeader, AppTabBar } from "@/components/home/AppHeader";
import { CompareToggleButton } from "@/components/compare/CompareToggleButton";
import {
  HydratingLine,
  HydratingSection,
  type StrainHydrationSection,
} from "@/components/compare/HydratingSection";
import { CommunityVoices } from "@/components/compare/CommunityVoices";
import { RedditThreads } from "@/components/compare/RedditThreads";
import { ReliefLogButton } from "@/components/saved/ReliefLogButton";
import { SavedStrainNotes } from "@/components/saved/SavedStrainNotes";
import { StrainNoteIndicator } from "@/components/saved/StrainNoteIndicator";
import { Seo } from "@/components/Seo";
import { ShopLinks } from "@/components/strain/ShopLinks";
import { ReviewSection } from "@/components/strain/ReviewSection";
import { StrainDescriptionView } from "@/components/strain/StrainDescription";
import { StrainImage } from "@/components/strain/StrainImage";
import { TailoredDescriptionLoading } from "@/components/strain/TailoredDescriptionLoading";
import { MeshBackground } from "@/components/theme/MeshBackground";
import { Badge } from "@/components/ui/badge";
import { WriteReviewDialog } from "@/components/strain/WriteReviewDialog";
import { Button } from "@/components/ui/button";
import { SWCard } from "@/components/ui/sw-card";
import { useAuth } from "@/hooks/use-auth";
import { useCompareSelection } from "@/hooks/use-compare-selection";
import { useMedications } from "@/hooks/use-medications";
import { useReliefSummary } from "@/hooks/use-relief-summary";
import { useSavedAilments } from "@/hooks/use-saved-ailments";
import { useTailoredDescription } from "@/hooks/use-tailored-description";
import { recordRecentlyViewed } from "@/lib/recently-viewed";
import {
  listenToPublicNotes,
  listenToSavedStrains,
  slugify,
  type PublicNote,
} from "@/lib/saved-strains";
import {
  strainDescription,
  strainDisplayName,
  strainJsonLd,
} from "@/lib/seo";
import { documentTitle } from "@/lib/site";
import {
  redditThreads as fetchRedditThreads,
  searchStrain,
  type StrainReview,
} from "@/lib/strain-api";
import { applyCatalogPhotos, CATALOG } from "@/lib/strain-catalog";
import type { RedditSource } from "@/lib/strain-profile";
import { getFeaturedStrainProfile } from "@/lib/featured-strain-details";
import {
  dayNightLabel,
  dayNightScore,
  terpeneMeaning,
} from "@/lib/strain-meaning";
import type { ReliefLog } from "@/lib/relief-log";
import type { StrainProfile } from "@/lib/strain-profile";
import { TYPE_LABEL, typeBadgeClass } from "@/lib/strain-ui";
import { terpeneProfile, terpeneSlug } from "@/lib/terpenes";
import { toTitleCase } from "@/lib/title-case";
import {
  Activity,
  ArrowLeft,
  Droplets,
  GitCompareArrows,
  HeartPulse,
  MessageCircle,
  Moon,
  NotebookPen,
  Pencil,
  Search,
  Sparkles,
  Sun,
  ZoomIn,
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  doc,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { useStrainImage } from "@/hooks/use-strain-image";
import { cn } from "@/lib/utils";

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
  const [patientNotes, setPatientNotes] = useState<PublicNote[]>([]);
  const [reddit, setReddit] = useState<RedditSource[]>([]);
  const [photoZoomOpen, setPhotoZoomOpen] = useState(false);
  const [redditLoading, setRedditLoading] = useState(true);

  const catalogHit = CATALOG.find((item) => slugify(item.name) === slug);
  const featuredProfile = getFeaturedStrainProfile(slug);

  useEffect(() => {
    let cancelled = false;
    if (featuredProfile) {
      const [filled] = applyCatalogPhotos([featuredProfile]);
      setProfile(filled ?? featuredProfile);
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

  // App reviews — public notes left by other StrainEase users on this
  // strain. The strain page hydrates these as a separate stream from the
  // profile (which comes from Leafly/Weedmaps) so the App Reviews tab can
  // appear independently.
  useEffect(() => {
    if (!db) {
      setPatientNotes([]);
      return;
    }
    return listenToPublicNotes(slug, setPatientNotes);
  }, [slug]);

  // Curated Reddit threads for the strain. Mirrors the iOS call so the
  // web and iOS strain detail show the same outbound links. Failures
  // are silent — the section simply doesn't render.
  useEffect(() => {
    let cancelled = false;
    const name = catalogHit?.name ?? slug.replace(/-/g, " ");
    void fetchRedditThreads({ name, conditions: [] })
      .then((list) => {
        if (!cancelled) {
          setReddit(list);
          setRedditLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setReddit([]);
          setRedditLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug, catalogHit]);

  // Review dialog state
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [myReview, setMyReview] = useState<StrainReview | null>(null);

  useEffect(() => {
    if (!db || !user || status !== "ready" || !profile) return;
    const reviewId = `${user.uid}_${slug}`;
    const reviewRef = doc(db, "strainReviews", reviewId);
    const unsub: Unsubscribe = onSnapshot(reviewRef, (snap) => {
      if (snap.exists()) {
        setMyReview({ id: snap.id, ...snap.data() } as StrainReview);
      } else {
        setMyReview(null);
      }
    });
    return unsub;
  }, [user, slug, status, profile]);

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

  // Used for the description loading state: when the profile is loaded
  // but the AI-tailored fetch is in flight (auth'd user, no static
  // description), show the dedicated loading card instead of the
  // generic "Researching this strain…" placeholder.
  const { isLoading: tailoredLoading } = useTailoredDescription(profile);

  // Always show the strain name right away — derive it from the slug
  // while the profile is still hydrating so the header never blanks.
  // Names are normalised to title case so AI-researched and lowercase
  // catalog entries render the same way as curated ones, matching iOS.
  const displayName = useMemo(
    () => toTitleCase(strainDisplayName(profile, slug)),
    [profile, slug],
  );

  // Sections that still need the live lookup before they have content.
  // Mirrors iOS `StrainProfile.pendingHydrationSections` so both surfaces
  // hydrate in the same order and the user always sees the full layout
  // with the right placeholder message.
  //
  // Once the profile is `ready`, sections whose data is missing are no
  // longer "pending" — they render nothing instead of a stuck spinner.
  // (The Cloud Function returns the full profile in one shot, so there's
  // no separate fetch for terpenes or side effects to wait for.)
  const pending: Set<StrainHydrationSection> = useMemo(() => {
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
    // Cold profile (still hydrating) shows every section as pending so
    // the user sees the full layout with placeholders.
    if (status !== "ready") {
      return new Set<StrainHydrationSection>([
        "description",
        "lineage",
        "uses",
        "effects",
        "dayNight",
        "terpenes",
        "sideEffects",
        "community",
      ]);
    }
    // Profile is ready. Only flag a section as pending if its data is
    // expected to arrive separately (e.g. tailored description while the
    // AI call is still in flight). For terpenes / side effects, the
    // Cloud Function returns them in the same payload as the rest of
    // the profile, so a missing value means "we don't have it" — drop
    // the section from pending so the page doesn't sit on a spinner.
    const p = new Set<StrainHydrationSection>();
    if (tailoredLoading && isAuthenticated) {
      // TailoredDescription is fetched by useTailoredDescription on its
      // own schedule; keep the description slot pending while that's
      // still in flight.
      p.add("description");
    }
    if (
      (!profile.communityNotes || profile.communityNotes.length === 0) &&
      !profile.leaflyRating
    ) {
      // Community has its own Firestore subscription; mark it pending
      // only until the listener delivers the first snapshot.
      p.add("community");
    }
    return p;
  }, [profile, status, tailoredLoading, isAuthenticated]);

  return (
    <main className="relative isolate min-h-[100dvh] bg-background pb-24 text-foreground sm:pb-0">
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
      <MeshBackground />
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
            <button
              type="button"
              onClick={() => setPhotoZoomOpen(true)}
              className="group relative h-72 w-full cursor-zoom-in overflow-hidden rounded-2xl border border-border/70 bg-white sm:h-80"
              aria-label="View full-size photo"
            >
              <StrainImage
                src={profile?.imageUrl}
                alt={`${displayName} flower`}
                type={profile?.type}
                className="h-full w-full"
              />
              <span
                aria-hidden
                className="absolute bottom-2 right-2 flex size-8 items-center justify-center rounded-full bg-black/50 text-white opacity-70 transition-opacity group-hover:opacity-100"
              >
                <ZoomIn className="size-4" />
              </span>
            </button>
            <PhotoZoomDialog
              src={profile?.imageUrl}
              alt={`${displayName} flower`}
              type={profile?.type}
              open={photoZoomOpen}
              onOpenChange={setPhotoZoomOpen}
            />
            <div className="flex flex-wrap items-center gap-2">
              {profile?.type ? (
                <Badge className={cn(typeBadgeClass(profile.type), "capitalize")}>
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
            <h1 className="font-serif text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
              {displayName}
              {profile ? (
                <StrainNoteIndicator strainName={profile.name} />
              ) : null}
            </h1>
            {profile ? (
              <p className="text-sm font-medium text-muted-foreground sm:text-base">
                {[
                  profile.type ? TYPE_LABEL[profile.type] ?? profile.type : null,
                  profile.thcRange ? `THC ${profile.thcRange}` : null,
                  profile.thcRange && profile.cbdRange && profile.cbdRange !== "<1%"
                    ? `CBD ${profile.cbdRange}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : null}
            {pending.has("lineage") ? (
              <HydratingLine section="lineage" />
            ) : profile?.lineage ? (
              <p className="text-sm text-muted-foreground">{profile.lineage}</p>
            ) : null}
          </header>

          {/* Description — generic placeholder while the profile is still
              hydrating, dedicated tailored-loading card for signed-in users
              waiting on the AI rewrite, then the real cards once content
              lands. */}
          {pending.has("description") ? (
            tailoredLoading && isAuthenticated ? (
              <TailoredDescriptionLoading />
            ) : (
              <HydratingSection section="description" />
            )
          ) : profile ? (
            <DescriptionCards profile={profile} />
          ) : null}

          {/* Day to night */}
          {pending.has("dayNight") ? (
            <HydratingSection section="dayNight" />
          ) : profile ? (
            <DayNightCard score={score} />
          ) : null}

          {/* Reported uses */}
          {pending.has("uses") ? (
            <HydratingSection section="uses" />
          ) : profile?.medicalUses && profile.medicalUses.length > 0 ? (
            <CommonlyUsedForSection items={profile.medicalUses} />
          ) : null}

          {/* Effects */}
          {pending.has("effects") ? (
            <HydratingSection section="effects" />
          ) : profile?.effects && profile.effects.length > 0 ? (
            <EffectsSection effects={profile.effects} />
          ) : null}

          {/* Terpenes */}
          {pending.has("terpenes") ? (
            <HydratingSection section="terpenes" />
          ) : profile?.terpenes && profile.terpenes.length > 0 ? (
            <TerpenesSection terpenes={profile.terpenes} />
          ) : null}

          {/* Watch for */}
          {pending.has("sideEffects") ? (
            <HydratingSection section="sideEffects" />
          ) : profile?.sideEffects && profile.sideEffects.length > 0 ? (
            <WatchForSection items={profile.sideEffects} />
          ) : null}

          {/* Shop links — only meaningful once we have a real profile. */}
          {profile ? <ShopLinks strain={profile} /> : null}

          {/* Community voices */}
          {pending.has("community") ? (
            <HydratingSection section="community" />
          ) : profile &&
            (profile.communityNotes?.length ||
              profile.leaflyRating ||
              profile.weedmapsRating ||
              profile.allbudRating ||
              patientNotes.length > 0) ? (
            <CommunityVoices
              notes={profile.communityNotes}
              strainName={profile.name}
              leaflyRating={profile.leaflyRating}
              leaflyReviewCount={profile.leaflyReviewCount}
              weedmapsRating={profile.weedmapsRating}
              weedmapsReviewCount={profile.weedmapsReviewCount}
              allbudRating={profile.allbudRating}
              allbudReviewCount={profile.allbudReviewCount}
              appReviews={patientNotes}
            />
          ) : null}

          {/* Reddit threads for this strain — curated list, no live scrape. */}
          <RedditThreads
            sources={reddit}
            loading={redditLoading}
            title="Reddit threads for this strain"
            description="Public threads mentioning this strain — pulled from a curated list, not live-scraped."
          />

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

          {/* Auth-gated compare suggestions + log + notes. */}
          {isAuthenticated && others.length > 0 && profile ? (
            <CompareSuggestions
              profileName={profile.name}
              others={others}
            />
          ) : null}

          {isAuthenticated && profile ? (
            <ReliefLogCard
              strainName={profile.name}
              logs={logs.filter(
                (log) =>
                  log.strainName.trim().toLowerCase() ===
                  profile.name.trim().toLowerCase(),
              )}
            />
          ) : null}

            {isAuthenticated && profile && (
              <>
                <SavedStrainNotes
                  slug={slugify(profile.name)}
                  strainName={profile.name}
                  isSaved={isSaved}
                />

                {/* Community reviews */}
                <SWCard innerClassName="p-6">
                  <ReviewSection
                    strainSlug={slug}
                    strainName={profile.name}
                    currentUid={user?.uid}
                  />
                  <div className="mt-4">
                    <Button
                      variant={myReview ? "outline" : "default"}
                      size="sm"
                      onClick={() => setReviewDialogOpen(true)}
                      className="gap-1.5"
                    >
                      {myReview ? (
                        <>
                          <Pencil className="size-3.5" />
                          Edit your review
                        </>
                      ) : (
                        <>
                          <MessageCircle className="size-3.5" />
                          Write a review
                        </>
                      )}
                    </Button>
                  </div>
                </SWCard>

                <WriteReviewDialog
                  open={reviewDialogOpen}
                  onOpenChange={setReviewDialogOpen}
                  strainSlug={slug}
                  strainName={profile.name}
                  existingReview={myReview}
                />
              </>
            )}
          </motion.div>
      </div>
      <AppTabBar active="home" />
    </main>
  );
}

function DescriptionCards({ profile }: { profile: StrainProfile }) {
  const { isAuthenticated } = useAuth();
  const ailments = useSavedAilments();
  const { names: medications } = useMedications();
  const { summary: reliefHistory } = useReliefSummary();
  const { description: tailored } = useTailoredDescription(profile);

  if (tailored) {
    return (
      <StrainDescriptionView
        description={tailored}
        strain={profile}
        ailments={ailments}
        medications={medications}
        reliefHistory={reliefHistory}
        isAuthenticated={isAuthenticated}
      />
    );
  }
  if (profile.description && profile.description.trim().length > 0) {
    return (
      <SWCard innerClassName="p-5">
        <p className="text-sm leading-6 text-foreground/85">
          {profile.description}
        </p>
      </SWCard>
    );
  }
  return null;
}

function DayNightCard({ score }: { score: number }) {
  return (
    <SWCard innerClassName="p-6">
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
      {/* 5-stop oklch gradient (sky -> primary green -> deep indigo)
       * matches the iOS day/night meter exactly. The original Tailwind
       * `via-sky-500` produced a hard middle band on 8-bit displays
       * because there was no smooth transition between the sky half and
       * the indigo half. Interpolating through the primary green at
       * 50% with intermediate stops at 22% and 78% keeps the slider
       * reading as one continuous color ramp. */}
      <div
        className="relative h-2 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)] [background:linear-gradient(90deg,oklch(0.78_0.08_230)_0%,oklch(0.7_0.1_220)_22%,oklch(0.43_0.1_158)_50%,oklch(0.4_0.12_240)_78%,oklch(0.32_0.13_280)_100%)]"
        role="meter"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Day-to-night rating"
      >
        <span
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow ring-1 ring-black/10 [background:oklch(0.32_0.13_280)]"
          style={{ left: `${100 - score}%` }}
        />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {dayNightLabel(score)}
      </p>
    </SWCard>
  );
}

function SectionEyebrow({
  icon: Icon,
  label,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      <Icon className="size-3.5 text-primary" />
      {label}
    </div>
  );
}

/** iOS-style chip row: section label + pills, no outer card wrapper. */
function ChipSection({
  icon,
  label,
  items,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  items: string[];
}) {
  return (
    <section>
      <SectionEyebrow icon={icon} label={label} />
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground"
          >
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}

function CommonlyUsedForSection({ items }: { items: string[] }) {
  return (
    <ChipSection icon={HeartPulse} label="Commonly used for" items={items} />
  );
}

function EffectsSection({
  effects,
}: {
  effects: NonNullable<StrainProfile["effects"]>;
}) {
  return (
    <SWCard innerClassName="p-5">
      <SectionEyebrow icon={Activity} label="Effects" />
      <div className="space-y-2">
        {effects.map((effect) => (
          <div
            key={effect.name}
            className="flex items-center justify-between gap-3"
          >
            <span className="text-sm capitalize">{effect.name}</span>
            <IntensityBar value={effect.intensity} />
          </div>
        ))}
      </div>
    </SWCard>
  );
}

function IntensityBar({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-[3px]" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 w-2.5 rounded-full",
            i < value ? "bg-primary/80" : "bg-border",
          )}
        />
      ))}
    </span>
  );
}

function TerpenesSection({
  terpenes,
}: {
  terpenes: NonNullable<StrainProfile["terpenes"]>;
}) {
  return (
    <SWCard innerClassName="p-5">
      <SectionEyebrow icon={Droplets} label="Terpenes" />
      <ul className="mt-3 space-y-3">
        {terpenes.map((t) => {
          const curated = terpeneProfile(t.name);
          return (
            <li key={t.name}>
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
              <p className="text-sm leading-6 text-muted-foreground">
                {terpeneMeaning(t.name) ??
                  (t.profile
                    ? t.profile
                    : "Commonly listed on this strain; meaning varies by patient.")}
              </p>
            </li>
          );
        })}
      </ul>
    </SWCard>
  );
}

function WatchForSection({ items }: { items: string[] }) {
  return <ChipSection icon={Sparkles} label="Watch for" items={items} />;
}

function ReliefLogCard({
  strainName,
  logs,
}: {
  strainName: string;
  logs: ReliefLog[];
}) {
  return (
    <SWCard innerClassName="p-5">
      <SectionEyebrow icon={NotebookPen} label="Relief log" />
      <ReliefLogButton strainName={strainName} variant="button" />
      {logs.length > 0 && (
        <ul className="mt-4 space-y-2">
          {logs.slice(0, 6).map((log) => (
            <li key={log.id}>
              <SWCard innerClassName="px-4 py-3">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium capitalize">
                    {log.fit.replace("-", " ")}
                  </span>
                  <span className="text-muted-foreground">
                    {log.relief}/5 relief
                  </span>
                </div>
                {log.note ? (
                  <p className="mt-1.5 text-sm leading-6">{log.note}</p>
                ) : null}
              </SWCard>
            </li>
          ))}
        </ul>
      )}
    </SWCard>
  );
}

function CompareSuggestions({
  profileName,
  others,
}: {
  profileName: string;
  others: string[];
}) {
  return (
    <SWCard innerClassName="p-5">
      <SectionEyebrow icon={GitCompareArrows} label="Compare with what you saved" />
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <span
          className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border/70 bg-background px-3 text-xs font-semibold text-foreground"
          aria-label={`Currently viewing ${profileName}`}
        >
          {profileName}
        </span>
        {others.slice(0, 4).map((name) => (
          <Button
            key={name}
            asChild
            size="sm"
            variant="outline"
            className="h-7 cursor-pointer rounded-full px-3 text-xs"
          >
            <Link
              to={`/dashboard?mode=compare&strains=${encodeURIComponent(`${profileName},${name}`)}`}
            >
              vs {name}
              <StrainNoteIndicator strainName={name} />
            </Link>
          </Button>
        ))}
      </div>
    </SWCard>
  );
}

function PhotoZoomDialog({
  src,
  alt,
  type,
  open,
  onOpenChange,
}: {
  src?: string;
  alt: string;
  type?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { url } = useStrainImage(src);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl border-none bg-transparent p-0 shadow-none"
        showCloseButton
      >
        {url ? (
          <img
            src={url}
            alt={alt}
            className="max-h-[85vh] w-full rounded-2xl object-contain"
          />
        ) : (
          <div className="flex h-72 w-full items-center justify-center rounded-2xl bg-muted">
            <span className="text-sm text-muted-foreground">No photo available</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
