import { personalHitRate, type ReliefLog } from "@/lib/relief-log";
import { CheckCircle2, TrendingDown, TrendingUp } from "lucide-react";

/**
 * Personal "what worked for you" chip for the strain detail page.
 * Surfaces a per-condition hit rate once the patient has logged
 * this strain for that condition at least 3 times. Hidden until
 * there's enough data — better to stay quiet than ship a low-
 * confidence number.
 *
 * Three tones:
 *  - positive: hit rate >= 0.66
 *  - caution:  hit rate <= 0.33
 *  - neutral:  anything else
 */
export function StrainPersonalInsight({
  strainName,
  logs,
  /** Conditions to score against, in priority order. The first
   * one with enough data wins. Pass empty array to score against
   * any condition. */
  conditions = [],
}: {
  strainName: string;
  logs: ReliefLog[];
  conditions?: string[];
}) {
  // Try each condition in order; fall back to "any condition".
  let rate = null;
  for (const condition of conditions) {
    rate = personalHitRate(logs, strainName, condition);
    if (rate && rate.sufficient) break;
    rate = null;
  }
  if (!rate) {
    rate = personalHitRate(logs, strainName);
  }
  if (!rate || !rate.sufficient) return null;

  const tone: "positive" | "caution" | "neutral" =
    rate.rate >= 0.66 ? "positive" : rate.rate <= 0.33 ? "caution" : "neutral";

  const Icon =
    tone === "positive"
      ? TrendingUp
      : tone === "caution"
        ? TrendingDown
        : CheckCircle2;

  const toneClasses =
    tone === "positive"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : tone === "caution"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
        : "border-border bg-card text-muted-foreground";

  const phrase = rate.condition
    ? `Helpful for ${rate.condition}`
    : "Helpful for you";
  const detail = `${rate.hits} of ${rate.total} sessions hit the mark.`;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${toneClasses}`}
      role="status"
    >
      <Icon className="size-3.5" />
      <span className="font-medium">{phrase}</span>
      <span aria-hidden className="opacity-50">
        ·
      </span>
      <span>{detail}</span>
    </div>
  );
}
