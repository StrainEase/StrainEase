import { CommunityVoices } from "@/components/compare/CommunityVoices";
import { StrainImage } from "@/components/strain/StrainImage";
import { StrainDescriptionView } from "@/components/strain/StrainDescription";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StrainProfile } from "@/lib/strain-api";
import { Leaf, Star } from "lucide-react";
import { Link } from "react-router";

export function StrainDetailCard({
  strain,
  conditions = [],
  className,
  compact = false,
}: {
  strain: StrainProfile & {
    redditSources?: {
      subreddit: string;
      title: string;
      snippet?: string;
    }[];
    communityNotes?: {
      source: string;
      text: string;
      kind?: "leafly" | "weedmaps" | "reddit" | "other";
    }[];
    leaflyRating?: number;
    leaflyReviewCount?: number;
    imageUrl?: string;
    description?: string;
  };
  conditions?: string[];
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex gap-3">
        <div className="size-16 shrink-0 overflow-hidden rounded-xl border border-border/50 bg-muted/40 sm:size-20">
          <StrainImage
            imageUrl={strain.imageUrl}
            alt={strain.name}
            className="size-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <Link
            to={`/strain/${encodeURIComponent(String(strain.id ?? strain.name))}`}
            className="block truncate font-semibold tracking-tight text-foreground hover:underline"
          >
            {strain.name}
          </Link>
          {strain.type || strain.category ? (
            <p className="text-xs capitalize text-muted-foreground">
              {strain.type ?? strain.category}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {typeof strain.thc === "number" || typeof strain.thcPercent === "number" ? (
              <Badge variant="secondary" className="tabular-nums text-[10px]">
                THC {(strain.thc ?? strain.thcPercent)}%
              </Badge>
            ) : null}
            {(typeof strain.cbd === "number" || typeof strain.cbdPercent === "number") &&
            (strain.cbd ?? strain.cbdPercent)! > 0 ? (
              <Badge variant="outline" className="tabular-nums text-[10px]">
                CBD {(strain.cbd ?? strain.cbdPercent)}%
              </Badge>
            ) : null}
            {typeof strain.leaflyRating === "number" ? (
              <Badge variant="outline" className="gap-0.5 text-[10px]">
                <Star className="size-2.5 fill-primary text-primary" />
                {strain.leaflyRating.toFixed(1)}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      {!compact && strain.description ? (
        <StrainDescriptionView description={strain.description} />
      ) : null}

      {!compact && Array.isArray(strain.effects) && strain.effects.length > 0 ? (
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Effects
          </p>
          <div className="flex flex-wrap gap-1">
            {strain.effects.slice(0, 6).map((e) => (
              <Badge key={e} variant="outline" className="font-normal text-[10px]">
                {e}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      <CommunityVoices
        notes={strain.communityNotes}
        strainName={strain.name}
        conditions={conditions}
        leaflyRating={strain.leaflyRating}
        leaflyReviewCount={strain.leaflyReviewCount}
        redditSources={strain.redditSources}
      />
    </div>
  );
}
