import { AilmentCarousel } from "@/components/home/AilmentCarousel";
import { StrainRail } from "@/components/home/StrainRail";
import { StrainSectionHeader } from "@/components/home/StrainSectionHeader";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { popularStrains } from "@/lib/strain-api";
import { applyCatalogPhotos, CATALOG } from "@/lib/strain-catalog";
import type { StrainProfile } from "@/lib/strain-profile";
import { FIND_HREF, DIRECTORY_HREF } from "@/lib/app-nav";
import { ArrowRight, Sparkles } from "lucide-react";

export function HomeScreen() {
  const { user } = useAuth();
  const [popular, setPopular] = useState<StrainProfile[]>(() =>
    applyCatalogPhotos(CATALOG.slice(0, 12)),
  );

  useEffect(() => {
    let cancelled = false;
    void popularStrains()
      .then((list) => {
        if (cancelled || list.length === 0) return;
        setPopular(applyCatalogPhotos(list));
      })
      .catch(() => {
        // Keep catalog fallback.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const firstName = user?.name?.split(/\s+/)[0];

  return (
    <div className="space-y-10">
      <header className="max-w-2xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
          {firstName ? `Welcome back, ${firstName}` : "StrainEase"}
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-5xl">
          Research strains that fit how you feel
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
          Patient-reported effects, terpenes, and community notes — not a
          dispensary menu. Start from a symptom or browse the directory.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            to={FIND_HREF}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Sparkles className="size-4" />
            Find for ailments
          </Link>
          <Link
            to={DIRECTORY_HREF}
            className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-4 py-2 text-sm font-semibold text-foreground"
          >
            Browse directory
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </header>

      <section className="space-y-3">
        <StrainSectionHeader title="Common starting points" />
        <AilmentCarousel />
      </section>

      <section className="space-y-3">
        <StrainSectionHeader
          title="Popular right now"
          seeMoreHref={DIRECTORY_HREF}
        />
        <StrainRail strains={popular} />
      </section>
    </div>
  );
}
