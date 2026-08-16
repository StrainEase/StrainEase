import type { StrainProfile } from "./strain-profile";
import { TERPENE_PROFILES } from "./terpenes";

/**
 * Backwards-compatible one-liner for the existing strain card display.
 * Pulls from the curated terpene profile table (see ./terpenes) so web
 * and iOS never drift.
 */
export function terpeneMeaning(name: string): string | undefined {
  return TERPENE_PROFILES[name.trim().toLowerCase()]?.summary;
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
