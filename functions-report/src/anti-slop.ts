// Anti-slop pass for AI-generated copy.
//
// NOTE: this is a copy of `functions/src/anti-slop.ts`. The two
// codebases deploy separately (see AGENTS.md), so a shared import is
// not an option. Keep the two files in sync.
//
// This codebase uses `cleanSlop` / `cleanSlopObject` only. The report
// summary speaks about the patient to a clinician, so the reader
// address ("the patient" becomes "you") must NOT run there.
//
// Every AI callable in this codebase routes its provider response
// through `extractJsonObject` (functions/src/ai-json.ts), which is the
// one choke point where model prose enters the app. The Kaya system
// prompts already forbid em dashes, but models keep emitting them (and
// a stable set of stock "AI voice" tics) often enough that a prompt
// line alone is not enough. This module is the deterministic pass.
//
// What it does, in order:
//  1. Rewrites em dashes and spaced en dashes into real punctuation, so
//     an aside reads like a sentence instead of a typeset dash.
//  2. Removes stock filler ("it's important to note that", "delve
//     into", "seamless", "moreover", ...) that adds length without
//     adding information.
//  3. Turns third-person references to the reader ("the patient",
//     "the user's") into direct address ("you", "your"), so the copy
//     talks to the person reading it.
//  4. Cleans up the spacing and punctuation the rewrites leave behind.
//
// The pass is deliberately conservative: it never drops a claim, never
// rewrites a number, and never touches a URL. Medical copy that loses
// a qualifier is worse than copy that keeps an em dash, so every
// removal below targets a phrase that carries no meaning on its own.

/* ── Dash handling ───────────────────────────────────────────────── */

/**
 * A dash that sits between two digits is a range or a minus sign
 * ("10-15%", "3-4x"), not an aside. Leave it alone.
 */
const NUMERIC_DASH = /(\d)\s*[\u2014\u2015\u2012]\s*(\d)/g;

/**
 * A spaced en dash is a dash in running text. Unspaced en dashes are
 * ranges ("17-24%") and are left alone.
 */
const SPACED_EN_DASH = /\s+\u2013\s+/g;

/**
 * Rewrite dashes into punctuation.
 *
 * "potency - up to 25%" becomes "potency, up to 25%". A dash that
 * closes a clause with nothing after it becomes a full stop. Dashes
 * between digits are skipped (see NUMERIC_DASH).
 */
export function rewriteDashes(text: string): string {
  const withoutNumeric = text.replace(NUMERIC_DASH, "$1\u0000$2");
  // The whitespace around the dash goes with it, so "Start low —"
  // does not leave a space in front of the comma.
  let out = withoutNumeric.replace(/\s*[\u2014\u2015\u2012]\s*/g, ", ");
  out = out.replace(SPACED_EN_DASH, ", ");
  // A dash that ended the clause left a trailing comma behind.
  out = out.replace(/,\s*([.!?])/g, "$1");
  out = out.replace(/,\s*$/g, ".");
  return out.replace(/\u0000/g, "-");
}

/* ── Stock AI filler ─────────────────────────────────────────────── */

/**
 * Filler phrases that carry no information on their own. Each entry is
 * a phrase plus what should replace it (an empty string removes it).
 * These are matched case-insensitively.
 *
 * The list is short on purpose. A phrase that carries meaning
 * ("in conclusion" aside, every one of these is filler) is left alone
 * when removing it would break the sentence around it.
 */
const SLOP_PHRASES: ReadonlyArray<readonly [string, string]> = [
  ["it(?:'s| is) important to note that\\s+", ""],
  ["it(?:'s| is) worth noting that\\s+", ""],
  ["it(?:'s| is) worth mentioning that\\s+", ""],
  ["needless to say,\\s*", ""],
  ["at the end of the day,\\s*", ""],
  ["in today's (?:fast-paced |increasingly )?(?:world|landscape),\\s*", ""],
  ["in the world of\\s+", ""],
  ["in the realm of\\s+", ""],
  ["a testament to\\s+", ""],
  ["moreover,\\s*", ""],
  ["furthermore,\\s*", ""],
  ["in conclusion,\\s*", ""],
  ["first and foremost,\\s*", ""],
  ["\\bdelve(?:s|d)? into\\s+", ""],
  ["\\bdive(?:s|d)? into\\s+", ""],
  ["\\bnavigat(?:e|es|ing) the\\s+", ""],
  ["\\bleverage\\b", "use"],
  ["\\bseamlessly\\b", "consistently"],
  ["\\bseamless\\b", "consistent"],
  ["\\bholistically\\b", "as a whole"],
  ["\\bholistic\\b", "whole-patient"],
  ["\\bgame[- ]changer\\b", "standout pick"],
  ["\\bmust[- ]try\\b", "worth a try"],
  ["\\bcutting[- ]edge\\b", "current"],
  ["\\bdouble[- ]check\\b", "check"],
];

