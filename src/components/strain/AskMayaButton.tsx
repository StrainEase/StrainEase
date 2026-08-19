import { useEffect, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { elaborateSection } from "@/lib/strain-api";
import type { StrainProfile } from "@/lib/strain-profile";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * ✨ Ask Maya button. Sits to the right of a strain-description
 * section header and asks the AI to elaborate on that specific section
 * (e.g. expand "What it might do for you" into a fuller write-up tied
 * to this strain and the patient's saved ailments / medications /
 * relief-log history).
 *
 * Behaviour:
 * - First click: fires the callable, swaps the button label to a
 *   spinner, and reveals the elaborated text under the original
 *   section body.
 * - Second click while open: hides the elaboration (button returns
 *   to its idle state — we don't burn a second call unless the user
 *   explicitly re-asks).
 * - Errors are swallowed and surfaced as a one-line note under the
 *   button so we never break the surrounding section.
 */
export function AskMayaButton({
  strain,
  sectionHeading,
  sectionBody,
  ailments,
  medications,
  reliefHistory,
  isAuthenticated,
  className,
}: {
  strain: StrainProfile;
  sectionHeading: string;
  sectionBody: string;
  ailments?: string[];
  medications?: string[];
  reliefHistory?: string;
  /** When false, the button renders as a no-op gentle nudge; signed-out
   *  users still see the option but the call is rate-limited by the
   *  backend the same way the rest of the guest surface is. */
  isAuthenticated?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset the elaboration if the strain or section changes — the
  // previous answer doesn't apply any more.
  useEffect(() => {
    setOpen(false);
    setText(null);
    setError(null);
  }, [strain.name, sectionHeading]);

  const handleClick = async () => {
    if (loading) return;
    if (open) {
      setOpen(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await elaborateSection({
        strain,
        sectionHeading,
        sectionBody,
        ailments,
        medications,
        reliefHistory,
      });
      setText(result.elaboration);
      setOpen(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Maya couldn't expand on this right now.",
      );
      setOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col items-end gap-1.5", className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={loading}
        aria-expanded={open}
        className="h-7 gap-1.5 rounded-full border-primary/30 px-2.5 text-[11px] font-semibold text-primary hover:bg-primary/5"
        data-testid={`ask-maya-${slugifyTest(sectionHeading)}`}
      >
        {loading ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <Sparkles className="size-3" />
        )}
        {loading ? "Asking Maya…" : open ? "Hide" : "Ask Maya"}
      </Button>
      <AnimatePresence initial={false}>
        {open && text ? (
          <motion.aside
            key="elaboration"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-[12px] leading-5 text-foreground/85"
          >
            <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-primary uppercase">
              <Sparkles className="size-3" />
              Maya's take
            </p>
            <p className="mt-1 whitespace-pre-line">{text}</p>
          </motion.aside>
        ) : null}
        {open && error ? (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md text-right text-[11px] text-muted-foreground"
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>
      {!isAuthenticated && !open ? (
        <p className="text-right text-[10px] text-muted-foreground">
          Sign in for a tailored take
        </p>
      ) : null}
    </div>
  );
}

function slugifyTest(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
