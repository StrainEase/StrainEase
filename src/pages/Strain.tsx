import { StrainDetailCard } from "@/components/compare/StrainDetailCard";
import { CompareToggleButton } from "@/components/compare/CompareToggleButton";
import { SavedStrainNotes } from "@/components/saved/SavedStrainNotes";
import { Seo } from "@/components/Seo";
import { ShopLinks } from "@/components/strain/ShopLinks";
import { Button } from "@/components/ui/button";
import { SkeletonLines } from "@/components/ui/skeleton-lines";
import { useAuth } from "@/hooks/use-auth";
import { parseStrains } from "@/hooks/use-compare-selection";
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
import {
  dayNightLabel,
  dayNightScore,
  terpeneMeaning,
} from "@/lib/strain-meaning";
import { terpeneProfile, terpeneSlug } from "@/lib/terpenes";
import type { StrainProfile } from "@/lib/strain-profile";
import logo from "@/assets/logo.svg";
import { ArrowLeft, GitCompareArrows, Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";

export default function Strain() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [searchParams] = useSearchParams();
  const [profile, setProfile] = useState<StrainProfile | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">(
    "loading",
  );
  const [savedNames, setSavedNames] = useState<string[]>([]);

  const catalogHit = CATALOG.find((item) => slugify(item.name) === slug);

  useEffect(() => {
    let cancelled = false;
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
  }, [slug, catalogHit]);

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

  // Reflect an in-flight compare selection that may have been passed
  // into this page via ?strains= (e.g. from a previous Strain click).
  // The Dashboard owns the source of truth; this is just a UI hint so
  // the toggle reads "In compare" while the strain is already queued.
  const compareSelection = useMemo(
    () => parseStrains(searchParams.get("strains")),
    [searchParams],
  );
  const isInCompareSelection = useMemo(() => {
    if (!profile) return false;
    const target = profile.name.toLowerCase();
    return compareSelection.some((n) => n.toLowerCase() === target);
  }, [profile, compareSelection]);
  const compareAtCap = compareSelection.length >= 3;

  const displayName = strainDisplayName(
    status === "loading" ? null : profile,
    slug,
  );

  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
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
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src={logo}
              alt="StrainEase logo"
              width={30}
              height={30}
              className="rounded-lg"
            />
            <span className="text-base font-semibold tracking-tight">
              StrainEase
            </span>
          </Link>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="cursor-pointer rounded-full"
          >
            <Link to={isAuthenticated ? "/dashboard" : "/auth"}>
              {isAuthenticated ? "Dashboard" : "Open the app"}
            </Link>
          </Button>
        </div>
      </header>

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
              onToggle={() =>
                navigate(
                  `/dashboard?strains=${encodeURIComponent(profile.name)}`,
                )
              }
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
            <StrainDetailCard strain={profile} headingLevel="h1" />

            <div className="rounded-2xl border border-border/70 bg-card p-6">
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

            {profile.terpenes && profile.terpenes.length > 0 && (
              <div className="rounded-2xl border border-border/70 bg-card p-6">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  What the terpenes usually mean
                </p>
                <ul className="mt-4 space-y-3">
                  {profile.terpenes.map((t) => {
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
              </div>
            )}

            <ShopLinks strain={profile} />

            {isAuthenticated && others.length > 0 && (
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
                      </Link>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {isAuthenticated && profile && (
              <SavedStrainNotes
                slug={slugify(profile.name)}
                strainName={profile.name}
                isSaved={isSaved}
              />
            )}
          </motion.div>
        )}
      </div>
    </main>
  );
}
