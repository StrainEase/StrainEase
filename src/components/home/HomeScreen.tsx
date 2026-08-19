import { AilmentCarousel } from "@/components/home/AilmentCarousel";
import { StrainRail } from "@/components/home/StrainRail";
import { useAilments } from "@/hooks/use-ailments";
import { usePopularStrains } from "@/hooks/use-popular-strains";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import {
  HOME_AILMENTS,
  HOME_PREVIEW_LIMIT,
  previewFor,
  sectionHref,
} from "@/lib/home-sections";
import { TIME_OF_DAY_SUBTITLE, timeOfDayHeadline } from "@/lib/time-of-day";
import type { StrainProfile } from "@/lib/strain-profile";

/** Mirrors `ios/StrainWise/Home/HomeView.swift` row order:
 *   hero → Top picks for your symptoms? → Popular strains → For your symptoms
 *   (carousel) → Sativa → Hybrid → Indica → Recently viewed.
 */
export function HomeScreen() {
  const headline = timeOfDayHeadline();
  const { popular } = usePopularStrains();
  const recents = useRecentlyViewed();
  const { names: savedAilments } = useAilments();

  const hasSavedAilments = savedAilments.length > 0;
  const forYou = hasSavedAilments
    ? previewFor(
        { kind: "forYou" },
        popular,
        recents,
        savedAilments,
        HOME_PREVIEW_LIMIT,
      )
    : [];
  const popularPreview = previewFor({ kind: "popular" }, popular, recents);
  const sativa = previewFor({ kind: "sativa" }, popular, recents);
  const hybrid = previewFor({ kind: "hybrid" }, popular, recents);
  const indica = previewFor({ kind: "indica" }, popular, recents);
  const recentPreview = recents.slice(0, HOME_PREVIEW_LIMIT);

  const ailmentsForCarousel = hasSavedAilments
    ? savedAilments
    : HOME_AILMENTS;
  const ailmentPreview = (name: string): StrainProfile[] =>
    previewFor({ kind: "ailment", name }, popular, recents);

  return (
    <div className="space-y-10">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
          Browse
        </p>
        {/* iOS uses system largeTitle + serif design, regular weight.
            Instrument Serif at regular reads thin on web; medium + a
            touch more size matches the iOS optical weight. */}
        <h1 className="mt-2 font-display text-[2.25rem] font-medium leading-[1.05] tracking-tight text-balance sm:text-5xl">
          {headline}
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-6 text-muted-foreground">
          {TIME_OF_DAY_SUBTITLE}
        </p>
      </div>

      {hasSavedAilments && forYou.length > 0 && (
        <StrainRail
          title="Top picks for your symptoms"
          strains={forYou}
          seeMoreHref={sectionHref({ kind: "forYou" })}
        />
      )}

      <StrainRail
        title="Popular strains"
        strains={popularPreview}
        seeMoreHref={sectionHref({ kind: "popular" })}
      />

      <AilmentCarousel
        ailments={ailmentsForCarousel}
        preview={ailmentPreview}
        seeMoreHref={(name) => sectionHref({ kind: "ailment", name })}
      />

      <StrainRail
        title="Sativa"
        strains={sativa}
        seeMoreHref={sectionHref({ kind: "sativa" })}
      />
      <StrainRail
        title="Hybrid"
        strains={hybrid}
        seeMoreHref={sectionHref({ kind: "hybrid" })}
      />
      <StrainRail
        title="Indica"
        strains={indica}
        seeMoreHref={sectionHref({ kind: "indica" })}
      />

      {recentPreview.length > 0 && (
        <StrainRail
          title="Recently viewed"
          strains={recentPreview}
          seeMoreHref={sectionHref({ kind: "recents" })}
          emptyText="Open a strain and it'll land here."
        />
      )}
    </div>
  );
}
