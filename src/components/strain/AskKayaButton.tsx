import { useEffect, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { elaborateSection } from "@/lib/strain-api";
import type { StrainProfile } from "@/lib/strain-profile";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * ✨ Ask Kaya button. Sits to the right of a strain-description
 * section header and asks the AI to elaborate on that specific section.
 *
 * Age verification is purely client-side now (see PR #134), so there's no
 * "re-mirror the claim" retry path on backend rejection — a permission-
 * denied error here means the signed-in user is in good standing and the
 * caller is just rate-limited or hitting a transient error.
 *
 * Layout: control stays on the header row; elaboration is rendered via
 * AskKayaElaboration below the section body when the parent wires
 * onElaborationChange.
 */
export function AskKayaButton({
  strain,
  sectionHeading,
  sectionBody,
  ailments,
  medications,
  reliefHistory,
  isAuthenticated,
  className,
  inlineElaboration = false,
  onElaborationChange,
}: {
  strain: StrainProfile;
  sectionHeading: string;
  sectionBody: string;
  ailments?: string[];
  medications?: string[];
  reliefHistory?: string;
  isAuthenticated?: boolean;
  className?: string;
  inlineElaboration?: boolean;
  onElaborationChange?: (payload: {
    open: boolean;
    text: string | null;
    error: string | null;
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOpen(false);
    setText(null);
    setError(null);
  }, [strain.name, sectionHeading]);

  useEffect(() => {
    onElaborationChange?.({ open, text, error });
  }, [open, text, error, onElaborationChange]);

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
          : "Kaya couldn't expand on this right now.",
      );
      setOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex shrink-0 flex-col items-end gap-1.5", className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={loading}
        aria-expanded={open}
        className="h-7 gap-1.5 rounded-full border-primary/30 px-2.5 text-[11px] font-semibold text-primary hover:bg-primary/5"
        data-testid={`ask-kaya-${slugifyTest(sectionHeading)}`}
      >
        {loading ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <Sparkles className="size-3" />
        )}
        {loading ? "Asking Kaya…" : open ? "Hide" : "Ask Kaya"}
      </Button>
      {inlineElaboration ? (
        <AskKayaElaboration open={open} text={text} error={error} />
      ) : null}
      {!isAuthenticated && !open ? (
        <p className="text-right text-[10px] text-muted-foreground">
          Sign in for a tailored take
        </p>
      ) : null}
    </div>
  );
}

/** Full-width Kaya elaboration panel — place below the section body so the
 *  header row (title + Ask Kaya / Hide) never wraps. */
export function AskKayaElaboration({
  open,
  text,
  error,
}: {
  open: boolean;
  text: string | null;
  error: string | null;
}) {
  return (
    <AnimatePresence initial={false}>
      {open && text ? (
        <motion.aside
          key="elaboration"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.2 }}
          className="w-full rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-[12px] leading-5 text-foreground/85"
        >
          <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-primary uppercase">
            <Sparkles className="size-3" />
            Kaya's take
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
          className="w-full text-[11px] text-muted-foreground"
        >
          {error}
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}

function slugifyTest(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
