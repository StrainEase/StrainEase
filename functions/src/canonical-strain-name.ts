/**
 * Canonical strain-name formatting — server-side source of truth.
 *
 * Single source of truth for strain name casing so the web/iOS/Android
 * clients can render `strain.name` straight from the API payload and
 * stay in lockstep with each other. Previously each platform had its
 * own defensive re-caser; the canonical-name lookup now lives here.
 *
 *   "blue dream"        → "Blue Dream"
 *   "grand-daddy purple"→ "Grand-Daddy Purple"
 *   "og kush"           → "OG Kush"
 *   "9 pound hammer"    → "9 Pound Hammer"
 *   "northern lights"   → "Northern Lights"
 *   "gg4"               → "GG4"
 *   "gorilla glue gg4"  → "Gorilla Glue GG4"
 *   "spk"               → "SPK"   (Sour Patch Kids)
 *
 * Two layers:
 *   - `canonicalStrainName(slug, fallback)`: pure title-case
 *     normaliser. Used as the fallback when no canonical record
 *     exists (AI-researched / user-saved strains outside the catalog).
 *   - `canonicalProfileName(...)`: looks up the catalog (Leafly /
 *     popular-list Firestore cache) by slug; if a record is found the
 *     catalog's `name` wins; otherwise it falls back to the title-case
 *     normaliser so an unknown strain still renders sensibly.
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
 * Kept tight on purpose — we only want to preserve casing for words
 * that are conventionally rendered as acronyms, not for ordinary short
 * words like "haze" or "kush". The acronym-with-number pattern below
 * (e.g. "GG4") uses this same set for its letter prefix. Add new
 * entries here when we see them in the wild.
 *
 * NOTE: kept in sync with `src/lib/title-case.ts` on web. If you add
 * an entry on one side, add it on the other until the client-side
 * re-caser is fully removed.
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
  "spk",
  "gmo",
  "mac",
  "fpog",
  "ak",
  "rs",
  "mk",
]);

/**
 * Pure title-case normaliser for a strain name string. Falls back
 * gracefully when the input is nullish / empty.
 */
export function canonicalStrainName(
  input: string | null | undefined,
): string {
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

/**
 * Slug normalisation so that "Blue Dream", "blue-dream", and
 * "Blue  Dream" all resolve to the same canonical record. Mirrors
 * `slugify` in the clients but kept dependency-free.
 */
function slug(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Catalog lookup table — keyed by slug, value is the canonical display
 * name. Populated by `registerCatalogName(slug, name)` so callers can
 * pass whatever catalog they have on hand (popular-list cache, seed
 * JSON, etc.) without this module having to know about Firestore.
 *
 * Reads are case- and whitespace-insensitive via `slug()`.
 */
const catalogBySlug = new Map<string, string>();

/**
 * Register a canonical strain display name against its slug. Idempotent
 * — repeated registrations of the same slug with the same name are a
 * no-op; mismatches log a warning and the first registration wins so
 * a bad seed entry can't silently override the catalog.
 */
export function registerCatalogName(slugKey: string, name: string): void {
  if (!slugKey || !name) return;
  const key = slug(slugKey);
  if (!key) return;
  const existing = catalogBySlug.get(key);
  if (existing !== undefined && existing !== name) {
    // Two sources disagree on the canonical name. Keep the first one
    // and surface the conflict so it can be investigated; don't let
    // it silently flip back and forth.
    console.warn(
      `[canonical-strain-name] catalog name conflict for slug "${key}": kept "${existing}", ignored "${name}"`,
    );
    return;
  }
  catalogBySlug.set(key, name);
}

/** Test-only: clear the catalog. Never call from production. */
export function _resetCatalogForTests(): void {
  catalogBySlug.clear();
}

/**
 * Look up the canonical display name for a strain. If the slug matches
 * a registered catalog entry that name wins. Otherwise the input is
 * normalised via `canonicalStrainName` so unknown strains still render
 * sensibly.
 *
 * `fallback` defaults to `input` when no value is supplied.
 */
export function canonicalProfileName(
  input: string,
  fallback?: string,
): string {
  if (!input) return canonicalStrainName(fallback ?? "");
  const trimmed = input.trim();
  if (!trimmed) return canonicalStrainName(fallback ?? "");

  const key = slug(trimmed);
  if (key) {
    const registered = catalogBySlug.get(key);
    if (registered !== undefined) return registered;
  }

  return canonicalStrainName(fallback ?? input);
}
