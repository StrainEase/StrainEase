import { StrainPoster } from "@/components/home/StrainPoster";
import { StrainSectionHeader } from "@/components/home/StrainSectionHeader";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { sectionHref, type HomeSection } from "@/lib/home-sections";
import { profileSlug } from "@/lib/strain-catalog";
import type { StrainProfile } from "@/lib/strain-profile";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Link } from "react-router";

export function AilmentCarousel({
  ailments,
  preview,
}: {
  ailments: string[];
  preview: (name: string) => StrainProfile[];
}) {
  const [api, setApi] = useState<CarouselApi>();
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setPage(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  return (
    <section className="space-y-3">
      <StrainSectionHeader title="For your symptoms" />
      <Carousel
        setApi={setApi}
        opts={{ align: "start", loop: false }}
        className="w-full"
      >
        <CarouselContent className="-ml-0">
          {ailments.map((name) => (
            <CarouselItem key={name} className="pl-0">
              <AilmentPage
                name={name}
                strains={preview(name)}
                section={{ kind: "ailment", name }}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      <div
        className="flex items-center justify-center gap-[7px]"
        role="tablist"
        aria-label="Symptom pages"
      >
        {ailments.map((name, index) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-label={name}
            aria-selected={index === page}
            className={cn(
              "size-[7px] rounded-full",
              index === page
                ? "bg-foreground"
                : "bg-muted-foreground/38 hover:bg-muted-foreground/60",
            )}
            onClick={() => api?.scrollTo(index)}
          />
        ))}
      </div>
    </section>
  );
}

function AilmentPage({
  name,
  strains,
  section,
}: {
  name: string;
  strains: StrainProfile[];
  section: HomeSection;
}) {
  return (
    <div className="rounded-[22px] border border-border/70 bg-card p-3.5">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-primary">{name}</p>
        <Link
          to={sectionHref(section)}
          className="text-xs font-semibold text-primary hover:text-primary/80"
        >
          See more
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-2.5 lg:grid-cols-6">
        {strains.map((profile) => (
          <StrainPoster
            key={profileSlug(profile)}
            profile={profile}
            compact
            className="min-w-0"
          />
        ))}
      </div>
    </div>
  );
}
