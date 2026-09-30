import { StrainPoster } from "@/components/home/StrainPoster";
import {
  longPressRingClass,
  useCompareLongPress,
} from "@/hooks/use-compare-long-press";
import type { StrainProfile } from "@/lib/strain-profile";
import { cn } from "@/lib/utils";
import { Check, GitCompareArrows } from "lucide-react";
import { memo } from "react";

/**
 * A `StrainPoster` with the "press and hold to add to compare" gesture.
 *
 * Wrap every card surface (Home rails, the ailment carousel, the Browse
 * grid) in this instead of mounting `StrainPoster` directly so the
 * gesture, ring feedback, and toast copy stay identical everywhere.
 *
 * Interaction contract:
 *  - Plain tap → navigates to the strain page, exactly as before.
 *  - Press and hold (~500ms, stationary) → the strain joins the compare
 *    selection (the URL `?strains=` param shared with the tray), a ring
 *    pulses on the photo while holding and flashes solid when it lands,
 *    and a toast confirms the add. The release click is swallowed —
 *    the card never navigates after a hold.
 *  - When the strain is already in the selection, a small badge marks
 *    the card and the hold gesture is disabled (it's already in).
 *
 * The comparison surface itself is the existing `<CompareTray />`; this
 * component never opens it.
 */
export const ComparableStrainPoster = memo(function ComparableStrainPoster({
  profile,
  compact = false,
  className,
}: {
  profile: StrainProfile;
  compact?: boolean;
  className?: string;
}) {
  const { handlers, flash, inCompare } = useCompareLongPress(profile.name);

  return (
    <span
      {...handlers}
      className={cn("group relative block min-w-0", className)}
    >
      {flash && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 z-10 aspect-[4/3] rounded-2xl",
            longPressRingClass(flash),
          )}
        />
      )}
      {inCompare && (
        <span
          aria-hidden
          className="pointer-events-none absolute right-1.5 top-1.5 z-10 flex size-6 items-center justify-center rounded-full border border-primary/50 bg-background text-primary"
          title="In the compare tray"
        >
          <Check className="size-3.5" strokeWidth={2.75} />
        </span>
      )}
      <StrainPoster profile={profile} compact={compact} />
      {!inCompare && (
        <span className="pointer-events-none absolute bottom-[3.75rem] left-1/2 z-10 hidden -translate-x-1/2 rounded-full border border-border/70 bg-background/90 px-2 py-0.5 text-[10px] font-medium text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:block">
          <GitCompareArrows className="mr-1 inline size-3 align-[-2px]" />
          Hold to compare
        </span>
      )}
    </span>
  );
});
