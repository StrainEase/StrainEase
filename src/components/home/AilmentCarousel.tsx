import { StrainPoster } from "@/components/home/StrainPoster";
import { StrainSectionHeader } from "@/components/home/StrainSectionHeader";
import { profileSlug } from "@/lib/strain-catalog";
import type { StrainProfile } from "@/lib/strain-profile";
import { cn } from "@/lib/utils";
import { Link } from "react-router";
import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const AILMENT_PREVIEW = 6;
const ROW_SIZE = 3;

export function AilmentCarousel({
  ailments,
  preview,
  seeMoreHref,
}: {
  ailments: string[];
  preview: (name: string) => StrainProfile[];
  seeMoreHref: (name: string) => string;
}) {
  // Track which ailment page is currently snapped into view so the page
  // dots stay in sync without forcing a re-render of the carousel items.
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const trackActive = useCallback(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const width = root.clientWidth;
    if (width <= 0) return;
    const index = Math.round(root.scrollLeft / width);
    setActiveIndex(
      Math.min(Math.max(index, 0), Math.max(ailments.length - 1, 0)),
    );
  }, [ailments.length]);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    trackActive();
    root.addEventListener("scroll", trackActive, { passive: true });
    const onResize = () => trackActive();
    window.addEventListener("resize", onResize);
    return () => {
      root.removeEventListener("scroll", trackActive);
      window.removeEventListener("resize", onResize);
    };
  }, [trackActive, ailments.length]);

  if (ailments.length === 0) return null;

  return (
    <section className="space-y-3">
      <StrainSectionHeader title="For your symptoms" />
      <div className="rounded-[22px] border border-border/70 bg-card p-3 sm:p-4">
        <div
          ref={scrollerRef}
          className="-mx-3 flex snap-x snap-mandatory gap-0 overflow-x-auto px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-4 sm:px-4"
          aria-label="Symptom pages"
        >
          {ailments.map((name) => (
            <AilmentPage
              key={name}
              name={name}
              strains={preview(name).slice(0, AILMENT_PREVIEW)}
              seeMoreHref={seeMoreHref(name)}
            />
          ))}
        </div>
        <PageDots
          active={activeIndex}
          onSelect={(index) => scrollToPage(scrollerRef, index)}
          labels={ailments}
        />
      </div>
    </section>
  );
}

function AilmentPage({
  name,
  strains,
  seeMoreHref,
}: {
  name: string;
  strains: StrainProfile[];
  seeMoreHref: string;
}) {
  const row1 = strains.slice(0, ROW_SIZE);
  const row2 = strains.slice(ROW_SIZE, ROW_SIZE * 2);

  return (
    <article
      // snap-always forces the browser to stop at every snap point, so a
      // fast finger flick only advances one page instead of jumping several.
      className="flex w-full shrink-0 snap-start snap-always flex-col gap-3 px-3 sm:px-4"
      data-ailment={name}
    >
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-primary">{name}</h3>
        <Link
          to={seeMoreHref}
          className="text-[12px] font-semibold text-primary hover:text-primary/80"
        >
          See more
        </Link>
      </header>
      <PosterRow strains={row1} />
      <PosterRow strains={row2} />
    </article>
  );
}

function PosterRow({ strains }: { strains: StrainProfile[] }) {
  if (strains.length === 0) {
    return (
      <div className="grid grid-cols-3 gap-3" aria-hidden>
        {Array.from({ length: ROW_SIZE }).map((_, index) => (
          <div
            key={index}
            className="aspect-[3/4] rounded-2xl border border-dashed border-border/60 bg-background/40"
          />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-3">
      {strains.map((profile) => (
        <StrainPoster
          key={profileSlug(profile)}
          profile={profile}
          compact
          className="min-w-0"
        />
      ))}
    </div>
  );
}

function PageDots({
  active,
  onSelect,
  labels,
}: {
  active: number;
  onSelect: (index: number) => void;
  labels: string[];
}) {
  if (labels.length <= 1) return null;
  return (
    <div
      role="tablist"
      aria-label="Symptom pages"
      className="mt-3 flex items-center justify-center gap-1.5"
    >
      {labels.map((label, index) => {
        const isActive = index === active;
        return (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={label}
            onClick={() => onSelect(index)}
            className={cn(
              "size-2 rounded-full transition-colors",
              isActive
                ? "bg-foreground"
                : "bg-muted-foreground/35 hover:bg-muted-foreground/60",
            )}
          />
        );
      })}
    </div>
  );
}

function scrollToPage(
  ref: RefObject<HTMLDivElement | null>,
  index: number,
) {
  const root = ref.current;
  if (!root) return;
  const width = root.clientWidth;
  if (width <= 0) return;
  root.scrollTo({ left: index * width, behavior: "smooth" });
}
