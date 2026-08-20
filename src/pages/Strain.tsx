import { AppHeader, AppTabBar } from "@/components/home/AppHeader";
import { StrainDetailCard } from "@/components/compare/StrainDetailCard";
import { CompareToggleButton } from "@/components/compare/CompareToggleButton";
import { ReliefLogButton } from "@/components/saved/ReliefLogButton";
import { SavedStrainNotes } from "@/components/saved/SavedStrainNotes";
import { StrainNoteIndicator } from "@/components/saved/StrainNoteIndicator";
import { Seo } from "@/components/Seo";
import { ShopLinks } from "@/components/strain/ShopLinks";
import { StrainSectionHydrating } from "@/components/strain/StrainSectionHydrating";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useCompareSelection } from "@/hooks/use-compare-selection";
import { useReliefSummary } from "@/hooks/use-relief-summary";
import { listenToSavedStrains, slugify } from "@/lib/saved-strains";
import { recordRecentlyViewed } from "@/lib/recently-viewed";
import { strainDescription, strainDisplayName, strainJsonLd } from "@/lib/seo";
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
import { ArrowLeft, GitCompareArrows, Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";

export default function Strain() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const compare = useCompareSelection();
  const { logs } = useReliefSummary();

  const catalogHit = CATALOG.find((item) => slugify(item.name) === slug);
  const featuredProfile = getFeaturedStrainProfile(slug);

  // Seed the profile from the catalog so the page can render its header
  // (image, name, type, thc range) right away instead of waiting for the
  // network call. iOS does the same thing in `StrainDetailView` — it
  // renders the catalog stub and then "hydrates" the missing sections
  // one by one. Without a stub the patient would stare at a blank
  // card until the searchStrain call returns. Featured strains ship
  // a full preloaded profile so we use it verbatim and skip the
  // network call entirely.
  const stubName = catalogHit?.name ?? slug.replace(/-/g, " ");
  const stubProfile = (() => {
    if (featuredProfile) return featuredProfile;
    const stubSource =
      catalogHit ??
      ({
        name: stubName,
        inKnowledgeBase: false,
      } satisfies StrainProfile);
    const [stub] = applyCatalogPhotos([stubSource]);
    return (
      stub ??
      ({ name: stubName, inKnowledgeBase: false } satisfies StrainProfile)
    );
  })();

  const [profile, setProfile] = useState<StrainProfile | null>(stubProfile);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">(
    featuredProfile ? "ready" : "loading",
  );
  const [savedNames, setSavedNames] = useState<string[]>([]);

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
    void searchStrain(stubName)
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
          setProfile({ name: stubName, inKnowledgeBase: false });
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
        setProfile({ name: stubName, inKnowledgeBase: false });
        setStatus("missing");
      });
    return () => {
      cancelled = true;
    };
  }, [slug, catalogHit, featuredProfile, stubName]);

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

  const isInCompareSelection = profile ? compare.isIn(profile.name) : false;
  const compareAtCap = compare.atCap;

  // True while the live profile is still being fetched but the catalog
  // stub is already on screen. The detail card treats empty fields as
  // "pending" in this state, so the patient sees the iOS-style
  // "analyzing your data" cards for every section that hasn't
  // arrived yet.
  const isHydrating = status === "loading" && profile !== null;
  // True when the search has finished and we have nothing to show —
  // either the strain isn't in the knowledge base or the network
  // call failed and we don't even have a catalog stub. The detail
  // card in this case renders the header (name + image) but skips
  // every section-level loading card so it doesn't flash fake
  // "analyzing" placeholders that will never resolve.
  const isMissing = status === "missing";

  const displayName = strainDisplayName(
    status === "loading" ? null : profile,
    slug,
  );

  return (
    <main className="min-h-[100dvh] bg-background pb-24 text-foreground sm:pb-0">
      {/* Soft two-orb mesh — mirrors the iOS StrainDetailView
       * MeshBackground. Two simple radial gradients (mint top-right,
       * deep teal bottom-left) that fade to transparent. The iOS app
       * uses the same two-stop [color, .clear] shape and reads as a
       * smooth glow there; we keep the same shape so the web matches
       * the iOS visual without introducing extra stops that show as
       * banding on 8-bit displays. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(55%_42%_at_82%_-4%,oklch(0.84_0.1_158/0.42),transparent),radial-gradient(46%_36%_at_6%_22%,oklch(0.42_0.07_158/0.14),transparent)]"
      />
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
          {profile && (
            <CompareToggleButton
              isInSelection={isInCompareSelection}
              isFull={compareAtCap}
              onToggle={() => compare.toggle(profile.name)}
            />
          )}
        </div>

        {status === "loading" && !profile && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
            className="flex items-center justify-center py-16 text-sm text-muted-foreground"
          >
            Looking up this strain…
          </motion.div>
        )}

        {profile && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
            className="space-y-8"
          >
            <StrainDetailCard
              strain={profile}
              headingLevel="h1"
              isHydrating={isHydrating && !isMissing}
            />

            {/* Day-to-night card. iOS keeps this in a dedicated card
             * because it uses the score to pick an "evening strain"
             * blurb; on web the same logic drives the slider position
             * and the caption below it. We render a hydrating card
             * while the effects data is still on the wire. */}
            {profile.effects && profile.effects.length > 0 ? (
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
              </div>
            ) : isHydrating && !isMissing ? (
              <StrainSectionHydrating section="dayNight" />
            ) : null}

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
                        <StrainNoteIndicator strainName={name} />
                      </Link>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {isAuthenticated && profile && (
              <>
                <div className="rounded-2xl border border-border/70 bg-card p-6">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Relief log
                  </p>
                  <ReliefLogButton strainName={profile.name} variant="button" />
                  {logs.filter(
                    (log) =>
                      log.strainName.trim().toLowerCase() ===
                      profile.name.trim().toLowerCase(),
                  ).length > 0 && (
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
                  )}
                </div>
                <SavedStrainNotes
                  slug={slugify(profile.name)}
                  strainName={profile.name}
                  isSaved={isSaved}
                />
              </>
            )}
          </motion.div>
        )}
      </div>
      <AppTabBar active="home" />
    </main>
  );
}
