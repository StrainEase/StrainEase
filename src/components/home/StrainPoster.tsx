import { StrainImage } from "@/components/strain/StrainImage";
import { Badge } from "@/components/ui/badge";
import { recordRecentlyViewed } from "@/lib/recently-viewed";
import { slugify } from "@/lib/saved-strains";
import { topMedicalUses } from "@/lib/strain-catalog";
import type { StrainProfile } from "@/lib/strain-profile";
import { TYPE_LABEL, typeBadgeClass } from "@/lib/strain-ui";
import { cn } from "@/lib/utils";
import { Leaf } from "lucide-react";
import { Link } from "react-router";

export function StrainPoster({
  profile,
  compact = false,
  className,
}: {
  profile: StrainProfile;
  compact?: boolean;
  className?: string;
}) {
  const href = `/strain/${slugify(profile.name)}`;
  const type = profile.type;
  const uses = topMedicalUses(profile, 3);
  const terpenes = (profile.terpenes ?? []).slice(0, 3).map((t) => t.name);
  const hasFooter = terpenes.length > 0 || typeof profile.leaflyRating === "number";

  const leaflyNote =
    typeof profile.leaflyRating === "number"
      ? `${profile.leaflyRating.toFixed(1)}★${
          typeof profile.leaflyReviewCount === "number"
            ? ` · ${profile.leaflyReviewCount.toLocaleString("en-US")} reviews`
            : ""
        }`
      : undefined;

  return (
    <Link
      to={href}
      onClick={() => recordRecentlyViewed(profile)}
      className={cn(
        "group flex flex-col rounded-2xl border border-border/70 bg-card p-4 transition-[border-color] duration-300 hover:border-primary/40",
        className,
      )}
    >
      <StrainImage
        src={profile.imageUrl}
        alt=""
        type={type}
        className={cn(
          "w-full rounded-xl border border-border/70",
          compact ? "h-[108px]" : "h-[132px]",
        )}
        iconClassName={compact ? "size-6" : "size-7"}
      />
      <div className="mt-3 flex items-center justify-between gap-2">
        <p
          className={cn(
            "font-display font-semibold leading-tight text-balance line-clamp-2",
            compact ? "min-h-9 text-[14px]" : "min-h-[40px] text-[16px]",
          )}
        >
          {profile.name}
        </p>
        {type && (
          <Badge
            className={cn(
              typeBadgeClass(type),
              "shrink-0 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide capitalize",
            )}
          >
            {TYPE_LABEL[type] ?? type}
          </Badge>
        )}
      </div>
      {profile.thcRange && (
        <p className="mt-1 font-mono text-[11px] tracking-wide text-muted-foreground">
          THC {profile.thcRange}
        </p>
      )}
      {uses.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {uses.map((use) => (
            <span
              key={use}
              className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground"
            >
              {use}
            </span>
          ))}
        </div>
      )}
      {hasFooter && (
        <div className="mt-auto pt-3">
          {terpenes.length > 0 && (
            <p className="border-t border-border/60 pt-3 text-[11px] leading-5 text-muted-foreground">
              <span className="font-medium text-foreground">Terpenes</span> — {" "}
              {terpenes.join(" · ")}
            </p>
          )}
          {leaflyNote && (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-primary">
              <Leaf className="size-3" />
              Leafly · {leaflyNote}
            </p>
          )}
        </div>
      )}
    </Link>
  );
}
