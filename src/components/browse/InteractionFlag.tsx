import { Pill, ShieldAlert } from "lucide-react";
import type { InteractionFlag as InteractionFlagData } from "@/lib/strain-api";
import { cn } from "@/lib/utils";

/**
 * Drug-interaction badge for a recommendation card. Renders only
 * when the backend stamped an `InteractionFlag` on the recommendation
 * — meaning the patient has medications on the interaction library
 * AND the strain's THC midpoint crossed the conservative high-THC
 * threshold. The badge is intentionally border-only (no shadow) and
 * amber/orange-tinted to match the existing "Caution" pill style so
 * it doesn't visually shout louder than the medical signal it carries.
 *
 * Severity drives the icon and color. "theoretical" records never
 * reach the badge — the backend drops them before stamping.
 */
export function InteractionFlag({
  flag,
  className,
}: {
  flag: InteractionFlagData;
  className?: string;
}) {
  const tone = severityTone(flag.severity);
  const label = severityLabel(flag.severity);
  return (
    <div
      role="status"
      aria-label={`Drug interaction: ${flag.drugClass}, ${label}`}
      data-testid="interaction-flag"
      data-severity={flag.severity}
      className={cn(
        "flex items-start gap-2 rounded-lg border bg-card/50 px-3 py-2 text-left",
        tone.border,
        tone.text,
        className,
      )}
    >
      <tone.Icon
        aria-hidden
        className={cn("mt-0.5 size-3.5 shrink-0", tone.icon)}
        strokeWidth={2.5}
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold tracking-tight">
          {label} interaction with your {flag.drugClass}
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
          {flag.summary}
        </p>
      </div>
    </div>
  );
}

function severityTone(severity: InteractionFlagData["severity"]): {
  border: string;
  text: string;
  icon: string;
  Icon: typeof Pill;
} {
  switch (severity) {
    case "high":
      return {
        border: "border-red-500/50",
        text: "text-red-700 dark:text-red-400",
        icon: "text-red-600 dark:text-red-400",
        Icon: ShieldAlert,
      };
    case "moderate":
      return {
        border: "border-orange-500/50",
        text: "text-orange-700 dark:text-orange-400",
        icon: "text-orange-600 dark:text-orange-400",
        Icon: ShieldAlert,
      };
    case "low":
      return {
        border: "border-amber-500/50",
        text: "text-amber-800 dark:text-amber-400",
        icon: "text-amber-600 dark:text-amber-400",
        Icon: Pill,
      };
    case "theoretical":
      // Defensive: the backend drops theoretical records, but if
      // an older response somehow still carries one, render it as
      // a low-severity amber badge rather than crashing.
      return severityTone("low");
  }
}

function severityLabel(severity: InteractionFlagData["severity"]): string {
  switch (severity) {
    case "high":
      return "High";
    case "moderate":
      return "Moderate";
    case "low":
      return "Possible";
    case "theoretical":
      return "Theoretical";
  }
}