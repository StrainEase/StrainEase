import { Input } from "@/components/ui/input";
import { MedicationAutocomplete } from "@/components/ui/MedicationAutocomplete";
import { StrainAutocomplete } from "@/components/ui/StrainAutocomplete";
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
  defaultTriedStrains = [],
  defaultMedications = [],
  onTriedStrainsChange,
  onMedicationsChange,
}: {
  prefs: ResearchPrefs;
  onChange: (next: ResearchPrefs) => void;
  startAt?: number;
  defaultTriedStrains?: { name: string; type: string; thc: string }[];
  defaultMedications?: string[];
  onTriedStrainsChange?: (items: { name: string; type: string; thc: string }[]) => void;
  onMedicationsChange?: (items: string[]) => void;
}) {
  const set = (patch: Partial<ResearchPrefs>) =>
    onChange({ ...prefs, ...patch });

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
          {startAt + 4} · Other strains I&apos;ve tried
        </p>
        <StrainAutocomplete
          value={defaultTriedStrains}
          onChange={onTriedStrainsChange ?? (() => {})}
          placeholder="Search strains you&apos;ve tried…"
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          Help Kaya understand what has and hasn&apos;t worked for you.
        </p>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {startAt + 5} · Other medications
        </p>
        <MedicationAutocomplete
          value={defaultMedications}
          onChange={onMedicationsChange ?? (() => {})}
          placeholder="Add a medication…"
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
