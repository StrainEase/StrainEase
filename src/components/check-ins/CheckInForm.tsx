// Form for today's check-in. Four 1-5 scales, optional note, and a
// "Clear" affordance so the patient can wipe the day if they logged
// by mistake. Mirrors the iOS `CheckInForm` shape that the Android
// port will follow.

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import {
  CHECKIN_NOTE_MAX,
  deleteCheckIn,
  isTodayKey,
  normalizeMetrics,
  todayKey,
  upsertTodayCheckIn,
  type CheckIn,
  type CheckInMetrics,
} from "@/lib/check-ins";
import { cn } from "@/lib/utils";
import { Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

const SCALES: {
  key: keyof CheckInMetrics;
  label: string;
  hint: string;
  highIsGood: boolean;
}[] = [
  { key: "mood", label: "Mood", hint: "1 = awful, 5 = great", highIsGood: true },
  { key: "sleep", label: "Sleep", hint: "1 = none, 5 = fully rested", highIsGood: true },
  { key: "pain", label: "Pain", hint: "1 = none, 5 = severe", highIsGood: false },
  { key: "anxiety", label: "Anxiety", hint: "1 = calm, 5 = severe", highIsGood: false },
];

const DEFAULT_METRICS: CheckInMetrics = {
  mood: 3,
  sleep: 3,
  pain: 3,
  anxiety: 3,
};

function scaleColor(value: number, highIsGood: boolean): string {
  // For high-is-good (mood, sleep) — green at 5, red at 1.
  // For high-is-bad (pain, anxiety) — red at 5, green at 1.
  const goodEnd = highIsGood ? 5 : 1;
  const distance = Math.abs(value - goodEnd);
  if (distance <= 1) return "bg-emerald-500";
  if (distance <= 2) return "bg-amber-500";
  return "bg-rose-500";
}

export function CheckInForm({
  today,
  onSaved,
}: {
  today: CheckIn | null;
  onSaved?: () => void;
}) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<CheckInMetrics>(DEFAULT_METRICS);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  // When the Firestore listener hands us today's doc, hydrate the form.
  useEffect(() => {
    if (!today) {
      setMetrics(DEFAULT_METRICS);
      setNote("");
      return;
    }
    setMetrics(today.metrics);
    setNote(today.note);
  }, [today?.id, today?.updatedAt]);

  if (!user) return null;

  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await upsertTodayCheckIn(user.uid, {
        metrics: normalizeMetrics(metrics),
        note,
      });
      toast("Check-in saved.");
      onSaved?.();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save the check-in.");
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    if (!today) return;
    if (busy) return;
    if (!confirm("Clear today's check-in?")) return;
    setBusy(true);
    try {
      await deleteCheckIn(user.uid, today.id);
      toast("Cleared.");
      onSaved?.();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not clear the check-in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Today's check-in
        </p>
        <p className="text-[11px] text-muted-foreground">
          {today
            ? `Logged ${today.updatedAt ? new Date(today.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "today"}`
            : `Date key: ${todayKey()}`}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {SCALES.map((scale) => {
          const value = metrics[scale.key];
          return (
            <div
              key={scale.key}
              className="rounded-xl border border-border/70 bg-background p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor={`checkin-${scale.key}`}
                  className="text-sm font-semibold tracking-tight"
                >
                  {scale.label}
                </label>
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full text-xs font-semibold text-white",
                    scaleColor(value, scale.highIsGood),
                  )}
                  aria-label={`${scale.label} ${value} of 5`}
                >
                  {value}
                </span>
              </div>
              <input
                id={`checkin-${scale.key}`}
                type="range"
                min={1}
                max={5}
                step={1}
                value={value}
                onChange={(e) =>
                  setMetrics((m) => ({ ...m, [scale.key]: Number(e.target.value) }))
                }
                className="mt-2 w-full cursor-pointer accent-primary"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                {scale.hint}
              </p>
            </div>
          );
        })}
      </div>

      <div>
        <label
          htmlFor="checkin-note"
          className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Note (optional)
        </label>
        <Textarea
          id="checkin-note"
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, CHECKIN_NOTE_MAX))}
          placeholder="Anything that shaped today — a bad night, a busy day, a new med…"
          className="mt-1.5 min-h-[72px] resize-none"
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          {note.length} / {CHECKIN_NOTE_MAX}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={() => void save()}
          disabled={busy}
          className="cursor-pointer rounded-full"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {today ? "Update today" : "Save today"}
        </Button>
        {today && isTodayKey(today.id) && (
          <Button
            type="button"
            variant="outline"
            onClick={() => void clear()}
            disabled={busy}
            className="cursor-pointer rounded-full text-muted-foreground"
          >
            <Trash2 className="size-4" />
            Clear today
          </Button>
        )}
      </div>
    </div>
  );
}
