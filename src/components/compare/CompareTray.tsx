import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CompareSelection } from "@/hooks/use-compare-selection";
import { AnimatePresence, motion } from "framer-motion";
import { GitCompareArrows, Sparkles, X } from "lucide-react";

export type CompareTrayProps = {
  /**
   * The hook's return value. The tray reads `names`, `remove`, and
   * `clear` from this — it does not own selection state.
   */
  selection: CompareSelection;
  /** Runs the parent's `handleCompare` (which knows about prefs/condition). */
  onCompare: () => void;
  /** True when the parent is currently running a comparison. */
  isRunning?: boolean;
  className?: string;
};

/**
 * Sticky bottom bar that surfaces the compare-from-search selection.
 *
 * Behavior:
 *  - Renders nothing when `selection.names` is empty (handled by the
 *    `AnimatePresence` exit transition; the parent doesn't need to
 *    conditionally mount it).
 *  - Animates in/out via framer-motion so the appear/disappear feels
 *    intentional, not jumpy.
 *  - Mobile-friendly: chips wrap, the primary CTA spans full width on
 *    small screens, and the bottom padding respects iOS Safari's home
 *    indicator via `pb-[env(safe-area-inset-bottom)]`.
 *  - Borders only (no shadows), translucent background, blurred via
 *    `backdrop-blur-md` so it sits comfortably over the page content
 *    without obscuring it.
 *
 * The tray never reads or writes the URL directly; that's the hook's
 * job. This component only fires callbacks.
 */
export function CompareTray({
  selection,
  onCompare,
  isRunning = false,
  className,
}: CompareTrayProps) {
  const { names, count, cap, remove, clear } = selection;
  const open = count > 0;
  const canRun = count >= 2 && !isRunning;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="compare-tray"
          role="region"
          aria-label="Compare selection"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 border-t border-border/70 bg-background/85 backdrop-blur-md",
            "pb-[env(safe-area-inset-bottom)]",
            className,
          )}
        >
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
              <span className="mr-1 hidden text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:inline">
                Compare
              </span>
              {names.map((name) => (
                <span
                  key={name}
                  className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/8 py-1 pl-3 pr-1.5 text-xs font-medium text-primary"
                >
                  {name}
                  <button
                    type="button"
                    aria-label={`Remove ${name}`}
                    className="cursor-pointer rounded-full p-0.5 transition-colors hover:bg-primary/15"
                    onClick={() => remove(name)}
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              <span className="ml-auto text-xs tabular-nums text-muted-foreground sm:ml-2">
                {count} / {cap}
              </span>
            </div>
            <div className="flex items-center gap-2 sm:shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="cursor-pointer rounded-full"
                onClick={() => clear()}
              >
                Clear
              </Button>
              <Button
                type="button"
                size="sm"
                className="w-full cursor-pointer rounded-full sm:w-auto"
                disabled={!canRun}
                onClick={() => onCompare()}
              >
                {isRunning ? (
                  <>
                    <Sparkles className="size-3.5 animate-pulse" />
                    Comparing…
                  </>
                ) : (
                  <>
                    <GitCompareArrows className="size-3.5" />
                    Compare ({count})
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}