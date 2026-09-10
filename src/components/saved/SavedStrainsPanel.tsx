import { useAuth } from "@/hooks/use-auth";
import {
  listenToSavedStrains,
  removeSavedStrain,
  type SavedStrain,
} from "@/lib/saved-strains";
import { listenToReliefLogs, type ReliefLog } from "@/lib/relief-log";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { ComparableStrainPoster } from "@/components/strain/ComparableStrainPoster";
import { ReliefInsightsPanel } from "@/components/saved/ReliefInsightsPanel";
import { cn } from "@/lib/utils";
import { Bookmark, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

/**
 * 2x3 paged grid of saved strains. 1:1 port of the iOS
 * `SavedStrainsView` (PR #269) and the Android
 * `SavedStrainsSheet` (PR #270). Notes, public reviews, and
 * relief history for a saved strain now live on the strain
 * detail page (see `<SavedStrainNotes />` in `src/pages/Strain.tsx`)
 * — the modal is just the 2x3 grid of saved posters so the
 * heart button surfaces a clean favorites view on every
 * platform.
 */
export function SavedStrainsPanel() {
  const { user } = useAuth();
  const [saved, setSaved] = useState<SavedStrain[] | null>(null);
  const [logs, setLogs] = useState<ReliefLog[]>([]);

  useEffect(() => {
    if (!db || !user) {
      setSaved([]);
      return;
    }
    return listenToSavedStrains(user.uid, setSaved);
  }, [user?.uid]);

  useEffect(() => {
    if (!db || !user) {
      setLogs([]);
      return;
    }
    return listenToReliefLogs(user.uid, setLogs);
  }, [user?.uid]);

  if (!isFirebaseConfigured) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card px-8 py-12 text-center">
        <Bookmark className="mx-auto size-8 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold tracking-tight">
          Saving needs Firebase
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Add your Firebase keys in the Keys/API keys tab (VITE_FIREBASE_API_KEY,
          VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID) to save strains
          and write notes.
        </p>
      </div>
    );
  }

  if (saved === null) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (saved.length === 0) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card px-8 py-12 text-center">
        <Bookmark className="mx-auto size-8 text-primary" />
        <h2 className="mt-4 text-lg font-semibold tracking-tight">
          No saved strains yet
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Hit "Save" on any strain in search results, finder picks, or
          comparisons and it will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ReliefInsightsPanel logs={logs} />
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <Bookmark className="size-3.5 text-primary" />
        {saved.length} saved {saved.length === 1 ? "strain" : "strains"}
      </div>
      <SavedStrainsCarousel
        saved={saved}
        onRemove={(slug) => {
          if (!db || !user) return;
          void removeSavedStrain(user.uid, slug).catch((err: unknown) =>
            toast(
              err instanceof Error
                ? err.message
                : "Could not remove that strain.",
            ),
          );
        }}
      />
    </div>
  );
}

const PAGE_SIZE = 6;

function chunkIntoPages(items: SavedStrain[]): SavedStrain[][] {
  const pages: SavedStrain[][] = [];
  for (let i = 0; i < items.length; i += PAGE_SIZE) {
    pages.push(items.slice(i, i + PAGE_SIZE));
  }
  return pages;
}

/** Horizontal pager of 2x3 saved-strain grids. Mirrors the
 *  iOS `AilmentCarousel` UX (snap-x / scroll-snap-type:
 *  mandatory) so a fast finger flick only advances one page
 *  instead of jumping several. */
