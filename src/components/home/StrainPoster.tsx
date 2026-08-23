import { StrainImage } from "@/components/strain/StrainImage";
import { Badge } from "@/components/ui/badge";
import { recordRecentlyViewed } from "@/lib/recently-viewed";
import { slugify } from "@/lib/saved-strains";
import type { StrainProfile } from "@/lib/strain-profile";
import { TYPE_LABEL, typeBadgeClass } from "@/lib/strain-ui";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";
import { Link } from "react-router";

/**
 * iOS-parity strain poster (`ios/StrainWise/Home/StrainPoster.swift`):
 * a bare column — rounded photo, type badge, name under the image,
 * then the THC range with the Leafly star rating beside it. No card
 * chrome, no medical-use chips, no review footer.
 */
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

  return (
    <Link
      to={href}
      onClick={() => recordRecentlyViewed(profile)}
      className={cn("group flex min-w-0 flex-col gap-2 text-left", className)}
    >
      <StrainImage
        src={profile.imageUrl}
        alt=""
        type={type}
        className="aspect-[4/3] w-full rounded-2xl border border-border/70"
        iconClassName={compact ? "size-6" : "size-7"}
      />
      {type && (
        <Badge
          className={cn(typeBadgeClass(type), "self-start capitalize")}
        >
          {TYPE_LABEL[type] ?? type}
        </Badge>
      )}
      <p
        className={cn(
          "font-display font-semibold leading-snug text-pretty line-clamp-2",
          compact ? "min-h-8 text-[14px]" : "min-h-[38px] text-[16px]",
        )}
      >
        {profile.name}
      </p>
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {profile.thcRange && (
          <span className="font-mono text-[11px] tracking-wide text-muted-foreground">
            THC {profile.thcRange}
          </span>
        )}
        {typeof profile.leaflyRating === "number" && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wide text-primary"
            title={`Leafly average rating: ${profile.leaflyRating.toFixed(1)}`}
          >
            <Star
              className="size-3 fill-primary text-primary"
              aria-hidden
            />
            {profile.leaflyRating.toFixed(1)}
          </span>
        )}
      </div>
    </Link>
  );
}
