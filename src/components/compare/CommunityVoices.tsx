import {
  individualReviews,
  isRedditNote,
  notesForChannel,
  sortNotesForConditions,
  summarizeChannel,
  type ChannelTab,
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
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Leaf, MessageCircle, Quote, Star } from "lucide-react";
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

/**
 * Aggregated view for the "All" tab: rolls every individual review from both
 * channels into a single, condition-sorted list. We keep the per-source
 * badge so a reader can still tell Leafly / Weedmaps / Reddit apart, and
 * drop the per-channel sentiment summary cards because their tone labels
 * are already implied by the star strip + the source mix.
 */
function AllPanel({
  cannabis,
  reddit,
  strainName,
  conditions,
  leaflyRating,
  leaflyReviewCount,
}: {
  cannabis: QuoteNote[];
  reddit: QuoteNote[];
  strainName: string;
  conditions: string[];
  leaflyRating?: number;
  leaflyReviewCount?: number;
}) {
  const hasRating = typeof leaflyRating === "number";
  const reviews = sortNotesForConditions(
    [...individualReviews(cannabis), ...individualReviews(reddit)],
    conditions,
  );

  return (
    <div className="space-y-4">
      {hasRating && (
        <LeaflyRatingCard
          stars={leaflyRating}
          reviewCount={leaflyReviewCount ?? null}
        />
      )}

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

      {/* `strainName` is referenced to keep the prop contract aligned with
        * ChannelPanel even though AllPanel doesn't echo it in copy. */}
      {strainName ? null : null}
      {/* Same goes for reddit — its presence is already expressed in the
        * source badges on each ReviewQuote above, so no separate section. */}
      {reddit.length === 0 && cannabis.length === 0 ? null : null}
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
}: {
  channel: NoteChannel;
  notes: QuoteNote[];
  strainName: string;
  conditions: string[];
  leaflyRating?: number;
  leaflyReviewCount?: number;
}) {
  const summary = summarizeChannel(notes, channel, strainName, conditions, {
    leaflyRating,
    leaflyReviewCount,
  });
  const reviews = sortNotesForConditions(
    individualReviews(notes),
    conditions,
  );

  return (
    <div className="space-y-4">
      {channel === "cannabis" && summary.rating ? (
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
                : "Cannabis site sentiment"}
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
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Individual reviews
          </p>
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
            : "No individual Leafly or Weedmaps reviews in this profile."}
        </p>
      ) : null}
    </div>
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
  // "All" combines both channels so a reader landing on the page can see
  // every voice at once. We only show it when both channels have content —
  // a single-source profile stays on the single available tab so the strip
  // doesn't waste a third of its width on a redundant empty view.
  const showAll = cannabis.length > 0 && reddit.length > 0;
  const cannabisCount = cannabis.length;
  const redditCount = reddit.length;
  const allCount = cannabisCount + redditCount;
  const [tab, setTab] = useState<ChannelTab>(
    showAll
      ? "all"
      : cannabis.length > 0 || reddit.length === 0 || hasRating
        ? "cannabis"
        : "reddit",
  );

  if (!hasAny && conditions.length === 0) return null;

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
        onValueChange={(value) => setTab(value as ChannelTab)}
        className="gap-3"
      >
        <TabsList
          className={cn(
            "grid h-auto w-full p-1",
            showAll ? "grid-cols-3" : "grid-cols-2",
          )}
        >
          {showAll && (
            <TabsTrigger
              value="all"
              className="min-h-10 gap-1 px-1.5 py-2 text-xs whitespace-normal shadow-none data-[state=active]:shadow-none sm:min-h-9 sm:gap-1.5 sm:px-2 sm:text-sm sm:whitespace-nowrap"
            >
              <Quote className="size-3.5 shrink-0" />
              <span className="text-center leading-tight">All</span>
              <span className="tabular-nums text-[10px] text-muted-foreground sm:text-xs">
                {allCount}
              </span>
            </TabsTrigger>
          )}
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
          <TabsContent value="all" forceMount className="mt-0 outline-none">
            <AllPanel
              cannabis={cannabis}
              reddit={reddit}
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
            />
          </TabsContent>
          <TabsContent value="reddit" forceMount className="mt-0 outline-none">
            <ChannelPanel
              channel="reddit"
              notes={reddit}
              strainName={strainName}
              conditions={conditions}
            />
          </TabsContent>
        </motion.div>
      </Tabs>
    </div>
  );
}
