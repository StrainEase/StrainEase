import { Star, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import type { StrainRating, StrainReview } from "@/lib/strain-api";

function StarStrip({
  value,
  interactive,
  onChange,
}: {
  value: number;
  interactive?: boolean;
  onChange?: (v: number) => void;
}) {
  return (
    <span className="flex items-center gap-0.5" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => onChange?.(i + 1)}
            className={`relative size-6 ${interactive ? "cursor-pointer transition-transform hover:scale-110 active:scale-95" : "cursor-default"}`}
          >
            <Star
              className={`size-6 ${interactive ? "text-border/60" : "text-border"}`}
              fill="none"
            />
            {fill > 0 ? (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star
                  className={`size-6 ${interactive ? "text-primary" : "text-primary"}`}
                  fill="currentColor"
                />
              </span>
            ) : null}
          </button>
        );
      })}
    </span>
  );
}

function AggregateRatingCard({
  rating,
}: {
  rating: StrainRating | null;
}) {
  if (!rating || rating.reviewCount === 0) return null;
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border/70 bg-background px-4 py-3.5">
      <StarStrip value={rating.avgRating} />
      <div className="min-w-0">
        <p className="text-xl font-semibold tabular-nums tracking-tight">
          {rating.avgRating.toFixed(1)}
        </p>
        <p className="text-xs text-muted-foreground">
          {rating.reviewCount.toLocaleString("en-US")} StrainEase reviews
        </p>
      </div>
    </div>
  );
}

function ReviewCard({
  review,
  isOwn,
}: {
  review: StrainReview;
  isOwn?: boolean;
}) {
  const date = new Date(review.createdAt);
  const formatted =
    date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="rounded-xl border border-border/60 bg-background px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold uppercase text-primary">
            {(review.displayName ?? "A")[0]}
          </div>
          <div>
            <p className="text-sm font-medium leading-none">
              {review.displayName ?? "Anonymous"}
              {isOwn && (
                <span className="ml-1.5 text-[10px] font-normal text-primary">
                  (you)
                </span>
              )}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{formatted}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <StarStrip value={review.starRating} />
          {review.consumptionForm && (
            <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
              {review.consumptionForm}
            </span>
          )}
        </div>
      </div>
      {review.reviewText ? (
        <p className="mt-2.5 text-sm leading-6 text-muted-foreground">
          {review.reviewText}
        </p>
      ) : null}
    </div>
  );
}

export function ReviewSection({
  strainSlug,
  strainName,
  currentUid,
}: {
  strainSlug: string;
  strainName: string;
  currentUid?: string;
}) {
  const [rating, setRating] = useState<StrainRating | null>(null);
  const [reviews, setReviews] = useState<StrainReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !isFirebaseConfigured || !strainSlug) return;
    const unsubs: Unsubscribe[] = [];

    // Aggregate rating snapshot
    unsubs.push(
      onSnapshot(doc(db, "strainRatings", strainSlug), (snap) => {
        if (snap.exists()) {
          setRating({ strainSlug, ...snap.data() } as StrainRating);
        } else {
          setRating(null);
        }
        setLoading(false);
      }),
    );

    // Reviews snapshot — newest first
    const reviewsQuery = query(
      collection(db, "strainReviews"),
      where("strainSlug", "==", strainSlug),
    );
    unsubs.push(
      onSnapshot(reviewsQuery, (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as StrainReview))
          .sort((a, b) => b.createdAt - a.createdAt);
        setReviews(list);
      }),
    );

    return () => unsubs.forEach((u) => u());
  }, [strainSlug, db]);

  const hasReviews = reviews.length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <MessageCircle className="size-3.5 shrink-0 text-primary" />
        Community reviews
      </div>

      {/* Aggregate */}
      <AggregateRatingCard rating={rating} />

      {/* Review list */}
      {hasReviews ? (
        <div className="space-y-2.5">
          {reviews.map((review) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            >
              <ReviewCard
                review={review}
                isOwn={review.uid === currentUid}
              />
            </motion.div>
          ))}
        </div>
      ) : !loading ? (
        <p className="rounded-xl border border-border/60 bg-background px-4 py-4 text-sm text-muted-foreground">
          No reviews yet. Be the first to share your experience with {strainName}.
        </p>
      ) : null}
    </div>
  );
}