function SavedStrainsCarousel({
  saved,
  onRemove,
}: {
  saved: SavedStrain[];
  onRemove: (slug: string) => void;
}) {
  const pages = chunkIntoPages(saved);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const trackActive = useCallback(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const width = root.clientWidth;
    if (width <= 0) return;
    const index = Math.round(root.scrollLeft / width);
    setActiveIndex(
      Math.min(Math.max(index, 0), Math.max(pages.length - 1, 0)),
    );
  }, [pages.length]);

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
  }, [trackActive, pages.length]);

  return (
    <div className="space-y-3">
      <div
        ref={scrollerRef}
        className="-mx-2 flex snap-x snap-mandatory gap-0 overflow-x-auto px-2 [scrollbar-width:none] [scroll-padding-inline:8px] [&::-webkit-scrollbar]:hidden"
        aria-label="Saved strain pages"
      >
        {pages.map((page, idx) => (
          <SavedStrainsPage
            key={`${page[0]?.slug ?? "empty"}-${idx}`}
            page={page}
            onRemove={onRemove}
          />
        ))}
      </div>
      {pages.length > 1 && (
        <PageDots
          active={activeIndex}
          onSelect={(index) => scrollToPage(scrollerRef, index)}
          count={pages.length}
        />
      )}
    </div>
  );
}

function SavedStrainsPage({
  page,
  onRemove,
}: {
  page: SavedStrain[];
  onRemove: (slug: string) => void;
}) {
  // Build the 2x3 grid from a flat list, padded with invisible
  // spacers so the existing posters still span their half-width
  // slot when a page has fewer than 6 items.
  const cells: (SavedStrain | null)[] = [...page];
  while (cells.length < PAGE_SIZE) cells.push(null);
  const rows: (SavedStrain | null)[][] = [
    cells.slice(0, 2),
    cells.slice(2, 4),
    cells.slice(4, 6),
  ];
  return (
    <article
      // snap-always forces the browser to stop at every snap
      // point so a fast finger flick only advances one page. The
      // right-side padding is the gutter between adjacent pages;
      // the scroller's px-2 keeps page edges flush with the
      // dialog's interior.
      className="flex w-full shrink-0 snap-start snap-always flex-col gap-2.5 pr-4"
    >
      {rows.map((row, rowIdx) => (
        <div key={rowIdx} className="grid grid-cols-2 gap-2.5">
          {row.map((item, colIdx) =>
            item ? (
              <SavedStrainCell
                key={item.slug}
                item={item}
                onRemove={onRemove}
              />
            ) : (
              <div
                key={`empty-${rowIdx}-${colIdx}`}
                aria-hidden
                className="aspect-[4/3] rounded-2xl border border-dashed border-border/60 bg-background/40"
              />
            ),
          )}
        </div>
      ))}
    </article>
  );
}

function SavedStrainCell({
  item,
  onRemove,
}: {
  item: SavedStrain;
  onRemove: (slug: string) => void;
}) {
  return (
    <div className="group relative min-w-0">
      <ComparableStrainPoster
        profile={{
          name: item.name,
          inKnowledgeBase: true,
          type: item.type,
          thcRange: item.thcRange,
          imageUrl: item.imageUrl,
        }}
        compact
        className="min-w-0"
      />
      <button
        type="button"
        aria-label={`Remove ${item.name}`}
        onClick={(event) => {
          // Don't let the click fall through to the poster
          // link underneath.
          event.preventDefault();
          event.stopPropagation();
          onRemove(item.slug);
        }}
        className="absolute right-1.5 top-1.5 z-20 flex size-6 cursor-pointer items-center justify-center rounded-full border border-border/70 bg-background/95 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 hover:text-destructive"
      >
        <X className="size-3.5" strokeWidth={2.5} />
      </button>
    </div>
  );
}

function PageDots({
  active,
  onSelect,
  count,
}: {
  active: number;
  onSelect: (index: number) => void;
  count: number;
}) {
  return (
    <div
      role="tablist"
      aria-label="Saved strain pages"
      className="flex items-center justify-center gap-1.5"
    >
      {Array.from({ length: count }).map((_, index) => {
        const isActive = index === active;
        return (
          <button
            key={index}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={`Page ${index + 1} of ${count}`}
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

function scrollToPage(ref: RefObject<HTMLDivElement | null>, index: number) {
  const root = ref.current;
  if (!root) return;
  const width = root.clientWidth;
  if (width <= 0) return;
  root.scrollTo({ left: index * width, behavior: "smooth" });
}
