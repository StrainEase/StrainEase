import { Loader2 } from "lucide-react";
import { SWCard } from "@/components/ui/sw-card";
import { cn } from "@/lib/utils";

/**
 * iOS-style loading card for the community voices slot at the bottom
 * of the strain detail page. Kept after the broader per-section
 * hydration cleanup because community's Firestore subscription can
 * deliver its first snapshot after the profile lands, and a brief
 * placeholder keeps the slot from blanking out and then popping into
 * the full block.
 *
 * If we ever need to extend this to other sections again, add the
 * section key + config back rather than re-introducing the per-section
 * placeholder pattern that flickered in practice.
 */
export function HydratingSection({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-hydrating="community"
      className={cn("flex flex-col gap-2.5", className)}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Community voices
      </p>
      <SWCard innerClassName="p-5">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Loader2
              className="size-4 shrink-0 animate-spin text-primary"
              aria-hidden
            />
            <span className="text-sm text-muted-foreground">
              Pulling Leafly reviews and Reddit comments…
            </span>
          </div>
          <span
            aria-hidden
            className="skeleton-line h-3 rounded-full"
            style={{ maxWidth: "100%" }}
          />
          <span
            aria-hidden
            className="skeleton-line h-3 rounded-full"
            style={{ maxWidth: "100%" }}
          />
          <span
            aria-hidden
            className="skeleton-line h-3 rounded-full"
            style={{ maxWidth: "55%" }}
          />
        </div>
      </SWCard>
    </div>
  );
}
