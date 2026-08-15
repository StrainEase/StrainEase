import { StrainPoster } from "@/components/home/StrainPoster";
import { StrainSectionHeader } from "@/components/home/StrainSectionHeader";
import { profileSlug } from "@/lib/strain-catalog";
import type { StrainProfile } from "@/lib/strain-profile";

export function StrainRail({
  title,
  strains,
  seeMoreHref,
  emptyText,
}: {
  title: string;
  strains: StrainProfile[];
  seeMoreHref?: string;
  emptyText?: string;
}) {
  return (
    <section className="space-y-3">
      <StrainSectionHeader
        title={title}
        seeMoreHref={strains.length > 0 ? seeMoreHref : undefined}
      />
      {strains.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">
          {emptyText ?? "Nothing here yet."}
        </p>
      ) : (
        <div className="-mx-6 overflow-x-auto px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-3">
            {strains.map((profile) => (
              <StrainPoster
                key={profileSlug(profile)}
                profile={profile}
                className="w-[148px] shrink-0 sm:w-[160px]"
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
