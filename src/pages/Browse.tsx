import { AppHeader, AppTabBar } from "@/components/home/AppHeader";
import { Seo } from "@/components/Seo";
import { StrainGrid } from "@/components/home/StrainGrid";
import { MeshBackground } from "@/components/theme/MeshBackground";
import { Button } from "@/components/ui/button";
import { useAilments } from "@/hooks/use-ailments";
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
  const { names: ailments } = useAilments();

  if (!parsed) return <Navigate to="/" replace />;

  const strains = strainsFor(parsed, popular, recents, ailments);
  const title = sectionTitle(parsed);

  return (
    <main className="relative isolate min-h-[100dvh] bg-background pb-24 text-foreground sm:pb-10">
      <Seo
        title={documentTitle(title)}
        description={`Browse ${title.toLowerCase()} on StrainEase — strains patients commonly report for medical relief.`}
        path={`/browse/${section}${ailment ? `/${ailment}` : ""}`}
        noindex
      />
      <MeshBackground />
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
        {parsed.kind === "forYou" && ailments.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-border/70 bg-card px-6 py-10 text-center">
            <p className="font-display text-xl tracking-tight">
              Save a few symptoms to personalize this rail.
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Pick symptoms from your profile to see strains patients commonly
              report for them.
            </p>
          </div>
        ) : isLoading && strains.length === 0 ? (
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
