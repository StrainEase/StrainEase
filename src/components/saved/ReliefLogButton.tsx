import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { addReliefLog, type ReliefFit } from "@/lib/relief-log";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useState } from "react";

const FITS: { value: ReliefFit; label: string }[] = [
  { value: "too-weak", label: "Too weak" },
  { value: "just-right", label: "Just right" },
  { value: "too-strong", label: "Too strong" },
];

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
  const [fit, setFit] = useState<ReliefFit>("just-right");
  const [rating, setRating] = useState(0);
  const [relief, setRelief] = useState(4);
  const [note, setNote] = useState("");
  const [extraCondition, setExtraCondition] = useState("");
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const save = async () => {
    setBusy(true);
    try {
      const merged = [
        ...conditions,
        ...(extraCondition.trim() ? [extraCondition.trim()] : []),
      ];
      await addReliefLog(user.uid, {
        strainName,
        conditions: merged,
        fit,
        rating,
        relief,
        note,
      });
      toast("Logged. Next search will remember this.");
      setOpen(false);
      setNote("");
      setRating(0);
      setExtraCondition("");
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
            "space-y-3 rounded-xl border border-border/70 bg-background p-3",
            variant === "link" && "mt-3",
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
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note — e.g. slept 6 hours"
            className="h-8"
          />
          {conditions.length === 0 && (
            <Input
              value={extraCondition}
              onChange={(e) => setExtraCondition(e.target.value)}
              placeholder="What did you use it for? (e.g. insomnia)"
              className="h-8"
            />
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
