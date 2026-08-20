import { StrainImage } from "@/components/strain/StrainImage";
import { Badge } from "@/components/ui/badge";
import { recordRecentlyViewed } from "@/lib/recently-viewed";
import { slugify } from "@/lib/saved-strains";
import type { StrainProfile } from "@/lib/strain-profile";
import { TYPE_LABEL, typeBadgeClass } from "@/lib/strain-ui";
import { cn } from "@/lib/utils";
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

  return (
    <Link
      to={href}
      onClick={() => recordRecentlyViewed(profile)}
      className={cn(
        "group flex flex-col gap-2 text-left",
        className,
      )}
    >
      <StrainImage
        src={profile.imageUrl}
        alt=""
        type={type}
        className={cn(
          "w-full rounded-2xl border border-border/70",
          compact ? "h-[108px]" : "h-[132px]",
        )}
        iconClassName={compact ? "size-6" : "size-7"}
      />
      {type && (
        <Badge
          className={cn(
            typeBadgeClass(type),
            "self-start px-2.5 py-0.5 text-[11px] font-semibold tracking-wide capitalize",
          )}
        >
          {TYPE_LABEL[type] ?? type}
        </Badge>
      )}
      <p
        className={cn(
          "font-display font-semibold leading-tight text-balance line-clamp-2",
          compact ? "min-h-9 text-[14px]" : "min-h-[40px] text-[16px]",
        )}
      >
        {profile.name}
      </p>
      {profile.thcRange && (
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          THC {profile.thcRange}
        </p>
      )}
    </Link>
  );
}
