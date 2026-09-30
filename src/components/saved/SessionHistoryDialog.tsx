import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import {
  deleteReliefLog,
  RELIEF_NOTE_MAX,
  type ReliefLog,
  type SideEffect,
} from "@/lib/relief-log";
import { CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const SIDE_EFFECT_LABELS: Record<SideEffect, string> = {
  anxiety: "Anxiety",
  paranoia: "Paranoia",
  "dry-mouth": "Dry mouth",
  drowsiness: "Drowsiness",
  "racing-heart": "Racing heart",
  nausea: "Nausea",
  headache: "Headache",
};

const FIT_LABEL: Record<ReliefLog["fit"], string> = {
  "too-strong": "Too strong",
  "just-right": "Just right",
  "too-weak": "Too weak",
};

const TIME_OF_DAY_LABEL: Record<NonNullable<ReliefLog["timeOfDay"]>, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
};

const FORM_LABEL: Record<NonNullable<ReliefLog["form"]>, string> = {
  flower: "Flower",
  cart: "Cart",
  edible: "Edible",
  tincture: "Tincture",
};

/**
 * Full history of the signed-in user's relief-log sessions. Opens
 * from the Saved panel + Account page. Renders newest-first, with
 * the session-journal fields (form, dose, time-of-day, onset,
 * side effects, would-repeat) shown when present.
 *
 * Edit / re-log is intentionally not supported — sessions are an
 * honest record, you append a new one if you change your mind.
 * Deletion is exposed so a patient can wipe a stray entry.
 */
export function SessionHistoryDialog({
  open,
  onOpenChange,
  logs,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logs: ReliefLog[];
  onDeleted?: () => void;
}) {
  const { user } = useAuth();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  if (!user) return null;

  const remove = async (logId: string) => {
    setPendingDelete(logId);
    try {
      await deleteReliefLog(user.uid, logId);
      toast("Session removed.");
      onDeleted?.();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Could not remove the session.",
      );
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Your session journal</DialogTitle>
          <DialogDescription>
            Every time you logged how a strain worked. Newest first.
          </DialogDescription>
        </DialogHeader>

        {logs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border/70 bg-card/40 p-6 text-center text-sm text-muted-foreground">
            No sessions logged yet. Tap "How did this go?" on a strain page to
            add the first one.
          </p>
        ) : (
          <ul className="space-y-3">
            {logs.map((log) => (
              <li
                key={log.id}
                className="rounded-xl border border-border/70 bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {log.strainName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString([], {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void remove(log.id)}
                    disabled={pendingDelete === log.id}
                    className="cursor-pointer rounded-full p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-50"
                    aria-label="Remove session"
                  >
                    {pendingDelete === log.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                  <span className="rounded-full border border-border/70 bg-background px-2 py-0.5">
                    {FIT_LABEL[log.fit]}
                  </span>
                  <span className="rounded-full border border-border/70 bg-background px-2 py-0.5">
                    Relief {log.relief}/5
                  </span>
                  {log.rating && log.rating > 0 ? (
                    <span className="rounded-full border border-border/70 bg-background px-2 py-0.5">
                      Rating {log.rating}/5
                    </span>
                  ) : null}
                  {log.form ? (
                    <span className="rounded-full border border-border/70 bg-background px-2 py-0.5">
                      {FORM_LABEL[log.form]}
                    </span>
                  ) : null}
                  {typeof log.doseMg === "number" ? (
                    <span className="rounded-full border border-border/70 bg-background px-2 py-0.5">
                      {log.doseMg} mg
                    </span>
                  ) : null}
                  {log.timeOfDay ? (
                    <span className="rounded-full border border-border/70 bg-background px-2 py-0.5">
                      {TIME_OF_DAY_LABEL[log.timeOfDay]}
                    </span>
                  ) : null}
                  {typeof log.onsetMinutes === "number" ? (
                    <span className="rounded-full border border-border/70 bg-background px-2 py-0.5">
                      Onset {log.onsetMinutes}m
                    </span>
                  ) : null}
                  {log.wouldRepeat === true ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="size-3" />
                      Would repeat
                    </span>
                  ) : null}
                  {log.wouldRepeat === false ? (
                    <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-300">
                      Wouldn't repeat
                    </span>
                  ) : null}
                </div>

                {log.sideEffects && log.sideEffects.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                    {log.sideEffects.map((effect) => (
                      <span
                        key={effect}
                        className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-300"
                      >
                        {SIDE_EFFECT_LABELS[effect]}
                      </span>
                    ))}
                  </div>
                ) : null}

                {log.conditions.length > 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    For: {log.conditions.join(", ")}
                  </p>
                ) : null}

                {log.note ? (
                  <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                    {log.note.slice(0, RELIEF_NOTE_MAX)}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
