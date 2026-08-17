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
        relief,
        note,
      });
      toast("Logged. Next search will remember this.");
      setOpen(false);
      setNote("");
      setExtraCondition("");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save the log.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {variant === "button" ? (
        <Button
          type="button"
          variant={open ? "outline" : "default"}
          onClick={() => setOpen((v) => !v)}
          className="w-full cursor-pointer rounded-full"
        >
          {open ? "Cancel" : "How did this go?"}
        </Button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="cursor-pointer text-xs font-medium text-primary hover:underline"
        >
          {open ? "Cancel" : "How did this go?"}
        </button>
      )}
      {open && (
        <div className="mt-3 space-y-3 rounded-xl border border-border/70 bg-background p-3">
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
          <label className="block text-xs text-muted-foreground">
            Relief 1–5
            <input
              type="range"
              min={1}
              max={5}
              value={relief}
              onChange={(e) => setRelief(Number(e.target.value))}
              className="mt-1 w-full cursor-pointer"
            />
          </label>
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
