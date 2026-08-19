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
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ArrowDownUp, Leaf, MessageCircle, Quote, Star } from "lucide-react";
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
  // "Date" — the backend returns notes roughly in collection order. The
  // web side has no explicit date on each note today, so preserve the
  // backend order; the per-source "Most recent" heading still lives in
  // the surrounding copy. If we add a date field later, swap this for
  // a real `newest first` comparator.
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
    <div className="flex items-center gap-4 rounded-xl border border-border/70 bg-background px-4 py-3.5">
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
    </div>
  );
}

function ReviewQuote({ note }: { note: QuoteNote }) {
  return (
    <blockquote className="relative min-w-0 rounded-xl border border-border/60 bg-background px-3 py-3 sm:px-4">
      <Quote className="absolute right-3 top-3 size-3.5 text-border" />
      <p className="pr-6 text-xs leading-5 text-muted-foreground sm:text-[13px] sm:leading-6">
        {note.text}
      </p>
      <p className="mt-2 break-words text-[11px] font-semibold uppercase tracking-wider text-primary">
        {note.source}
      </p>
    </blockquote>
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

      <div className="rounded-xl border border-border/70 bg-background px-4 py-4 sm:px-5">
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
      </div>

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
}: {
  notes?: QuoteNote[];
  strainName: string;
  conditions?: string[];
  leaflyRating?: number;
  leaflyReviewCount?: number;
}) {
  const cannabis = notesForChannel(notes, "cannabis");
  const reddit = notesForChannel(notes, "reddit");
  const hasRating = typeof leaflyRating === "number";
  const hasAny = cannabis.length > 0 || reddit.length > 0 || hasRating;
  const [sort, setSort] = useState<ReviewSort>("relevance");
  // Default to "All" so a reader landing on the page sees both Leafly /
  // Weedmaps blurb-style reviews and Reddit patient quotes together. If
  // a single source is empty the tab still renders — the ChannelPanel
  // fills in the right empty-state copy.
  const [tab, setTab] = useState<NoteChannel>("all");

  if (!hasAny && conditions.length === 0) return null;

  const cannabisCount = cannabis.length;
  const redditCount = reddit.length;
  const allCount = cannabisCount + redditCount;
  // All (non-aggregate) notes combined for the default "All reviews"
  // tab. Each note keeps its original `source` so the badge under each
  // quote still reads "Leafly Community" / "Reddit" / etc.
  const allNotes = (notes ?? []).slice();

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
        value={tab}
        onValueChange={(value) => setTab(value as NoteChannel)}
        className="gap-3"
      >
        <TabsList className="grid h-auto w-full grid-cols-3 p-1">
          <TabsTrigger
            value="all"
            className="min-h-10 gap-1 px-1.5 py-2 text-xs whitespace-normal shadow-none data-[state=active]:shadow-none sm:min-h-9 sm:gap-1.5 sm:px-2 sm:text-sm sm:whitespace-nowrap"
          >
            <ArrowDownUp className="size-3.5 shrink-0" />
            <span className="text-center leading-tight">All reviews</span>
            <span className="tabular-nums text-[10px] text-muted-foreground sm:text-xs">
              {allCount}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="cannabis"
            className="min-h-10 gap-1 px-1.5 py-2 text-xs whitespace-normal shadow-none data-[state=active]:shadow-none sm:min-h-9 sm:gap-1.5 sm:px-2 sm:text-sm sm:whitespace-nowrap"
          >
            <Leaf className="size-3.5 shrink-0" />
            <span className="text-center leading-tight">Cannabis Sites</span>
            <span className="tabular-nums text-[10px] text-muted-foreground sm:text-xs">
              {cannabisCount}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="reddit"
            className="min-h-10 gap-1 px-1.5 py-2 text-xs whitespace-normal shadow-none data-[state=active]:shadow-none sm:min-h-9 sm:gap-1.5 sm:px-2 sm:text-sm sm:whitespace-nowrap"
          >
            <MessageCircle className="size-3.5 shrink-0" />
            <span className="text-center leading-tight">Reddit</span>
            <span className="tabular-nums text-[10px] text-muted-foreground sm:text-xs">
              {redditCount}
            </span>
          </TabsTrigger>
        </TabsList>

        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
        >
          <TabsContent value={tab} forceMount className="mt-0 outline-none">
            <ChannelPanel
              channel={tab}
              notes={
                tab === "reddit"
                  ? reddit
                  : tab === "cannabis"
                    ? cannabis
                    : allNotes
              }
              strainName={strainName}
              conditions={conditions}
              leaflyRating={leaflyRating}
              leaflyReviewCount={leaflyReviewCount}
              sort={sort}
              onSortChange={setSort}
            />
          </TabsContent>
        </motion.div>
      </Tabs>
    </div>
  );
}
