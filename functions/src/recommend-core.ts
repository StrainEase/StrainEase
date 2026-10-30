/**
 * Pure helpers for the Discover (recommend) pipeline.
 *
 * Everything in this module is free of Firebase imports so the unit
 * tests can exercise the name casing and the time budget without
 * booting the admin SDK. Booting the admin SDK inside a test run
 * initializes the Firestore client, which turns every "no credentials
 * here" cache call into a real network wait and slows the unrelated
 * Firestore-backed tests down.
 */

import { computeAiCacheKey } from "./ai-cache-key";
import { canonicalProfileName } from "./canonical-strain-name";
import type { ReasoningEvidenceItem, StrainRecommendation } from "./types";

/** Wall-clock budget for the whole recommend pipeline. Leaves room
 *  under the callable's 240-second deadline for the response to
 *  serialise. */
export const RECOMMEND_BUDGET_MS = 180_000;

/** Time we hold back for the top-up model call. */
export const RECOMMEND_TOPUP_RESERVE_MS = 45_000;

/** Time we hold back for the per-strain enrichment pass. */
export const RECOMMEND_ENRICH_RESERVE_MS = 30_000;

/** Clamp a remaining-time budget into a sane range for a model call. */
export function clampBudget(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return max;
  return Math.min(Math.max(value, min), max);
}

/**
 * Cache key for a recommend run. The conditions are sorted so the same
 * search in a different order shares one cache entry; the potency,
 * prefs and output language are part of the key because each one
 * changes the answer.
 */
export function recommendCacheKey(input: {
  conditions: string[];
  potency?: string;
  prefs: unknown;
  language: string;
}): string {
  return computeAiCacheKey({
    conditions: [...input.conditions].sort(),
    potency: input.potency ?? null,
    prefs: input.prefs,
    language: input.language,
  });
}

/** Trim a list of strings to a max item count and max item length. */
export function clampStringList(
  value: unknown,
  maxItems: number,
  maxLen: number,
): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim().slice(0, maxLen);
    if (trimmed === "") continue;
    out.push(trimmed);
    if (out.length >= maxItems) break;
  }
  return out;
}

/**
 * Parse the model's `reasoning` block. The model emits it for every
 * recommendation in the new prompt; older model versions and a few edge
 * cases (e.g. JSON truncation) won't have it, in which case we return
 * undefined and the UI hides the trace.
 */
export function normalizeReasoning(
  value: unknown,
): StrainRecommendation["reasoning"] {
  if (!value || typeof value !== "object") return undefined;
  const r = value as Record<string, unknown>;
  const evidenceRaw = Array.isArray(r.evidence) ? r.evidence : [];
  const evidence: ReasoningEvidenceItem[] = [];
  for (const item of evidenceRaw) {
    if (!item || typeof item !== "object") continue;
    const i = item as Record<string, unknown>;
    const source = typeof i.source === "string" ? i.source : "Aggregated";
    const quote = typeof i.quote === "string" ? i.quote.trim() : "";
    if (quote === "") continue;
    if (
      source !== "Leafly" &&
      source !== "Weedmaps" &&
      source !== "Allbud" &&
      source !== "Reddit" &&
      source !== "Aggregated" &&
      source !== "Patient history"
    ) {
      // Unknown source — keep the quote but tag it as Aggregated so the
      // client can still show it without inventing a label.
      evidence.push({ source: "Aggregated", quote });
      continue;
    }
    evidence.push({ source, quote });
    if (evidence.length >= 6) break;
  }
  if (evidence.length === 0) return undefined;
  return {
    matchedConditions: clampStringList(r.matchedConditions, 8, 80),
    preferencesApplied: clampStringList(r.preferencesApplied, 8, 120),
    evidence,
    considerations: clampStringList(r.considerations, 4, 200),
  };
}

/**
 * Turn the model's `recommendations` array into the payload the
 * Discover tab renders.
 *
 * The model writes names in whatever case it feels like ("blue
 * dream", "gg4"). Every name goes through the canonical-name lookup
 * so the Discover tab, the strain page, and the saved-strains list all
 * agree on one spelling per strain. The lookup prefers the catalog's
 * name when it knows the strain and falls back to the title-case
 * normaliser when it does not.
 */
export function normalizeRecommendations(
  value: unknown,
): StrainRecommendation[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: StrainRecommendation[] = [];
  for (const item of value) {
    const r = (item ?? {}) as Record<string, unknown>;
    const raw = typeof r.strainName === "string" ? r.strainName.trim() : "";
    if (raw === "") continue;
    const name = canonicalProfileName(raw);
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      strainName: name,
      reason: typeof r.reason === "string" ? r.reason.trim() : "",
      bestFor: typeof r.bestFor === "string" ? r.bestFor.trim() : "",
      caution: typeof r.caution === "string" ? r.caution.trim() : "",
      reasoning: normalizeReasoning(r.reasoning),
    });
  }
  return out.slice(0, 6);
}
