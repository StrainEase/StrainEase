export const TYPE_LABEL: Record<string, string> = {
  indica: "Indica",
  sativa: "Sativa",
  hybrid: "Hybrid",
};

export const CONDITIONS = [
  "Chronic pain",
  "Anxiety",
  "Insomnia",
  "Depression",
  "Nausea & appetite",
  "Inflammation",
  "Migraine",
  "Muscle spasm",
  "PTSD",
  "Fatigue",
  "Arthritis",
  "Stress",
];

export function typeBadgeClass(type: string): string {
  switch (type) {
    case "indica":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "sativa":
      return "bg-sky-500/10 text-sky-700 dark:text-sky-400";
    default:
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  }
}
