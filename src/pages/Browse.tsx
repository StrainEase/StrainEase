import { AppHeader, AppTabBar } from "@/components/home/AppHeader";
import { Seo } from "@/components/Seo";
import { StrainGrid } from "@/components/home/StrainGrid";
import { Button } from "@/components/ui/button";
import { usePopularStrains } from "@/hooks/use-popular-strains";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { parseBrowseParams, sectionTitle, strainsFor } from "@/lib/home-sections";
import { documentTitle } from "@/lib/site";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link, Navigate, useParams } from "react-router";

export default function Browse() {
  const { section, ailment } = useParams();
  const parsed = parseBrowseParams(section, ailment);
  const { popular, isLoading } = usePopularStrains();
  const recents = useRecentlyViewed();

  if (!parsed) return <Navigate to="/" replace />;

  const strains = strainsFor(parsed, popular, recents);
  const title = sectionTitle(parsed);

  return (
    <main className="min-h-[100dvh] bg-background pb-24 text-foreground sm:pb-10">
      <Seo
        title={documentTitle(title)}
        description={`Browse ${title.toLowerCase()} on StrainEase — strains patients commonly report for medical relief.`}
        path={`/browse/${section}${ailment ? `/${ailment}` : ""}`}
        noindex
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(55%_40%_at_80%_0%,oklch(0.86_0.07_158/0.38),transparent_62%),radial-gradient(40%_32%_at_8%_18%,oklch(0.9_0.04_140/0.28),transparent_70%)]"
      />
      <AppHeader active="home" />
      <div className="mx-auto w-full max-w-6xl px-6 py-8 sm:py-10">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 mb-5 cursor-pointer rounded-full text-muted-foreground"
        >
          <Link to="/">
            <ArrowLeft className="size-4" />
            Home
          </Link>
        </Button>
        <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
          {sectionTitle(parsed)}
        </h1>
        {isLoading && strains.length === 0 ? (
          <div className="flex justify-center py-24">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
            className="mt-8"
          >
            <StrainGrid strains={strains} />
          </motion.div>
        )}
      </div>
      <AppTabBar active="home" />
    </main>
  );
}
