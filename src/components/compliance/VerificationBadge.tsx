import { useAgeVerification } from "@/hooks/use-age-verification";
import { cn } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";

/**
 * Compact "21+ verified" pill for navbars / dashboards. Reads from the
 * age-verification hook, so it shows the user's verified region when set
 * and falls back to a generic badge otherwise.
 */
export function VerificationBadge({ className }: { className?: string }) {
  const { state } = useAgeVerification();

  if (state.status !== "verified") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase",
          className,
        )}
      >
        <ShieldCheck className="size-3" />
        21+ only
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] font-medium tracking-wide text-primary uppercase",
        className,
      )}
      title={`Age verified · ${state.region.label} (${state.region.minimumAge}+)`}
    >
      <ShieldCheck className="size-3" />
      {state.region.minimumAge}+ verified
    </span>
  );
}