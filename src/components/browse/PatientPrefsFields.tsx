import { Input } from "@/components/ui/input";
import { MedicationAutocomplete } from "@/components/ui/MedicationAutocomplete";
import { StrainAutocomplete } from "@/components/ui/StrainAutocomplete";
import { Pill, Sparkles } from "lucide-react";
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

/**
 * Optional context cards. When set, render inside their matching
 * section (yellow gradient inside the THC sensitivity section,
 * blue gradient inside the Medications section) so the user can see
 * what's coming from their saved profile.
 */
type ProfileChipContext = {
  /** Saved-on-profile THC sensitivity (label rendered amber/yellow). */
  sensitivity?: { value: ThcSensitivity; label: string } | null;
  /** Names of medications saved on the user's profile (rendered blue). */
  medications?: string[];
};

export function PatientPrefsFields({
  prefs,
  onChange,
  startAt = 3,
  defaultTriedStrains = [],
  defaultMedications = [],
  onTriedStrainsChange,
  onMedicationsChange,
  profileContext,
}: {
  prefs: ResearchPrefs;
  onChange: (next: ResearchPrefs) => void;
  startAt?: number;
  defaultTriedStrains?: { name: string; type: string; thc: string }[];
  defaultMedications?: string[];
  onTriedStrainsChange?: (items: { name: string; type: string; thc: string }[]) => void;
  onMedicationsChange?: (items: string[]) => void;
  profileContext?: ProfileChipContext;
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
        {profileContext?.sensitivity &&
          prefs.thcSensitivity === profileContext.sensitivity.value && (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500/10 via-yellow-400/10 to-amber-500/10 px-3 py-2 text-xs">
              <Sparkles className="size-3 text-amber-600" />
              <span className="text-muted-foreground">
                Using your saved sensitivity:{" "}
                <span className="font-medium text-amber-700">
                  {profileContext.sensitivity.label}
                </span>
              </span>
            </div>
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
          {startAt + 5} · Medications
        </p>
        {profileContext?.medications &&
          profileContext.medications.length > 0 &&
          prefs.medications && (
            <div className="mb-2 flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500/10 to-indigo-500/10 px-3 py-2 text-xs">
              <Pill className="size-3 text-blue-600" />
              <span className="text-muted-foreground">
                Using your saved medications:{" "}
                <span className="font-medium text-blue-700">
                  {profileContext.medications.slice(0, 3).join(", ")}
                  {profileContext.medications.length > 3 &&
                    ` +${profileContext.medications.length - 3} more`}
                </span>
              </span>
            </div>
          )}
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
