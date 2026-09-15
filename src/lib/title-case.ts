/**
 * Render a strain name in title case so the web surface stays in step
 * with iOS (which always shows "Banana OG" rather than "banana og" or
 * "BANANA OG"). We keep small connector words lowercase — except when
 * they lead the name — to match the way dispensaries and patients
 * write strain names by hand:
 *
 *   "blue dream"        → "Blue Dream"
 *   "grand-daddy purple"→ "Grand-Daddy Purple"
 *   "og kush"           → "OG Kush"
 *   "9 pound hammer"    → "9 Pound Hammer"
 *   "northern lights"   → "Northern Lights"
 *   "gg4"               → "GG4"
 *   "gorilla glue gg4"  → "Gorilla Glue GG4"
 *
 * Inputs are typically already correct from the catalog or Leafly; this
 * is a defensive normalisation for AI-researched and user-saved names.
 */
const LOWERCASE_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "but",
  "by",
  "for",
  "in",
  "nor",
  "of",
  "on",
  "or",
  "the",
  "to",
  "vs",
  "with",
]);

/**
 * Strain-name acronyms that patients and dispensaries write in all caps.
 * Kept tight on purpose — we only want to preserve casing for words that
 * are conventionally rendered as acronyms, not for ordinary short words
 * like "haze" or "kush". The acronym-with-number pattern below (e.g.
 * "GG4") uses this same set for its letter prefix. Add new entries here
 * when we see them in the wild.
 */
const STRAIN_ACRONYMS = new Set([
  "og",
  "thc",
  "cbd",
  "cbg",
  "cbn",
  "thcv",
  "hhc",
  "hso",
  "sfv",
  "gg",
  "gdp",
  "gsc",
  // Strain-name acronyms that show up in dispensary menus, AI-researched
  // names, and the Leafly/Allbud catalog. SPK (Sour Patch Kids) is the one
  // we keep missing in the wild — keep this list populated as new ones
  // surface.
  "spk", // Sour Patch Kids
  "gmo", // Garlic / Mushroom / Onion ("GMO Cookies")
  "mac", // Miracle Alien Cookies ("MAC", "Mac 1")
  "fpog", // Fruity Pebbles OG
  "ak", // AK-47 (so "AK-47" renders as "AK-47" not "Ak-47")
  "rs", // RS11 (so "RS11" renders as "RS11" not "Rs11")
  "mk", // MK Ultra
]);

export function toTitleCase(input: string | null | undefined): string {
  if (!input) return "";
  const trimmed = input.trim();
  if (!trimmed) return "";

  // Split on whitespace, keeping hyphenated pieces (e.g. "Grand-Daddy")
  // and acronyms (e.g. "OG") intact by title-casing each part.
  const tokens = trimmed.split(/(\s+|-)/);
  let wordIndex = 0;

  return tokens
    .map((token) => {
      // Whitespace or hyphen separators pass through unchanged.
      if (/^[\s-]+$/.test(token)) return token;

      // Pure-number tokens (e.g. "9" in "9 Pound Hammer") pass through
      // unchanged — they don't have a "case" to shift.
      if (/^\d+[a-zA-Z]*$/.test(token)) {
        wordIndex += 1;
        return token;
      }

      const lower = token.toLowerCase();
      const isFirstOrLast = wordIndex === 0;

      // Acronym + number pattern (e.g. "GG4", "OG1", "HHC8"). When the
      // letter prefix is a known strain acronym we uppercase the letters
      // and keep the digits verbatim, so "gg4", "GG4", and "Gg4" all
      // normalise to "GG4".
      const acronymNumber = token.match(/^([a-zA-Z]+)(\d+.*)$/);
      if (acronymNumber) {
        const [, letters, tail] = acronymNumber;
        if (STRAIN_ACRONYMS.has(letters.toLowerCase())) {
          wordIndex += 1;
          return letters.toUpperCase() + tail;
        }
      }

      // Known strain acronyms preserve their original casing ("OG" not
      // "Og"). We always emit the uppercased form so the result is stable
      // regardless of how the catalog or AI returned the name.
      if (STRAIN_ACRONYMS.has(lower)) {
        wordIndex += 1;
        return token.toUpperCase();
      }

      if (!isFirstOrLast && LOWERCASE_WORDS.has(lower)) {
        wordIndex += 1;
        return lower;
      }

      wordIndex += 1;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");
}
