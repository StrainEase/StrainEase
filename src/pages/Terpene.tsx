import { AppHeader, AppTabBar } from "@/components/home/AppHeader";
import { Seo } from "@/components/Seo";
import { Badge } from "@/components/ui/badge";
import { SkeletonLines } from "@/components/ui/skeleton-lines";
import { usePopularStrains } from "@/hooks/use-popular-strains";
import { applyCatalogPhotos } from "@/lib/strain-catalog";
import { terpeneDescription, terpeneJsonLd } from "@/lib/seo";
import { documentTitle } from "@/lib/site";
import {
  TERPENE_PROFILES,
  terpeneFromSlug,
  terpeneProfile,
  strainsWithTerpene,
} from "@/lib/terpenes";
import { slugify } from "@/lib/saved-strains";
import type { StrainProfile } from "@/lib/strain-profile";
import { ArrowLeft, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";

export default function Terpene() {
  const { slug = "" } = useParams();
  const { popular, isLoading } = usePopularStrains();
  const [photoApplied, setPhotoApplied] = useState(false);

  const name = terpeneFromSlug(slug);
  const profile = name ? terpeneProfile(name) : undefined;

  useEffect(() => {
    if (!popular || photoApplied) return;
    setPhotoApplied(true);
  }, [popular, photoApplied]);

  const matches = useMemo(() => {
    if (!popular || !name) return [];
    return applyCatalogPhotos(strainsWithTerpene(name, popular).withProfile);
  }, [popular, name]);

  if (!name || !profile) {
    return (
      <main className="min-h-[100dvh] bg-background pb-24 text-foreground sm:pb-10">
        <Seo
          title={documentTitle("Terpene not found")}
          description="That terpene is not in the StrainEase guide yet. Browse myrcene, limonene, or linalool instead."
          path={`/terpene/${slug}`}
          noindex
        />
        <AppHeader active="home" />
        <div className="mx-auto w-full max-w-3xl px-6 py-10">
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Home
          </Link>
          <p className="rounded-2xl border border-border/70 bg-card p-6 text-sm text-muted-foreground">
            We don't have a profile for that terpene yet. Try one of the
            curated ones like{" "}
            <Link to="/terpene/myrcene" className="text-primary hover:underline">
              myrcene
            </Link>
            ,{" "}
            <Link to="/terpene/limonene" className="text-primary hover:underline">
              limonene
            </Link>
            , or{" "}
            <Link to="/terpene/linalool" className="text-primary hover:underline">
              linalool
            </Link>
            .
          </p>
        </div>
        <AppTabBar active="home" />
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-background pb-24 text-foreground sm:pb-10">
      <Seo
        title={documentTitle(name.charAt(0).toUpperCase() + name.slice(1))}
        description={terpeneDescription(name, profile)}
        path={`/terpene/${slug}`}
        type="article"
        jsonLd={terpeneJsonLd(name, profile, slug)}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(55%_40%_at_80%_0%,oklch(0.86_0.07_158/0.32),transparent_62%),radial-gradient(40%_32%_at_8%_18%,oklch(0.9_0.04_140/0.22),transparent_70%)]"
      />
      <AppHeader active="home" />
      <div className="mx-auto w-full max-w-3xl px-6 py-8 sm:py-10">
        <Link
          to="/"
          className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Home
        </Link>
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            Terpene
          </p>
          <h1 className="font-display text-3xl tracking-tight capitalize sm:text-4xl">
            {name}
          </h1>
          <p className="max-w-xl text-[15px] leading-6 text-muted-foreground">
            {profile.summary}
          </p>
        </div>

        <section className="mt-6 rounded-2xl border border-border/70 bg-card p-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            About this terpene
          </p>
          <p className="mt-3 text-[15px] leading-7 text-foreground">
            {profile.description}
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Characteristics
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {profile.characteristics.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="rounded-full border-border/70 text-foreground"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Patients often pair it with
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {profile.benefits.map((tag) => (
                  <Badge
                    key={tag}
                    className="rounded-full bg-primary/10 text-primary"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">
              Strains in this family
            </h2>
            {!isLoading && (
              <span className="text-xs text-muted-foreground">
                {matches.length} match{matches.length === 1 ? "" : "es"}
              </span>
            )}
          </div>
          {isLoading && matches.length === 0 ? (
            <div className="mt-4">
              <SkeletonLines variant="strain-card" />
            </div>
          ) : matches.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-border/70 bg-card p-6 text-sm text-muted-foreground">
              No popular strains on Leafly currently list {name}. Try opening a
              strain and checking its profile — the full terpene breakdown is
              inside.
            </p>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {matches.map((strain, index) => (
                <motion.li
                  key={strain.name}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.04, 0.4) }}
                >
                  <TerpeneStrainRow strain={strain} />
                </motion.li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <AppTabBar active="home" />
    </main>
  );
}

function TerpeneStrainRow({ strain }: { strain: StrainProfile }) {
  return (
    <Link
      to={`/strain/${slugify(strain.name)}`}
      className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card p-4 transition-colors hover:border-primary/40"
    >
      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Sparkles className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold tracking-tight">
          {strain.name}
        </p>
        {strain.thcRange && (
          <p className="font-mono text-[11px] tracking-wide text-muted-foreground">
            THC {strain.thcRange}
          </p>
        )}
        {strain.effects && strain.effects.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {strain.effects.slice(0, 3).map((effect) => (
              <span
                key={effect.name}
                className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground"
              >
                {effect.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

/** Exposed so other pages can list all curated terpenes. */
export function curatedTerpeneNames(): string[] {
  return Object.keys(TERPENE_PROFILES);
}
