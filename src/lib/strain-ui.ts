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
      return "bg-amber-500/10 text-amber-700";
    case "sativa":
      return "bg-sky-500/10 text-sky-700";
    default:
      return "bg-emerald-500/10 text-emerald-700";
  }
}
