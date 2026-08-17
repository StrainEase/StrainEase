import { cn } from "@/lib/utils";
import { Stethoscope } from "lucide-react";

/**
 * Inline medical disclaimer banner. Use on dashboard, strain detail pages,
 * or any place a user is acting on strain information.
 */
export function MedicalDisclaimer({
  className,
  variant = "info",
}: {
  className?: string;
  variant?: "info" | "warn";
}) {
  const tone =
    variant === "warn"
      ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      : "border-primary/30 bg-primary/5 text-foreground/90";
  const iconTone =
    variant === "warn"
      ? "text-amber-600 dark:text-amber-400"
      : "text-primary";

  return (
    <aside
      role="note"
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-xs leading-relaxed",
        tone,
        className,
      )}
    >
      <Stethoscope className={cn("mt-0.5 size-4 shrink-0", iconTone)} />
      <div>
        <p className="font-medium">Research information, not medical advice.</p>
        <p className="mt-1 text-foreground/70">
          Strain descriptions, patient reports, and rankings on StrainEase are
          aggregated from public sources and should not replace guidance from
          a licensed clinician. Always consult a qualified healthcare provider
          before starting or changing any treatment, including medical
          cannabis.
        </p>
      </div>
    </aside>
  );
}