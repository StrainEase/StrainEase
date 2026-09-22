// Drug-interaction flag stamping for recommendation cards.
//
// Each recommendation card on the Find page can carry a small badge
// when the patient has medications with a known cannabis interaction
// AND the strain's profile (currently the THC midpoint) crosses the
// conservative high-THC threshold. The heuristic errs on fewer false
// positives: low-THC strains don't trigger the flag even on flagged
// drug classes, because the SSRIs / sedatives / anticoagulants in
// `seed/interactionLibrary.json` specifically call out high-THC
// products as the concern.
//
// Pure function (no Firestore / no HTTP) so it can be unit-tested
// directly against a fixture list.

import { parsePercentMidpoint } from "./thc-percent";
import type { InteractionRecord } from "./reference-library";
import type { InteractionFlag, StrainProfile } from "./types";

/**
 * Threshold above which a strain is considered "high-THC" for the
 * purpose of the SSRI / sedative / anticoagulant interactions in the
 * library. Most flag records in the seed JSON call out high-THC
 * products specifically. Kept at 18% to mirror Leafly's "high-THC"
 * bracket and the existing THC band in `lib/thc-bands.ts`.
 */
export const HIGH_THC_THRESHOLD = 18;

/**
 * Build the highest-priority interaction flag for a strain given the
 * patient's drug-interaction records. Returns null when no flag
 * should be attached: no drug interactions on file, or the strain's
 * THC midpoint doesn't clear the conservative threshold, or every
 * record is "theoretical" (no clinical signal in the seed data).
 *
 * When the patient is on multiple drugs in different classes, the
 * worst-severity class wins and is the one surfaced in the badge.
 * The summary is `commonGuidance` clamped to one line so the badge
 * fits on a phone-sized card without wrapping.
 */
export function flagInteractionForStrain(
  strain: Pick<StrainProfile, "thcRange">,
  interactions: InteractionRecord[],
): InteractionFlag | null {
  if (interactions.length === 0) return null;
  const midpoint = parsePercentMidpoint(strain.thcRange);
  if (midpoint === null || midpoint < HIGH_THC_THRESHOLD) return null;

  // Group by drug class and keep the worst-severity record per class.
  // "theoretical" severity is dropped — the seed library uses it for
  // records with no real-world signal, and surfacing those would
  // dilute the badge's meaning. "low" / "moderate" / "high" stay.
  const byClass = new Map<string, InteractionRecord>();
  for (const record of interactions) {
    if (record.cannabisInteraction.severity === "theoretical") continue;
    const existing = byClass.get(record.drugClass);
    if (
      !existing ||
      severityRank(record.cannabisInteraction.severity) >
        severityRank(existing.cannabisInteraction.severity)
    ) {
      byClass.set(record.drugClass, record);
    }
  }
  if (byClass.size === 0) return null;

  // Pick the worst-severity class overall. Stable across multiple
  // top-rank classes — first match wins, mirroring how the patient's
  // drug list was ordered by `lookupInteractions`.
  let chosen: InteractionRecord | null = null;
  for (const record of byClass.values()) {
    if (
      !chosen ||
      severityRank(record.cannabisInteraction.severity) >
        severityRank(chosen.cannabisInteraction.severity)
    ) {
      chosen = record;
    }
  }
  if (!chosen) return null;

  return {
    drugClass: chosen.drugClass,
    severity: chosen.cannabisInteraction.severity,
    summary: clampToOneLine(chosen.cannabisInteraction.commonGuidance),
  };
}

function severityRank(
  s: InteractionRecord["cannabisInteraction"]["severity"],
): number {
  switch (s) {
    case "high":
      return 3;
    case "moderate":
      return 2;
    case "low":
      return 1;
    case "theoretical":
      return 0;
  }
}

function clampToOneLine(text: string): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= 160) return trimmed;
  return trimmed.slice(0, 157) + "…";
}