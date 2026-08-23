import {
  individualReviews,
  notesForChannel,
  sortNotesForConditions,
  summarizeChannel,
  type NoteChannel,
  type QuoteNote,
  type SentimentTone,
} from "@/lib/quotes";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SWCard } from "@/components/ui/sw-card";
import type { PublicNote } from "@/lib/saved-strains";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  ArrowDownUp,
  Leaf,
  MessageCircle,
  NotebookPen,
  Quote,
  Star,
} from "lucide-react";
import { useState } from "react";

const TONE_BADGE: Record<SentimentTone, string> = {
  positive:
    "border-primary/30 bg-primary/10 text-primary",
  mixed:
    "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
  cautious:
    "border-orange-500/30 bg-orange-500/10 text-orange-800 dark:text-orange-200",
  insufficient:
    "border-border/70 bg-secondary text-muted-foreground",
};

type ReviewSort = "relevance" | "date";
const SORT_LABEL: Record<ReviewSort, string> = {
  relevance: "Relevance",
  date: "Date",
};

function sortReviews(
  notes: QuoteNote[],
  conditions: string[],
  sort: ReviewSort,
): QuoteNote[] {
  if (sort === "relevance") {
    return sortNotesForConditions(notes, conditions);
  }
  return notes;
}

function SentimentBar({
  positive,
  negative,
}: {
  positive: number;
  negative: number;
}) {
  const total = positive + negative;
  if (total === 0) return null;
  const support = Math.round((positive / total) * 100);
  return (
    <div className="mt-3 min-w-0">
      <div
        className="flex h-1.5 overflow-hidden rounded-full bg-border"
        role="meter"
        aria-label="Share of supportive versus cautious comments"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={support}
      >
        <span
          className="h-full bg-primary"
          style={{ width: `${support}%` }}
        />
        <span
          className="h-full bg-amber-500/70"
          style={{ width: `${100 - support}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between gap-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <span>Supportive</span>
        <span>Cautious</span>
      </div>
    </div>
  );
}

function StarStrip({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <span key={i} className="relative size-4">
            <Star className="size-4 text-border" />
            {fill > 0 ? (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star className="size-4 fill-primary text-primary" />
              </span>
            ) : null}
          </span>
        );
      })}
    </span>
  );
}

function LeaflyRatingCard({
  stars,
  reviewCount,
}: {
  stars: number;
  reviewCount: number | null;
}) {
  return (
    <SWCard innerClassName="flex items-center gap-4 px-4 py-3.5">
      <StarStrip value={stars} />
      <div className="min-w-0">
        <p className="text-xl font-semibold tabular-nums tracking-tight">
          {stars.toFixed(1)}
        </p>
        <p className="text-xs text-muted-foreground">
          {reviewCount !== null
            ? `${reviewCount.toLocaleString("en-US")} Leafly reviews`
            : "Average Leafly rating"}
        </p>
      </div>
    </SWCard>
  );
}

function ReviewQuote({ note }: { note: QuoteNote }) {
  return (
    <SWCard innerClassName="relative min-w-0 px-3 py-3 sm:px-4">
      <blockquote>
        <Quote className="absolute right-3 top-3 size-3.5 text-border" />
        <p className="pr-6 text-xs leading-5 text-muted-foreground sm:text-[13px] sm:leading-6">
          {note.text}
        </p>
        <p className="mt-2 break-words text-[11px] font-semibold uppercase tracking-wider text-primary">
          {note.source}
        </p>
      </blockquote>
    </SWCard>
  );
}

/**
 * Aggregated view for the "All" tab: rolls every individual review from
 * every channel into a single, condition-sorted list. The per-source
 * attribution on each review keeps the Leafly / Weedmaps / Reddit / App
 * provenance visible, and we drop the per-channel sentiment summary card
 * because the source mix + star strip already convey the tone — adding
 * the same summary on top would be redundant copy.
 */
function AllPanel({
  cannabis,
  reddit,
  appNotes,
  leaflyRating,
  leaflyReviewCount,
  conditions,
}: {
  cannabis: QuoteNote[];
  reddit: QuoteNote[];
  appNotes: QuoteNote[];
  strainName: string;
  conditions: string[];
  leaflyRating?: number;
  leaflyReviewCount?: number;
}) {
  const hasRating = typeof leaflyRating === "number";
  const reviews = sortNotesForConditions(
    [
      ...individualReviews(cannabis),
      ...individualReviews(reddit),
      ...individualReviews(appNotes),
    ],
    conditions,
  );

  return (
    <div className="space-y-4">
      {hasRating ? (
        <LeaflyRatingCard
          stars={leaflyRating}
          reviewCount={leaflyReviewCount ?? null}
        />
      ) : null}

      {reviews.length === 0 ? (
        <p className="text-xs leading-5 text-muted-foreground">
          No individual reviews collected yet for this strain.
        </p>
      ) : (
        <div>
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Every review ({reviews.length})
          </p>
          <div className="grid grid-cols-1 gap-2.5">
            {reviews.map((note, i) => (
              <ReviewQuote key={`${note.source}-${i}`} note={note} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The App Reviews tab: notes left by other StrainEase users on this
 * strain. Shown in chronological order (newest first) because the
 * sentiment sort / Leafly star strip don't apply to first-party notes.
 */
function AppReviewsPanel({ appNotes }: { appNotes: QuoteNote[] }) {
  if (appNotes.length === 0) {
    return (
      <p className="text-xs leading-5 text-muted-foreground">
        No public notes have been shared for this strain yet. Sign in to
        leave one from the strain page.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Notes from the community ({appNotes.length})
      </p>
      <div className="grid grid-cols-1 gap-2.5">
        {appNotes.map((note, i) => (
          <ReviewQuote key={`${note.source}-${i}`} note={note} />
        ))}
      </div>
    </div>
  );
}

function ChannelPanel({
  channel,
  notes,
  strainName,
  conditions,
  leaflyRating,
  leaflyReviewCount,
  sort,
  onSortChange,
}: {
  channel: NoteChannel;
  notes: QuoteNote[];
  strainName: string;
  conditions: string[];
  leaflyRating?: number;
  leaflyReviewCount?: number;
  sort: ReviewSort;
  onSortChange: (next: ReviewSort) => void;
}) {
  const summary = summarizeChannel(notes, channel, strainName, conditions, {
    leaflyRating,
    leaflyReviewCount,
  });
  const reviews = sortReviews(
    individualReviews(notes),
    conditions,
    sort,
  );

  return (
    <div className="space-y-4">
      {channel !== "reddit" && summary.rating ? (
        <LeaflyRatingCard
          stars={summary.rating.stars}
          reviewCount={summary.rating.reviewCount}
        />
      ) : null}

      <SWCard innerClassName="px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {channel === "reddit"
                ? "Reddit sentiment"
                : channel === "cannabis"
                  ? "Cannabis site sentiment"
                  : "Combined sentiment"}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="text-base font-semibold tracking-tight">
                {summary.label}
              </span>
              <Badge
                variant="outline"
                className={cn("font-medium", TONE_BADGE[summary.tone])}
              >
                {summary.reviewCount > 0
                  ? `${summary.reviewCount} ${summary.reviewCount === 1 ? "comment" : "comments"}`
                  : summary.tone === "insufficient"
                    ? "Not enough comments"
                    : "Site rating"}
              </Badge>
            </div>
          </div>
        </div>

        <SentimentBar
          positive={summary.positiveHits}
          negative={summary.negativeHits}
        />

        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {summary.summary}
        </p>
      </SWCard>

      {reviews.length > 0 ? (
        <div>
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Individual reviews
            </p>
            <SortPicker sort={sort} onChange={onSortChange} />
          </div>
          <div className="grid grid-cols-1 gap-2.5">
            {reviews.map((note, i) => (
              <ReviewQuote key={`${note.source}-${i}`} note={note} />
            ))}
          </div>
        </div>
      ) : notes.length > 0 ? (
        <p className="text-xs leading-5 text-muted-foreground">
          {channel === "reddit"
            ? "No individual Reddit comments in this profile."
            : channel === "cannabis"
              ? "No individual Leafly or Weedmaps reviews in this profile."
              : "No individual reviews in this profile."}
        </p>
      ) : null}
    </div>
  );
}

function SortPicker({
  sort,
  onChange,
}: {
  sort: ReviewSort;
  onChange: (next: ReviewSort) => void;
}) {
  return (
    <Select
      value={sort}
      onValueChange={(v) => onChange(v as ReviewSort)}
    >
      <SelectTrigger
        aria-label="Sort reviews"
        className="h-7 w-auto min-w-[120px] gap-1.5 rounded-full border-border/70 bg-background px-2.5 text-[11px] font-medium"
      >
        <ArrowDownUp className="size-3 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {(Object.keys(SORT_LABEL) as ReviewSort[]).map((value) => (
          <SelectItem key={value} value={value} className="text-xs">
            {SORT_LABEL[value]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function CommunityVoices({
  notes,
  strainName,
  conditions = [],
  leaflyRating,
  leaflyReviewCount,
  redditSources,
  appReviews,
}: {
  notes?: QuoteNote[];
  strainName: string;
  conditions?: string[];
  leaflyRating?: number;
  leaflyReviewCount?: number;
  redditSources?: {
    subreddit: string;
    title: string;
    snippet?: string;
  }[];
  /**
   * App reviews — public notes left by other StrainEase users on this
   * strain. Rendered in their own tab so the reviews set has one place
   * to read every source side-by-side instead of two stacked sections.
   */
  appReviews?: PublicNote[];
}) {
  const mergedNotes: QuoteNote[] = (() => {
    const base = (notes ?? []).slice();
    const seen = new Set(
      base.map((n) => n.text.trim().toLowerCase()).filter(Boolean),
    );
    for (const src of redditSources ?? []) {
      const text = (src.snippet?.trim() || src.title?.trim() || "").trim();
      if (!text) continue;
      const key = text.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      base.push({
        source: `r/${src.subreddit}`,
        text,
        kind: "reddit",
      });
    }
    return base;
  })();

  const appNotes: QuoteNote[] = (appReviews ?? []).map((n) => ({
    // Use the author name as the source so the existing ReviewQuote renders
    // the same per-review attribution as the other channels.
    source: n.authorName,
    text: n.note,
    kind: "other",
  }));

  const cannabis = notesForChannel(mergedNotes, "cannabis");
  const reddit = notesForChannel(mergedNotes, "reddit");
  const hasRating = typeof leaflyRating === "number";
  const hasAny =
    cannabis.length > 0 ||
    reddit.length > 0 ||
    appNotes.length > 0 ||
    hasRating;

  // "All" combines every channel so a reader landing on the page can scan
  // every voice at once. We only show the All tab when at least two
  // channels have content — a single-source profile stays on its single
  // available tab so the strip doesn't waste width on a redundant view.
  const showCannabis = cannabis.length > 0 || hasRating;
  const showReddit = reddit.length > 0;
  const showApp = appNotes.length > 0;
  const visibleSourceCount = [showCannabis, showReddit, showApp].filter(
    Boolean,
  ).length;
  const showAll = visibleSourceCount >= 2;
  const allCount = cannabis.length + reddit.length + appNotes.length;
  const [sort, setSort] = useState<ReviewSort>("relevance");
  const initialTab: NoteChannel = showAll
    ? "all"
    : showCannabis
      ? "cannabis"
      : showReddit
        ? "reddit"
        : "app";
  const [tab, setTab] = useState<NoteChannel>(initialTab);

  if (!hasAny && conditions.length === 0) return null;

  const visibleChannels: NoteChannel[] = [
    ...(showAll ? (["all"] as const) : []),
    ...(showCannabis ? (["cannabis"] as const) : []),
    ...(showReddit ? (["reddit"] as const) : []),
    ...(showApp ? (["app"] as const) : []),
  ];
  const activeTab: NoteChannel = visibleChannels.includes(tab)
    ? tab
    : (visibleChannels[0] ?? "all");
  const cols =
    visibleChannels.length <= 1
      ? "grid-cols-1"
      : visibleChannels.length === 2
        ? "grid-cols-2"
        : "grid-cols-3";
  // 4 tabs (all + 3 sources) overflows a 3-col grid; bump to 4 cols so
  // labels stay on one line.
  const tabCols = visibleChannels.length >= 4 ? "grid-cols-4" : cols;

  return (
    <div className="mt-auto space-y-3 border-t border-border/60 pt-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <MessageCircle className="size-3.5 shrink-0 text-primary" />
          What patients and Reddit say
        </div>
        {conditions.length > 0 ? (
          <p className="text-[11px] text-muted-foreground">
            Focused on {conditions.join(", ").toLowerCase()}
          </p>
        ) : null}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setTab(value as NoteChannel)}
        className="gap-3"
      >
        {visibleChannels.length > 0 ? (
        <TabsList className={cn("grid h-auto w-full p-1", tabCols)}>
          {showAll && (
          <TabsTrigger
            value="all"
            className="min-h-9 gap-1.5 px-2 py-2 text-sm shadow-none data-[state=active]:shadow-none"
          >
            <Quote className="size-3.5 shrink-0" />
            <span className="leading-tight">All</span>
            <span className="tabular-nums text-[10px] font-medium text-muted-foreground sm:text-xs">
              {allCount}
            </span>
          </TabsTrigger>
          )}
          {showCannabis && (
          <TabsTrigger
            value="cannabis"
            className="min-h-9 gap-1.5 px-2 py-2 text-sm shadow-none data-[state=active]:shadow-none"
          >
            <Leaf className="size-3.5 shrink-0" />
            <span className="leading-tight">Cannabis Sites</span>
          </TabsTrigger>
          )}
          {showReddit && (
          <TabsTrigger
            value="reddit"
            className="min-h-9 gap-1.5 px-2 py-2 text-sm shadow-none data-[state=active]:shadow-none"
          >
            <MessageCircle className="size-3.5 shrink-0" />
            <span className="leading-tight">Reddit</span>
          </TabsTrigger>
          )}
          {showApp && (
          <TabsTrigger
            value="app"
            className="min-h-9 gap-1.5 px-2 py-2 text-sm shadow-none data-[state=active]:shadow-none"
          >
            <NotebookPen className="size-3.5 shrink-0" />
            <span className="leading-tight">App Reviews</span>
          </TabsTrigger>
          )}
        </TabsList>
        ) : null}

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
        >
          <TabsContent value="all" forceMount className="mt-0 outline-none">
            <AllPanel
              cannabis={cannabis}
              reddit={reddit}
              appNotes={appNotes}
              strainName={strainName}
              conditions={conditions}
              leaflyRating={leaflyRating}
              leaflyReviewCount={leaflyReviewCount}
            />
          </TabsContent>
          <TabsContent value="cannabis" forceMount className="mt-0 outline-none">
            <ChannelPanel
              channel="cannabis"
              notes={cannabis}
              strainName={strainName}
              conditions={conditions}
              leaflyRating={leaflyRating}
              leaflyReviewCount={leaflyReviewCount}
              sort={sort}
              onSortChange={setSort}
            />
          </TabsContent>
          <TabsContent value="reddit" forceMount className="mt-0 outline-none">
            <ChannelPanel
              channel="reddit"
              notes={reddit}
              strainName={strainName}
              conditions={conditions}
              sort={sort}
              onSortChange={setSort}
            />
          </TabsContent>
          <TabsContent value="app" forceMount className="mt-0 outline-none">
            <AppReviewsPanel appNotes={appNotes} />
          </TabsContent>
        </motion.div>
      </Tabs>
    </div>
  );
}
