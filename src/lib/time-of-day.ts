/**
 * Time-of-day headline copy for the home page.
 *
 * The hero sentence rotates through a few phrases depending on the user's
 * local hour. A new phrase is picked per page load, so refreshing (or
 * returning later) surfaces a slightly different vibe. The bucket is
 * deterministic so the user does not see copy that conflicts with the
 * state of the catalogue (e.g. "wind down" suggestions in the morning).
 *
 * The hour is read from the user's local timezone via Date, which is fine
 * for a marketing headline — we don't need to know the user's precise
 * location, just what part of the day it feels like. Greeting is in
 * Title Case with a soft verb to invite the patient to take their
 * time choosing.
 */
export type DayPart = "morning" | "afternoon" | "evening" | "night";

export function dayPartFor(date: Date = new Date()): DayPart {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 22) return "evening";
  return "night";
}

const HEADLINES: Record<DayPart, string[]> = {
  morning: [
    "Ease into the day with the right strain",
    "Find a strain that fits your morning",
    "Start the day a little softer",
  ],
  afternoon: [
    "Find a strain that fits the afternoon",
    "Something steady for the middle of the day",
    "Pick a strain that keeps you even-keeled",
  ],
  evening: [
    "Find a strain that fits tonight",
    "Wind down with the right strain",
    "Settle in — pick a strain for the evening",
  ],
  night: [
    "Find a strain that fits the late hour",
    "Quiet the day with the right strain",
    "Pick a strain for a calmer night",
  ],
};

/**
 * Pick a deterministic-per-day headline so the banner does not jitter on
 * every re-render. Same calendar day = same headline, same daypart bucket.
 */
export function timeOfDayHeadline(date: Date = new Date()): string {
  const part = dayPartFor(date);
  const pool = HEADLINES[part];
  const dayIndex = Math.floor(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
      Date.UTC(2024, 0, 1)) /
      (24 * 60 * 60 * 1000),
  );
  return pool[dayIndex % pool.length]!;
}

export const TIME_OF_DAY_SUBTITLE =
  "Popular picks, symptoms, and phenotypes — tap See more for the full grid.";
