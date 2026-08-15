import { Input } from "@/components/ui/input";
import {
  FORM_OPTIONS,
  SENSITIVITY_OPTIONS,
  TIME_OPTIONS,
  type ConsumeForm,
  type ResearchPrefs,
  type ThcSensitivity,
  type TimeOfDay,
} from "@/lib/research-prefs";
import { cn } from "@/lib/utils";

export function PatientPrefsFields({
  prefs,
  onChange,
  startAt = 3,
}: {
  prefs: ResearchPrefs;
  onChange: (next: ResearchPrefs) => void;
  startAt?: number;
}) {
  const set = (patch: Partial<ResearchPrefs>) => onChange({ ...prefs, ...patch });

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {startAt} · When will you use it?
        </p>
        <ChipRow
          options={TIME_OPTIONS}
          value={prefs.timeOfDay ?? "anytime"}
          onChange={(timeOfDay) => set({ timeOfDay })}
        />
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {startAt + 1} · Form
        </p>
        <ChipRow
          options={FORM_OPTIONS}
          value={prefs.consumeForm ?? "any"}
          onChange={(consumeForm) => set({ consumeForm })}
        />
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {startAt + 2} · THC sensitivity
        </p>
        <ChipRow
          options={SENSITIVITY_OPTIONS}
          value={prefs.thcSensitivity ?? "typical"}
          onChange={(thcSensitivity) => set({ thcSensitivity })}
        />
        {prefs.thcSensitivity && prefs.thcSensitivity !== "typical" && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            {
              SENSITIVITY_OPTIONS.find((o) => o.value === prefs.thcSensitivity)
                ?.hint
            }
          </p>
        )}
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {startAt + 3} · In your words (optional)
        </p>
        <Input
          value={prefs.patientNote ?? ""}
          onChange={(e) => set({ patientNote: e.target.value })}
          placeholder="I need to sleep but I have to be up at 7…"
          className="h-9"
        />
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {startAt + 4} · Already have / other meds
        </p>
        <Input
          value={(prefs.ownedStrains ?? []).join(", ")}
          onChange={(e) =>
            set({
              ownedStrains: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          placeholder="Strains you already have — e.g. Blue Dream"
          className="h-9"
        />
        <Input
          value={prefs.medications ?? ""}
          onChange={(e) => set({ medications: e.target.value })}
          placeholder="Other medication we should be careful around"
          className="mt-2 h-9"
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          We never tell you to stop a prescription — only to check with your
          clinician.
        </p>
      </div>
    </div>
  );
}

function ChipRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            value === opt.value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border/70 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export type { ConsumeForm, ThcSensitivity, TimeOfDay };
