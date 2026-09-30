/**
 * The closed set of THC potency bands shown on every surface that lets
 * the user pick a preferred strength (Find, Browse, anywhere we'd
 * filter by THC). Same labels and ranges as the iOS `Potency` enum so
 * a label chosen on one surface reads the same on every other one.
 *
 * - `any`       → no preference (every strain matches)
 * - `mild`      → midpoint under 15% THC
 * - `balanced`  → 15–22% THC
 * - `strong`    → 22%+ THC
 *
 * Bands are evaluated client-side against the parsed midpoint of
 * Leafly's `thcRange` string (see `thcMidpoint`). When the strain has
 * no parseable THC range we only include it in the `any` bucket —
 * there's no honest answer for the other three.
 */
export type ThcBand = "any" | "mild" | "balanced" | "strong";

export const THC_BANDS: {
  value: ThcBand;
  label: string;
  hint: string;
  /** True when a strain with the given midpoint THC belongs in this band. */
  test: (mid: number) => boolean;
}[] = [
  { value: "any", label: "Any THC", hint: "No preference", test: () => true },
  {
    value: "mild",
    label: "Mild",
    hint: "THC under ~15%",
    test: (m) => m < 15,
  },
  {
    value: "balanced",
    label: "Balanced",
    hint: "THC 15–22%",
    test: (m) => m >= 15 && m < 22,
  },
  {
    value: "strong",
    label: "Strong",
    hint: "THC above ~22%",
    test: (m) => m >= 22,
  },
];

/**
 * Parse Leafly's `thcRange` strings into a numeric midpoint.
 *
 * - "17-24%"  → 20.5
 * - "~20%"    → 20
 * - "19%"     → 19
 * - "<1%"     → 0.5  (half-step below the ceiling)
 *
 * Returns `null` when the input is missing or unparseable — the caller
 * can then decide whether to include or exclude the strain (we only
 * include unknowns in the `any` band).
 */
export function thcMidpoint(range: string | undefined): number | null {
  if (!range) return null;
  const cleaned = range.replace(/[%~\s<>]/g, "").trim();
  if (!cleaned) return null;
  // "<1" → 0.5
  if (range.includes("<")) {
    const n = Number(cleaned.replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? Math.max(0, n - 0.5) : null;
  }
  // "17-24" → 20.5
  const dash = cleaned.split("-");
  if (dash.length === 2) {
    const a = Number(dash[0]);
    const b = Number(dash[1]);
    if (Number.isFinite(a) && Number.isFinite(b)) return (a + b) / 2;
  }
  const single = Number(cleaned);
  if (Number.isFinite(single)) return single;
  return null;
}

/**
 * Filter an array of previews by a `ThcBand`. Exposed as a helper so
 * Find (StrainFind), Browse (StrainBrowse), and any future
 * surface that filters previews by THC reach for the exact same
 * matcher — that way "Mild" returns the same set on every page.
 *
 * Strains with no parseable `thcRange` are only included when the band
 * is `any`. Picking Mild / Balanced / Strong is an active choice and
 * we shouldn't silently include unknowns.
 */
export function matchesThcBand(
  thcRange: string | undefined,
  band: ThcBand,
): boolean {
  if (band === "any") return true;
  const mid = thcMidpoint(thcRange);
  if (mid === null) return false;
  const def = THC_BANDS.find((b) => b.value === band);
  return def ? def.test(mid) : true;
}
