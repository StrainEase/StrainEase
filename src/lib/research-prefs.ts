// Patient context that shapes a find/compare — time of day, form,
// THC sensitivity, meds they want us to be careful around, strains
// they already have, and one sentence in their own words.

export type TimeOfDay = "morning" | "afternoon" | "night" | "anytime";
export type ConsumeForm = "flower" | "cart" | "edible" | "tincture" | "any";
export type ThcSensitivity = "anxious-high-thc" | "typical" | "experienced";

export type ResearchPrefs = {
  timeOfDay?: TimeOfDay;
  consumeForm?: ConsumeForm;
  thcSensitivity?: ThcSensitivity;
  medications?: string;
  ownedStrains?: string[];
  patientNote?: string;
  reliefSummary?: string;
};

export const TIME_OPTIONS: { value: TimeOfDay; label: string }[] = [
  { value: "anytime", label: "Anytime" },
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "night", label: "Night" },
];

export const FORM_OPTIONS: { value: ConsumeForm; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "flower", label: "Flower" },
  { value: "cart", label: "Cart" },
  { value: "edible", label: "Edible" },
  { value: "tincture", label: "Tincture" },
];

export const SENSITIVITY_OPTIONS: {
  value: ThcSensitivity;
  label: string;
  hint: string;
}[] = [
  {
    value: "typical",
    label: "Typical",
    hint: "Standard THC is fine",
  },
  {
    value: "anxious-high-thc",
    label: "THC-sensitive",
    hint: "High THC can make me anxious",
  },
  {
    value: "experienced",
    label: "Experienced",
    hint: "I tolerate stronger flower",
  },
];

export function compactPrefs(prefs: ResearchPrefs): ResearchPrefs {
  const owned = (prefs.ownedStrains ?? [])
    .map((s) => s.trim())
    .filter((s) => s !== "");
  const medications = prefs.medications?.trim() || undefined;
  const patientNote = prefs.patientNote?.trim() || undefined;
  return {
    timeOfDay:
      prefs.timeOfDay && prefs.timeOfDay !== "anytime"
        ? prefs.timeOfDay
        : undefined,
    consumeForm:
      prefs.consumeForm && prefs.consumeForm !== "any"
        ? prefs.consumeForm
        : undefined,
    thcSensitivity:
      prefs.thcSensitivity && prefs.thcSensitivity !== "typical"
        ? prefs.thcSensitivity
        : undefined,
    medications,
    ownedStrains: owned.length > 0 ? owned : undefined,
    patientNote,
    reliefSummary: prefs.reliefSummary?.trim() || undefined,
  };
}
