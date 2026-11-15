// How good is a strain description?
//
// Catalog listings (Leafly directory rows, Weedmaps blurbs, Allbud
// one-liners) carry a single short paragraph. The description we write
// ourselves is 4-6 sentences, roughly 70-110 words. Anything shorter
// than the thresholds below is a blurb, and a blurb is what the patient
// sees under "Full Description" on the strain page.
//
// Kept in its own module with no imports so it can be unit tested
// without pulling in the Firebase-backed modules.

/** Minimum characters for a description to count as full. */
export const RICH_DESCRIPTION_MIN_CHARS = 320;

/** Minimum sentences for a description to count as full. */
export const RICH_DESCRIPTION_MIN_SENTENCES = 3;

/**
 * True when a description is a real, full description rather than a
 * catalog blurb.
 */
export function isRichDescription(text: string | undefined): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (trimmed.length < RICH_DESCRIPTION_MIN_CHARS) return false;
  const sentences = trimmed
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim() !== "");
  return sentences.length >= RICH_DESCRIPTION_MIN_SENTENCES;
}
