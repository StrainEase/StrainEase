import { useNavigate } from "react-router";
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

import { StrainNoteIndicator } from "@/components/saved/StrainNoteIndicator";
import { StrainImage } from "@/components/strain/StrainImage";
import { getPhotoURL } from "@/lib/strain-catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SWCard } from "@/components/ui/sw-card";
import { applyCatalogPhotos } from "@/lib/strain-catalog";
import { slugify } from "@/lib/saved-strains";
import type { StrainProfile } from "@/lib/strain-profile";
import { strainsWithTerpene, terpeneProfile } from "@/lib/terpenes";

import { TerpeneDetailSkeleton } from "./TerpeneDetailSkeleton";

/**
 * Drill-down dialog for a single curated terpene. Opened from the
 * strain detail page when a user taps a terpene card, mirrors the
 * iOS `TerpeneDetailView` sheet (header + about + tags + family
 * strains with photos).
 *
 * The component owns no state besides `open`; the parent decides
 * which terpene to show. Family strains are passed in as a prop
 * so we can show a real loading state on first open instead of
 * flashing an empty "no strains" message before the list resolves.
 */
export function TerpeneDetailDialog({
  terpeneName,
  popularStrains,
  familyLoading = false,
  open,
  onOpenChange,
}: {
  terpeneName: string | null;
  popularStrains: StrainProfile[] | null;
  familyLoading?: boolean;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const navigate = useNavigate();
  const profile = terpeneName ? terpeneProfile(terpeneName) : undefined;
  const family =
    terpeneName && popularStrains
      ? applyCatalogPhotos(
          strainsWithTerpene(terpeneName, popularStrains).withProfile,
        )
      : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl"
      >
        {terpeneName && profile ? (
          <div className="flex flex-col gap-5 p-6 text-left">
            <SheetHeader className="space-y-2 pr-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                Terpene
              </p>
              <SheetTitle className="font-display text-3xl tracking-tight capitalize">
                {terpeneName}
              </SheetTitle>
              <p className="max-w-xl text-[15px] leading-6 text-muted-foreground">
                {profile.summary}
              </p>
            </SheetHeader>

            <SWCard innerClassName="p-5">
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
            </SWCard>

            <FamilyStrainsSection
              terpeneName={terpeneName}
              strains={family}
              loading={familyLoading}
              onSelect={(strain) => {
                onOpenChange(false);
                navigate(`/strain/${slugify(strain.name)}`);
              }}
            />
          </div>
        ) : (
          <div className="p-6 text-sm text-muted-foreground">
            That terpene is not in the StrainEase guide yet.
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function FamilyStrainsSection({
  terpeneName,
  strains,
  loading,
  onSelect,
}: {
  terpeneName: string;
  strains: StrainProfile[];
  loading: boolean;
  onSelect: (strain: StrainProfile) => void;
}) {
  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Strains in this family
        </h2>
        {!loading && (
          <span className="text-xs text-muted-foreground">
            {strains.length} match{strains.length === 1 ? "" : "es"}
          </span>
        )}
      </div>
      {loading ? (
        <div className="mt-4">
          <TerpeneDetailSkeleton />
        </div>
      ) : strains.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-border/70 bg-card p-6 text-sm text-muted-foreground">
          No popular strains on Leafly currently list {terpeneName}. Try opening
          a strain and checking its profile — the full terpene breakdown is
          inside.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {strains.map((strain, index) => (
            <motion.li
              key={strain.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.04, 0.4) }}
            >
              <FamilyStrainRow strain={strain} onSelect={onSelect} />
            </motion.li>
          ))}
        </ul>
      )}
    </section>
  );
}

function FamilyStrainRow({
  strain,
  onSelect,
}: {
  strain: StrainProfile;
  onSelect: (strain: StrainProfile) => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => onSelect(strain)}
      className="flex h-auto w-full items-start gap-3 rounded-2xl border border-border/70 bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-card"
    >
      <div className="size-12 shrink-0 overflow-hidden rounded-xl bg-primary/10">
        <StrainImage
          src={strain.imageUrl}
          fallbackSrc={getPhotoURL(strain.name)}
          alt={strain.name}
          type={strain.type}
          className="size-12 rounded-xl"
          iconClassName="size-5"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-semibold tracking-tight">
          {strain.name}
          <StrainNoteIndicator strainName={strain.name} />
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
                className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium capitalize text-secondary-foreground"
              >
                {effect.name}
              </span>
            ))}
          </div>
        )}
      </div>
      <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
    </Button>
  );
}
