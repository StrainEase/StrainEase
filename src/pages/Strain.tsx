import { AppHeader, AppTabBar } from "@/components/home/AppHeader";
import { CompareToggleButton } from "@/components/compare/CompareToggleButton";
import { CommunityVoices } from "@/components/compare/CommunityVoices";
import { ReliefLogButton } from "@/components/saved/ReliefLogButton";
import { SavedStrainNotes } from "@/components/saved/SavedStrainNotes";
import { StrainNoteIndicator } from "@/components/saved/StrainNoteIndicator";
import { Seo } from "@/components/Seo";
import { ShopLinks } from "@/components/strain/ShopLinks";
import { StrainImage } from "@/components/strain/StrainImage";
import { StrainDescriptionView } from "@/components/strain/StrainDescription";
import { MeshBackground } from "@/components/theme/MeshBackground";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SkeletonLines } from "@/components/ui/skeleton-lines";
import { SWCard } from "@/components/ui/sw-card";
import { useAuth } from "@/hooks/use-auth";
import { useCompareSelection } from "@/hooks/use-compare-selection";
import { useReliefSummary } from "@/hooks/use-relief-summary";
import { useSavedAilments } from "@/hooks/use-saved-ailments";
import { useMedications } from "@/hooks/use-medications";
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
import { terpeneProfile, terpeneSlug } from "@/lib/terpenes";
import type { StrainProfile } from "@/lib/strain-profile";
import { TYPE_LABEL, typeBadgeClass } from "@/lib/strain-ui";
import { useTailoredDescription } from "@/hooks/use-tailored-description";
import type { ReliefLog } from "@/lib/relief-log";
import {
  Activity,
  ArrowLeft,
  Droplets,
  GitCompareArrows,
  HeartPulse,
  Moon,
  NotebookPen,
  Sparkles,
  Sun,
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Link, useNavigate, useParams } from "react-router";
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

  const displayName = strainDisplayName(
    status === "loading" ? null : profile,
    slug,
  );

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
          {profile && (
            <CompareToggleButton
              isInSelection={isInCompareSelection}
              isFull={compareAtCap}
              onToggle={() => compare.toggle(profile.name)}
            />
          )}
        </div>

        {status === "loading" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
          >
            <SkeletonLines variant="strain-page" />
          </motion.div>
        )}

        {status !== "loading" && profile && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
            className="space-y-8"
          >
            <StrainHeader strain={profile} />

            <DescriptionCards profile={profile} />

            <DayNightCard score={score} />

            {profile.medicalUses && profile.medicalUses.length > 0 && (
              <CommonlyUsedForSection items={profile.medicalUses} />
            )}

            {profile.effects && profile.effects.length > 0 && (
              <EffectsSection effects={profile.effects} />
            )}

            {profile.terpenes && profile.terpenes.length > 0 && (
              <TerpenesSection terpenes={profile.terpenes} />
            )}

            <ShopLinks strain={profile} />

            {profile.sideEffects && profile.sideEffects.length > 0 && (
              <WatchForSection items={profile.sideEffects} />
            )}

            {isAuthenticated && (
              <SavedStrainNotes
                slug={slugify(profile.name)}
                strainName={profile.name}
                isSaved={isSaved}
              />
            )}

            {isAuthenticated && profile && (
              <ReliefLogCard
                strainName={profile.name}
                logs={logs.filter(
                  (log) =>
                    log.strainName.trim().toLowerCase() ===
                    profile.name.trim().toLowerCase(),
                )}
              />
            )}

            <CommunityVoices
              notes={profile.communityNotes}
              strainName={profile.name}
              redditSources={profile.redditSources}
            />

            {isAuthenticated && others.length > 0 && (
              <CompareSuggestions
                profileName={profile.name}
                others={others}
              />
            )}
          </motion.div>
        )}
      </div>
      <AppTabBar active="home" />
    </main>
  );
}

function StrainHeader({ strain }: { strain: StrainProfile }) {
  const subtitle = [
    strain.type ? TYPE_LABEL[strain.type] ?? strain.type : null,
    strain.thcRange ? `THC ${strain.thcRange}` : null,
    strain.thcRange && strain.cbdRange && strain.cbdRange !== "<1%"
      ? `CBD ${strain.cbdRange}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <header className="space-y-4">
      <StrainImage
        src={strain.imageUrl}
        alt={`${strain.name} flower`}
        type={strain.type}
        className="h-72 w-full rounded-2xl border border-border/70 bg-white sm:h-80"
      />
      <div className="flex flex-wrap items-center gap-2">
        {strain.type && (
          <Badge className={cn(typeBadgeClass(strain.type), "capitalize")}>
            {TYPE_LABEL[strain.type] ?? strain.type}
          </Badge>
        )}
        {!strain.inKnowledgeBase && (
          <Badge
            variant="outline"
            className="gap-1 border-primary/30 text-primary"
          >
            <Sparkles className="size-3" />
            AI researched
          </Badge>
        )}
      </div>
      <h1 className="font-serif text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
        {strain.name}
      </h1>
      {subtitle && (
        <p className="text-sm font-medium text-muted-foreground sm:text-base">
          {subtitle}
        </p>
      )}
      {strain.lineage && (
        <p className="text-sm text-muted-foreground">{strain.lineage}</p>
      )}
    </header>
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
            <span className="text-sm">{effect.name}</span>
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
    <SWCard emphasized innerClassName="p-5">
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
              to={`/dashboard?mode=compare&strains=${encodeURIComponent(`${profileName},${name}`)}`}
            >
              <GitCompareArrows className="size-3.5" />
              vs {name}
              <StrainNoteIndicator strainName={name} />
            </Link>
          </Button>
        ))}
      </div>
    </SWCard>
  );
}
