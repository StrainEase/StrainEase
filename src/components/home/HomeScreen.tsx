import { AilmentCarousel } from "@/components/home/AilmentCarousel";
import { StrainRail } from "@/components/home/StrainRail";
import { matchAilments } from "@/lib/strain-catalog";
import {
  HOME_AILMENTS,
  HOME_PREVIEW_LIMIT,
  previewFor,
  sectionHref,
  sectionTitle,
  type HomeSection,
} from "@/lib/home-sections";
import type { StrainProfile } from "@/lib/strain-profile";
import { TIME_OF_DAY_SUBTITLE, timeOfDayHeadline } from "@/lib/time-of-day";

export function HomeScreen({
  popular,
  recents,
  ailments = [],
}: {
  popular: StrainProfile[];
  recents: StrainProfile[];
  /** Signed-in user's saved ailments. When non-empty the home page is
   *  tailored to them: a "Top picks for your symptoms" rail appears at
   *  the top and the ailment carousel drops the static catalog in favor
   *  of the user's actual list. */
  ailments?: string[];
}) {
  const rail = (
    section: Exclude<HomeSection, { kind: "ailment" | "recents" }>,
  ) => (
    <StrainRail
      title={sectionTitle(section)}
      strains={previewFor(section, popular)}
      seeMoreHref={sectionHref(section)}
    />
  );

  const headline = timeOfDayHeadline();

  const tailored = ailments.length > 0 ? matchAilments(ailments, popular) : [];
  const ailmentList = ailments.length > 0 ? ailments : HOME_AILMENTS;

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

      {tailored.length > 0 && (
        <StrainRail
          title="Top picks for your symptoms"
          strains={tailored.slice(0, HOME_PREVIEW_LIMIT)}
        />
      )}

      {rail({ kind: "popular" })}

      <AilmentCarousel
        ailments={ailmentList}
        preview={(name) => previewFor({ kind: "ailment", name }, popular)}
      />

      {rail({ kind: "sativa" })}
      {rail({ kind: "hybrid" })}
      {rail({ kind: "indica" })}

      <StrainRail
        title="Recently viewed"
        strains={previewFor({ kind: "recents" }, popular, recents)}
        seeMoreHref={
          recents.length > 0 ? sectionHref({ kind: "recents" }) : undefined
        }
        emptyText="Open a strain and it'll land here."
      />
    </div>
  );
}
