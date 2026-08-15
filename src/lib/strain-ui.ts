export const TYPE_LABEL: Record<string, string> = {
  indica: "Indica",
  sativa: "Sativa",
  hybrid: "Hybrid",
};

export const CONDITIONS = [
  "Chronic pain",
  "Anxiety",
  "OCD",
  "ADHD",
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

/** Extra medical-use labels that count when browsing a chip. */
export const CONDITION_ALIASES: Record<string, string[]> = {
  OCD: ["Anxiety"],
  ADHD: ["ADD/ADHD", "ADD"],
};

export function conditionMatchKeys(ailment: string): string[] {
  const key = ailment.trim().toLowerCase();
  const label =
    CONDITIONS.find((item) => item.toLowerCase() === key) ?? ailment.trim();
  const extras = CONDITION_ALIASES[label] ?? [];
  return [label, ...extras].map((item) => item.toLowerCase());
}

export function matchesCondition(
  uses: string[] | undefined,
  ailment: string,
): boolean {
  if (!uses?.length) return false;
  const keys = conditionMatchKeys(ailment);
  return uses.some((use) => keys.includes(use.toLowerCase()));
}

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
