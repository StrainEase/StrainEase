import { StrainRail } from "@/components/home/StrainRail";
import { HOME_FEATURED_STRAINS } from "@/lib/strain-catalog";
import { TIME_OF_DAY_SUBTITLE, timeOfDayHeadline } from "@/lib/time-of-day";

/** Pinned, hard-coded set of strains for the home rail. No API call —
 *  everything is sourced from `HOME_FEATURED_STRAINS` in the catalog. */
export function HomeScreen() {
  const headline = timeOfDayHeadline();

  return (
    <div className="space-y-10">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
          Browse
        </p>
        <h1 className="mt-2 font-display text-4xl leading-[1.05] tracking-tight text-balance sm:text-5xl">
          {headline}
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-6 text-muted-foreground">
          {TIME_OF_DAY_SUBTITLE}
        </p>
      </div>

      <StrainRail
        title="Featured strains"
        strains={HOME_FEATURED_STRAINS}
        seeMoreHref="/browse/popular"
      />
    </div>
  );
}