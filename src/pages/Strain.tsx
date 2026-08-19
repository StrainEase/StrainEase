import { AppHeader, AppTabBar } from "@/components/home/AppHeader";
import { CompareToggleButton } from "@/components/compare/CompareToggleButton";
import { CommunityVoices } from "@/components/compare/CommunityVoices";
import { StrainImage } from "@/components/strain/StrainImage";
import { StrainDescriptionView } from "@/components/strain/StrainDescription";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useCompare } from "@/hooks/use-compare";
import {
  applyCatalogPhotos,
  getFeaturedStrainDetail,
  type FeaturedStrainDetail,
} from "@/lib/featured-strain-details";
import { getStrainById, type StrainProfile } from "@/lib/strain-api";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronRight,
  Leaf,
  Sparkles,
  Star,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";

function StrainHeader({
  profile,
}: {
  profile: FeaturedStrainDetail | StrainProfile;
}) {
  const name = profile.name;
  const type =
    "type" in profile
      ? profile.type
      : "category" in profile
        ? (profile as { category?: string }).category
        : undefined;
  const thc =
    "thc" in profile
      ? profile.thc
      : "thcPercent" in profile
        ? (profile as { thcPercent?: number }).thcPercent
        : undefined;
  const cbd =
    "cbd" in profile
      ? profile.cbd
      : "cbdPercent" in profile
        ? (profile as { cbdPercent?: number }).cbdPercent
        : undefined;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {name}
          </h1>
          {type ? (
            <p className="text-sm capitalize text-muted-foreground">{type}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {typeof thc === "number" ? (
            <Badge variant="secondary" className="tabular-nums">
              THC {thc}%
            </Badge>
          ) : null}
          {typeof cbd === "number" && cbd > 0 ? (
            <Badge variant="outline" className="tabular-nums">
              CBD {cbd}%
            </Badge>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function StrainPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isComparing, toggleCompare } = useCompare();
  const [profile, setProfile] = useState<
    FeaturedStrainDetail | StrainProfile | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) {
        setError("Missing strain id");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // Prefer featured mock details (richer notes / reddit) when available.
        const featured = getFeaturedStrainDetail(id);
        if (featured) {
          if (!cancelled) {
            setProfile(applyCatalogPhotos(featured));
            setLoading(false);
          }
          return;
        }
        const remote = await getStrainById(id);
        if (!cancelled) {
          setProfile(remote ? applyCatalogPhotos(remote) : null);
          if (!remote) setError("Strain not found");
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load strain");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const comparing = profile ? isComparing(profile.id ?? profile.name) : false;

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6 px-6 py-10">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mx-auto flex min-h-[50vh] w-full max-w-3xl flex-col items-center justify-center gap-4 px-6 py-10 text-center">
        <p className="text-sm text-muted-foreground">{error ?? "Strain not found"}</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4" />
          Go back
        </Button>
      </div>
    );
  }

  return (
    <section className="pb-24">
      <AppHeader />
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
          className="space-y-6"
        >
          {/* Hero image — always mount so missing URLs still show the gradient fallback */}
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted/30">
            <StrainImage
              imageUrl={
                "imageUrl" in profile
                  ? profile.imageUrl
                  : "photoUrl" in profile
                    ? (profile as { photoUrl?: string }).photoUrl
                    : undefined
              }
              alt={profile.name}
              className="aspect-[4/3] w-full object-cover"
            />
          </div>

          <StrainHeader profile={profile} />

          <div className="flex flex-wrap items-center gap-2">
            <CompareToggleButton
              active={comparing}
              onToggle={() =>
                toggleCompare({
                  id: String(profile.id ?? profile.name),
                  name: profile.name,
                })
              }
            />
            {isAuthenticated ? (
              <Button variant="secondary" size="sm" asChild>
                <Link to="/ai">
                  <Sparkles className="size-4" />
                  Ask AI about this strain
                  <ChevronRight className="size-3.5 opacity-60" />
                </Link>
              </Button>
            ) : null}
          </div>

          {"description" in profile && profile.description ? (
            <StrainDescriptionView description={profile.description} />
          ) : null}

          {"effects" in profile && Array.isArray(profile.effects) && profile.effects.length > 0 ? (
            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Effects
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {profile.effects.map((e) => (
                  <Badge key={e} variant="outline" className="font-normal">
                    {e}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          {"flavors" in profile && Array.isArray(profile.flavors) && profile.flavors.length > 0 ? (
            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Flavors
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {profile.flavors.map((f) => (
                  <Badge key={f} variant="secondary" className="font-normal">
                    {f}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          {"communityNotes" in profile || "redditSources" in profile ? (
            <CommunityVoices
              notes={profile.communityNotes}
              strainName={profile.name}
              redditSources={profile.redditSources}
            />
          ) : null}
        </motion.div>
      </div>
      <AppTabBar />
    </section>
  );
}
