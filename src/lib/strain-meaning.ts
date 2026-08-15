import type { StrainProfile } from "./strain-profile";

const TERPENE_MEANING: Record<string, string> = {
  myrcene: "Earthy. Often linked with body heaviness and easier sleep.",
  limonene: "Citrus. Commonly described as mood-lifting and daytime-friendly.",
  caryophyllene: "Peppery. Patients often mention it for stress and body tension.",
  pinene: "Pine. Associated with a clearer, more alert head.",
  linalool: "Floral. Frequently reported as calming.",
  terpinolene: "Herbal-citrus. Often a brighter, more stimulating profile.",
  humulene: "Hoppy. Sometimes noted as appetite-dampening.",
  ocimene: "Sweet-herbal. Usually described as uplifting.",
};

export function terpeneMeaning(name: string): string | undefined {
  return TERPENE_MEANING[name.trim().toLowerCase()];
}

const NIGHT_EFFECTS = new Set([
  "sleepy",
  "relaxed",
  "sedated",
  "hungry",
  "tingly",
]);
const DAY_EFFECTS = new Set([
  "energetic",
  "focused",
  "uplifted",
  "creative",
  "talkative",
  "happy",
]);

/** 0 = firmly night, 100 = firmly day. */
export function dayNightScore(strain: StrainProfile): number {
  let day = 0;
  let night = 0;
  for (const effect of strain.effects ?? []) {
    const key = effect.name.toLowerCase();
    const weight = Math.max(1, effect.intensity);
    if (DAY_EFFECTS.has(key)) day += weight;
    if (NIGHT_EFFECTS.has(key)) night += weight;
  }
  if (strain.type === "indica") night += 2;
  if (strain.type === "sativa") day += 2;
  const total = day + night;
  if (total === 0) return 50;
  return Math.round((day / total) * 100);
}

export function dayNightLabel(score: number): string {
  if (score >= 65) return "Better as a daytime strain";
  if (score <= 35) return "Better as an evening strain";
  return "Works either side of the day";
}
