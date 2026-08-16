import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, GitCompareArrows } from "lucide-react";

export type CompareToggleButtonProps = {
  /** True when the strain is already in the parent's compare selection. */
  isInSelection: boolean;
  /**
   * True when the parent's compare selection is at the cap (3 strains).
   * Disables adding a new strain but doesn't lock the user out of
   * removing one that's already selected.
   */
  isFull: boolean;
  /**
   * Called after a non-disabled click. Receives the underlying click
   * event so callers can read modifiers or coordinates if needed.
   */
  onToggle: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Optional accessible label override. Defaults describe the current state. */
  ariaLabel?: string;
  className?: string;
};

/**
 * Three-state toggle for "Add to compare":
 *
 *  - **idle** (default) — outline button with the `GitCompareArrows`
 *    icon and "Add to compare" label. `aria-pressed={false}`.
 *  - **selected** — primary-tinted button with the `Check` icon and
 *    "In compare" label. `aria-pressed={true}`. Clicking removes the
 *    strain from the selection.
 *  - **full** (only when not already in the selection) — disabled
 *    outline button with a "Compare is full (3 strains)" message and a
 *    `title` tooltip.
 *
 * The click handler calls `preventDefault` and `stopPropagation`
 * defensively so the button can be nested inside a `<Link>` without
 * triggering parent navigation. Today the button is used as a primary
 * CTA on the strain detail page (see `src/pages/Strain.tsx`), not as a
 * card overlay.
 */
export function CompareToggleButton({
  isInSelection,
  isFull,
  onToggle,
  ariaLabel,
  className,
}: CompareToggleButtonProps) {
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onToggle(event);
  };

  if (isInSelection) {
    return (
      <Button
        type="button"
        variant="default"
        size="sm"
        aria-pressed={true}
        aria-label={ariaLabel ?? "Remove from compare"}
        className={cn("cursor-pointer rounded-full", className)}
        onClick={handleClick}
      >
        <Check className="size-3.5" />
        In compare
      </Button>
    );
  }

  if (isFull) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled
        aria-pressed={false}
        aria-label={ariaLabel ?? "Compare is full (3 strains)"}
        title="Compare is full (3 strains)"
        className={cn("cursor-not-allowed rounded-full", className)}
        onClick={handleClick}
      >
        <GitCompareArrows className="size-3.5" />
        Compare is full
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-pressed={false}
      aria-label={ariaLabel ?? "Add to compare"}
      className={cn("cursor-pointer rounded-full", className)}
      onClick={handleClick}
    >
      <GitCompareArrows className="size-3.5" />
      Add to compare
    </Button>
  );
}