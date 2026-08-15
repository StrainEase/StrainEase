import { StrainPoster } from "@/components/home/StrainPoster";
import { profileSlug } from "@/lib/strain-catalog";
import type { StrainProfile } from "@/lib/strain-profile";

export function StrainGrid({ strains }: { strains: StrainProfile[] }) {
  if (strains.length === 0) {
    return (
      <div className="px-2 py-20 text-center">
        <p className="font-display text-2xl tracking-tight">No strains yet</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          Check back after you browse a little more.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {strains.map((profile) => (
        <StrainPoster
          key={profileSlug(profile)}
          profile={profile}
          className="min-w-0"
        />
      ))}
    </div>
  );
}
