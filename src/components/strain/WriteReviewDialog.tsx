import { useState } from "react";
import { toast } from "sonner";
import { Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitStrainReview, type StrainReview } from "@/lib/strain-api";

const CONSUMPTION_FORMS = [
  { value: "flower", label: "Flower" },
  { value: "cart", label: "Cart / Vape" },
  { value: "edible", label: "Edible" },
  { value: "tincture", label: "Tincture" },
] as const;

export type { StrainReview };

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center gap-1" role="radiogroup" aria-label="Star rating">
        {Array.from({ length: 5 }).map((_, i) => {
          const filled = i < value;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChange(i + 1)}
              className="rounded p-0.5 transition-transform hover:scale-110 active:scale-95"
              aria-label={`${i + 1} star${i === 0 ? "" : "s"}`}
              aria-pressed={filled}
            >
              <Star
                className={`size-7 transition-colors ${filled ? "fill-primary text-primary" : "fill-none text-border/60"}`}
              />
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        {value === 1
          ? "Poor"
          : value === 2
            ? "Fair"
            : value === 3
              ? "Good"
              : value === 4
                ? "Great"
                : value === 5
                  ? "Excellent"
                  : "Tap to rate"}
      </p>
    </div>
  );
}

export function WriteReviewDialog({
  open,
  onOpenChange,
  strainSlug,
  strainName,
  existingReview,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strainSlug: string;
  strainName: string;
  /** If provided, the dialog pre-fills and updates the existing review. */
  existingReview?: StrainReview | null;
  onSuccess?: () => void;
}) {
  const [starRating, setStarRating] = useState(existingReview?.starRating ?? 0);
  const [reviewText, setReviewText] = useState(existingReview?.reviewText ?? "");
  const [consumptionForm, setConsumptionForm] = useState<
    "flower" | "cart" | "edible" | "tincture" | ""
  >(existingReview?.consumptionForm ?? "");
  const [submitting, setSubmitting] = useState(false);

  const isUpdate = Boolean(existingReview);
  const canSubmit = starRating >= 1 && starRating <= 5;

  function handleOpenChange(next: boolean) {
    if (!next) {
      // Reset on close
      setStarRating(existingReview?.starRating ?? 0);
      setReviewText(existingReview?.reviewText ?? "");
      setConsumptionForm(existingReview?.consumptionForm ?? "");
    }
    onOpenChange(next);
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const result = await submitStrainReview({
        strainSlug,
        starRating,
        reviewText: reviewText.trim() || undefined,
        consumptionForm: consumptionForm || undefined,
      });
      toast.success(
        isUpdate
          ? "Review updated"
          : `Thanks — ${strainName} rated ${result.avgRating.toFixed(1)} stars`,
      );
      handleOpenChange(false);
      onSuccess?.();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? String((err as { message: string }).message)
            : "Something went wrong. Try again.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-md [&>button]:top-4">
        <DialogHeader className="gap-0 border-b border-border/60 px-6 py-5">
          <DialogTitle className="text-left">
            {isUpdate ? "Update your review" : "Rate this strain"}
          </DialogTitle>
          <DialogDescription className="text-left">
            {strainName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          {/* Star picker */}
          <StarPicker value={starRating} onChange={setStarRating} />

          {/* Consumption form */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              How did you use it?{" "}
              <span className="font-normal normal-case tracking-normal">(optional)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {CONSUMPTION_FORMS.map((form) => (
                <button
                  key={form.value}
                  type="button"
                  onClick={() =>
                    setConsumptionForm(
                      consumptionForm === form.value ? "" : form.value,
                    )
                  }
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    consumptionForm === form.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/70 bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  }`}
                >
                  {form.label}
                </button>
              ))}
            </div>
          </div>

          {/* Written review */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Your experience{" "}
                <span className="font-normal normal-case tracking-normal">(optional)</span>
              </p>
              <span className="text-[10px] text-muted-foreground">
                {reviewText.length}/500
              </span>
            </div>
            <Textarea
              value={reviewText}
              onChange={(e) =>
                setReviewText(e.target.value.slice(0, 500))
              }
              placeholder="Share what worked, what didn't, and who it's best for…"
              rows={4}
              className="resize-none text-sm"
            />
          </div>
        </div>

        <DialogFooter className="border-t border-border/60 px-6 py-4">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="min-w-24"
          >
            {submitting ? "Saving…" : isUpdate ? "Update review" : "Submit review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
