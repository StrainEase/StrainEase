// THC/CBD percent parsing + averaging.
//
// All three sources return percent ranges in slightly different shapes:
//   Leafly:    "17-24%", "~20%", "<1%"
//   Weedmaps:  "15-27" (no %), "2", "20"
//   Allbud:    "17–24%", "26%", "THC: 17% - 24%" (we strip before parsing)
//
// For averaging we reduce each value to a single number (the midpoint
// of a range, or the value itself for a single number) and then take
// the arithmetic mean across sources. The result is re-formatted as a
// range or single value with a percent sign. Exposed for tests so the
// round-trip stays honest.

/** A single source's contribution to a percent field. */
export type PercentSource = {
  source: string;
  raw: string | null;
  /** Numeric midpoint of the raw range. null if it can't be parsed. */
  mid: number | null;
};

/**
 * Parse a percent string into a numeric midpoint. Returns null when
 * the string doesn't look like a number or range. Whitespace is
 * ignored, the percent sign is optional, "–" / "-" / "—" are all
 * treated as range separators, "<" / ">" / "~" prefixes are
 * discarded. "<1%" becomes 0.5 (half-step below the ceiling, same
 * convention as the directory bucketing).
 */
export function parsePercentMidpoint(raw: string | undefined | null): number | null {
  if (!raw) return null;
  // Strip prefix markers and surrounding whitespace.
  const cleaned = raw.replace(/[%~\s<>]/g, "").trim();
  if (!cleaned) return null;
  // Reject obvious non-numbers (must contain at least one digit).
  if (!/\d/.test(cleaned)) return null;
  // En/em/hyphen dash separator
  const parts = cleaned.split(/[-–—]/).filter((p) => p.length > 0);
  if (parts.length === 0) return null;
  const numbers = parts
    .map((p) => Number(p))
    .filter((n) => Number.isFinite(n) && n >= 0);
  if (numbers.length === 0) return null;
  if (numbers.length === 1) {
    // A "<1%" strip leaves "1", so the original was "less than 1" —
    // half-step under the ceiling.
    return /^\s*</.test(raw) ? Math.max(0, numbers[0] - 0.5) : numbers[0];
  }
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

/**
 * Re-format a numeric midpoint back into a human-readable percent.
 * "20.5" → "20.5%"; integer midpoints lose the decimal.
 */
export function formatPercent(mid: number): string {
  if (!Number.isFinite(mid) || mid < 0) return "0%";
  const rounded = Math.round(mid * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
}

/**
 * Average the parsed midpoints across sources. Sources with null
 * midpoints (unparseable) are dropped; if all sources are null we
 * return null so the caller can leave the field empty. The returned
 * `sources` list preserves the original raw values so Maya can
 * inspect what each catalog said.
 */
export function averagePercent(
  values: PercentSource[],
): { mid: number; sources: PercentSource[] } | null {
  const usable = values.filter((v): v is PercentSource & { mid: number } => v.mid !== null);
  if (usable.length === 0) return null;
  const sum = usable.reduce((a, b) => a + b.mid, 0);
  return { mid: sum / usable.length, sources: values };
}
