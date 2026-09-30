import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import {
  addReliefLog,
  RELIEF_NOTE_MAX,
  type ReliefFit,
  type SessionForm,
  type SessionTimeOfDay,
  type SideEffect,
  SIDE_EFFECT_OPTIONS,
} from "@/lib/relief-log";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const FITS: { value: ReliefFit; label: string }[] = [
  { value: "too-weak", label: "Too weak" },
  { value: "just-right", label: "Just right" },
  { value: "too-strong", label: "Too strong" },
];

const FORMS: { value: SessionForm; label: string }[] = [
  { value: "flower", label: "Flower" },
  { value: "cart", label: "Cart" },
  { value: "edible", label: "Edible" },
  { value: "tincture", label: "Tincture" },
];

const TIME_OF_DAY: { value: SessionTimeOfDay; label: string }[] = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
  { value: "night", label: "Night" },
];

const SIDE_EFFECT_LABELS: Record<SideEffect, string> = {
  anxiety: "Anxiety",
  paranoia: "Paranoia",
  "dry-mouth": "Dry mouth",
  drowsiness: "Drowsiness",
  "racing-heart": "Racing heart",
  nausea: "Nausea",
  headache: "Headache",
};

export function ReliefLogButton({
  strainName,
  conditions = [],
  variant = "link",
}: {
  strainName: string;
  conditions?: string[];
  /** "link" is the inline trigger used in lists; "button" is the full-width
   * trigger used on the strain detail page (matches iOS ReliefLogForm). */
  variant?: "link" | "button";
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Core (always-visible) fields.
  const [fit, setFit] = useState<ReliefFit>("just-right");
  const [rating, setRating] = useState(0);
  const [relief, setRelief] = useState(4);
  const [note, setNote] = useState("");
  const [extraCondition, setExtraCondition] = useState("");

  // Session-journal fields (behind the disclosure).
  const [form, setForm] = useState<SessionForm | null>(null);
  const [doseMg, setDoseMg] = useState<string>("");
  const [timeOfDay, setTimeOfDay] = useState<SessionTimeOfDay | null>(null);
  const [onsetMinutes, setOnsetMinutes] = useState<string>("");
  const [sideEffects, setSideEffects] = useState<SideEffect[]>([]);
  const [wouldRepeat, setWouldRepeat] = useState<boolean | null>(null);

  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const toggleSideEffect = (effect: SideEffect) => {
    setSideEffects((current) =>
      current.includes(effect)
        ? current.filter((e) => e !== effect)
        : [...current, effect],
    );
  };

  const reset = () => {
    setOpen(false);
    setNote("");
    setRating(0);
    setExtraCondition("");
    setShowDetails(false);
    setForm(null);
    setDoseMg("");
    setTimeOfDay(null);
    setOnsetMinutes("");
    setSideEffects([]);
    setWouldRepeat(null);
  };

  const save = async () => {
    setBusy(true);
    try {
      const merged = [
        ...conditions,
        ...(extraCondition.trim() ? [extraCondition.trim()] : []),
      ];
      const parsedDose = doseMg.trim() ? Number(doseMg) : undefined;
      const parsedOnset = onsetMinutes.trim()
        ? Number(onsetMinutes)
        : undefined;

      await addReliefLog(user.uid, {
        strainName,
        conditions: merged,
        fit,
        rating,
        relief,
        note,
        form: form ?? undefined,
        doseMg: Number.isFinite(parsedDose) ? parsedDose : undefined,
        timeOfDay: timeOfDay ?? undefined,
        onsetMinutes: Number.isFinite(parsedOnset) ? parsedOnset : undefined,
        sideEffects: sideEffects.length > 0 ? sideEffects : undefined,
        wouldRepeat: wouldRepeat ?? undefined,
      });
      toast("Logged. Next search will remember this.");
      reset();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save the log.");
    } finally {
      setBusy(false);
    }
  };

  // On the strain detail page (variant "button") the logging
  // experience card is always expanded — no "How did this go?" toggle,
  // matching iOS. The inline "link" variant used in the Saved panel
  // keeps its expand/collapse trigger.
  const expanded = variant === "button" || open;

  return (
    <div>
      {variant === "link" && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="cursor-pointer text-xs font-medium text-primary hover:underline"
        >
          {open ? "Cancel" : "How did this go?"}
        </button>
      )}
      {expanded && (
        <div
          className={cn(
            "space-y-3 p-3",
            variant === "link"
              ? "rounded-xl border border-border/70 bg-background mt-3"
              : "pt-3",
          )}
        >
          <div className="flex flex-wrap gap-1.5">
            {FITS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFit(opt.value)}
                className={cn(
                  "cursor-pointer rounded-full border px-2.5 py-1 text-xs",
                  fit === opt.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/70 text-muted-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div
            className="space-y-1"
            role="radiogroup"
            aria-label="Relief rating"
          >
            <p className="text-xs text-muted-foreground">Relief {relief}/5</p>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }, (_, index) => {
                const segment = index + 1;
                const selected = segment <= relief;
                return (
                  <button
                    key={segment}
                    type="button"
                    role="radio"
                    aria-checked={segment === relief}
                    aria-label={`Relief ${segment} out of 5`}
                    onClick={() => setRelief(segment)}
                    className="flex size-9 cursor-pointer items-center justify-center rounded-full"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "size-3.5 rounded-full border",
                        selected
                          ? "border-primary bg-primary"
                          : "border-border bg-card",
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, RELIEF_NOTE_MAX))}
            placeholder="Optional note — e.g. slept 6 hours"
            className="h-8"
            maxLength={RELIEF_NOTE_MAX}
          />
          {conditions.length === 0 && (
            <Input
              value={extraCondition}
              onChange={(e) => setExtraCondition(e.target.value)}
              placeholder="What did you use it for? (e.g. insomnia)"
              className="h-8"
            />
          )}

          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="flex cursor-pointer items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {showDetails ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
            {showDetails ? "Hide session details" : "Add session details"}
          </button>

          {showDetails && (
            <div className="space-y-3 rounded-xl border border-border/60 bg-card/50 p-3">
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Form</p>
                <div className="flex flex-wrap gap-1.5">
                  {FORMS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setForm((current) =>
                          current === opt.value ? null : opt.value,
                        )
                      }
                      className={cn(
                        "cursor-pointer rounded-full border px-2.5 py-1 text-xs",
                        form === opt.value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/70 text-muted-foreground",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1 text-xs text-muted-foreground">
                  Dose (mg THC)
                </p>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={500}
                  value={doseMg}
                  onChange={(e) => setDoseMg(e.target.value)}
                  placeholder="e.g. 5"
                  className="h-8"
                />
              </div>

              <div>
                <p className="mb-1 text-xs text-muted-foreground">
                  Time of day
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {TIME_OF_DAY.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setTimeOfDay((current) =>
                          current === opt.value ? null : opt.value,
                        )
                      }
                      className={cn(
                        "cursor-pointer rounded-full border px-2.5 py-1 text-xs",
                        timeOfDay === opt.value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/70 text-muted-foreground",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1 text-xs text-muted-foreground">
                  Onset (minutes)
                </p>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={240}
                  value={onsetMinutes}
                  onChange={(e) => setOnsetMinutes(e.target.value)}
                  placeholder="e.g. 15"
                  className="h-8"
                />
              </div>

              <div>
                <p className="mb-1 text-xs text-muted-foreground">
                  Side effects (optional)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SIDE_EFFECT_OPTIONS.map((effect) => {
                    const selected = sideEffects.includes(effect);
                    return (
                      <button
                        key={effect}
                        type="button"
                        onClick={() => toggleSideEffect(effect)}
                        className={cn(
                          "cursor-pointer rounded-full border px-2.5 py-1 text-xs",
                          selected
                            ? "border-amber-500 bg-amber-500 text-white"
                            : "border-border/70 text-muted-foreground",
                        )}
                      >
                        {SIDE_EFFECT_LABELS[effect]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-1 text-xs text-muted-foreground">
                  Would you try this strain again?
                </p>
                <div className="flex gap-1.5">
                  {[
                    { value: true, label: "Yes" },
                    { value: false, label: "No" },
                  ].map((opt) => (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() =>
                        setWouldRepeat((current) =>
                          current === opt.value ? null : opt.value,
                        )
                      }
                      className={cn(
                        "cursor-pointer rounded-full border px-2.5 py-1 text-xs",
                        wouldRepeat === opt.value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/70 text-muted-foreground",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <Button
            type="button"
            size="sm"
            className="cursor-pointer rounded-full"
            disabled={busy}
            onClick={() => void save()}
          >
            Save log
          </Button>
        </div>
      )}
    </div>
  );
}