/**
 * Remove stock AI filler phrases.
 *
 * When a phrase sits at the start of a sentence, the next word is
 * capitalized again, so "Moreover, Sleep helps" becomes "Sleep helps"
 * and not "sleep helps".
 */
export function stripSlopPhrases(text: string): string {
  let out = text;
  let touchedStart = false;
  for (const [phrase, replacement] of SLOP_PHRASES) {
    const re = new RegExp(phrase, "gi");
    out = out.replace(re, (match: string, offset: number) => {
      if (offset === 0) touchedStart = true;
      if (offset === 0 && replacement) {
        return replacement.charAt(0).toUpperCase() + replacement.slice(1);
      }
      return replacement;
    });
  }
  if (touchedStart) {
    out = out.replace(/^([a-z])/, (m: string) => m.toUpperCase());
  }
  return out;
}

/* ── Reader address ──────────────────────────────────────────────── */

/**
 * Third-person references to the person reading the copy.
 *
 * "the patient's saved ailments" becomes "your saved ailments".
 * "the patient" becomes "you". "patients" becomes "people" so a
 * sentence about what people report does not read like a medical
 * chart.
 */
export function addressReader(text: string): string {
  return text
    .replace(/\bthe patient's\b/gi, "your")
    .replace(/\bthe user's\b/gi, "your")
    .replace(/\bthe patient\b/gi, "you")
    .replace(/\bthe user\b/gi, "you")
    .replace(/\bpatients\b/gi, "people");
}

/* ── Cleanup ─────────────────────────────────────────────────────── */

/**
 * Fix the punctuation and spacing the rewrites leave behind: doubled
 * commas, a space before a period, runs of spaces, and a lowercase
 * letter that now starts a sentence.
 */
export function tidyPunctuation(text: string): string {
  let out = text;
  // Space before closing punctuation.
  out = out.replace(/\s+([,.;:!?])/g, "$1");
  // Doubled commas left by a removed phrase.
  out = out.replace(/,\s*,+/g, ",");
  // A comma that now opens a clause after a period.
  out = out.replace(/([.!?])\s*,\s*/g, "$1 ");
  // Runs of spaces, but keep paragraph breaks intact.
  out = out.replace(/[ \t]{2,}/g, " ");
  out = out.replace(/[ \t]+$/gm, "");
  out = out.replace(/^[ \t]+/gm, "");
  // Three or more newlines collapse to a paragraph break.
  out = out.replace(/\n{3,}/g, "\n\n");
  // A leading comma or stray punctuation left by a removed phrase.
  out = out.replace(/^[,;:\s]+/, "");
  // Capitalize the first letter of each sentence. Identifiers are left
  // alone: a URL, a slug, or a single-token value ("blue-dream") is not
  // a sentence, and uppercasing it would break it. A short fragment
  // ("a, b") is left alone for the same reason; only a real sentence
  // gets its first letter raised.
  const identifierLike = out.includes("://") || !/\s/.test(out);
  if (!identifierLike) {
    out = out.replace(/([.!?]\s+)([a-z])/g, (_m, lead: string, ch: string) => {
      return lead + ch.toUpperCase();
    });
    if (out.split(/\s+/).filter(Boolean).length >= 4) {
      out = out.replace(/^([a-z])/, (_m, ch: string) => ch.toUpperCase());
    }
  }
  return out.trim();
}

/**
 * The pass without the reader address: dashes, filler, and punctuation.
 *
 * Used for copy that is not addressed to the app's user (the clinician
 * report summary, which speaks about the patient to a clinician).
 */
export function cleanSlop(text: string): string {
  if (!text) return text;
  return tidyPunctuation(stripSlopPhrases(rewriteDashes(text)));
}

/**
 * The full pass: dashes, filler, reader address, punctuation.
 *
 * Order matters. Dashes and filler are rewritten first, then the copy
 * is addressed to the reader, then the punctuation is tidied, so the
 * sentence-case fix runs on the final text.
 */
export function antiSlop(text: string): string {
  if (!text) return text;
  return tidyPunctuation(addressReader(stripSlopPhrases(rewriteDashes(text))));
}

/**
 * Apply the anti-slop pass to every string value in a parsed AI
 * response. Used by `extractJsonObject` so no callable can skip it.
 */
export function antiSlopObject(value: unknown): unknown {
  if (typeof value === "string") return antiSlop(value);
  if (Array.isArray(value)) return value.map(antiSlopObject);
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = antiSlopObject(item);
    }
    return out;
  }
  return value;
}

/**
 * The same pass without the reader address, for copy that is not
 * addressed to the app's user.
 */
export function cleanSlopObject(value: unknown): unknown {
  if (typeof value === "string") return cleanSlop(value);
  if (Array.isArray(value)) return value.map(cleanSlopObject);
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = cleanSlopObject(item);
    }
    return out;
  }
  return value;
}
