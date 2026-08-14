"use node";

import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { ConvexError, v } from "convex/values";
import type { StrainProfile } from "../lib/strain-profile";
import type {
  RecommendationResult,
  StrainRecommendation,
} from "../lib/recommendations";
import { callMiniMax, extractJsonObject } from "./minimax";

const SYSTEM_PROMPT = `You are StrainWise, a strain-finding assistant built for medical cannabis patients. A patient tells you which symptoms or conditions they are treating, and you recommend the strains most commonly reported to help with those symptoms.

Rules:
- Base recommendations on the Leafly strain data provided. You may also recommend well-known strains that are NOT in the list, based on your knowledge of how they are commonly described on Leafly, Weedmaps, Reddit, and dispensary menus — but only recommend strains you are confident really exist and are commonly reported for the symptoms.
- Recommend 3-5 distinct strains, ordered from best overall fit to least.
- Every recommendation needs a concrete reason tied to the patient's symptoms, a note on who it suits best (e.g. daytime vs evening use, anxiety-sensitive patients), and one practical caution.
- Respect the potency preference if one is given.
- Write for the patient: precise, calm, practical, and low-jargon. If you use a technical term, define it in one short phrase.
- Never promise a cure, never advise stopping prescribed medication, and never diagnose. Encourage the patient to talk to their healthcare provider.
- Respond with ONLY a single JSON object. No markdown, no text outside the JSON.

JSON shape (all fields required):
{
  "headline": "one sentence, 18 words max, the practical takeaway",
  "summary": "2-4 sentences",
  "recommendations": [
    {"strainName": "...", "reason": "1-2 sentences tied to the symptoms", "bestFor": "short phrase on who it suits", "caution": "one short practical caution"}
  ]
}`;

const POTENCY_LABELS: Record<string, string> = {
  mild: "mild (THC under roughly 15%)",
  balanced: "balanced (THC roughly 15-22%)",
  strong: "strong (THC above roughly 22%)",
};

function buildPrompt(
  strains: StrainProfile[],
  conditions: string[],
  potency: string | undefined,
): string {
  const payload = strains.map((s) => ({
    name: s.name,
    type: s.type,
    thcRange: s.thcRange,
    cbdRange: s.cbdRange,
    lineage: s.lineage,
    terpenes: s.terpenes,
    medicalUses: s.medicalUses,
    effects: s.effects,
    sideEffects: s.sideEffects,
    description: s.description,
  }));

  return [
    "Recommend the best cannabis strains for a patient treating these symptoms:",
    conditions.join(", "),
    potency
      ? `Potency preference: ${POTENCY_LABELS[potency]}.`
      : "Potency preference: none — pick whatever potency fits the symptoms best.",
    "",
    "Strain data (live from Leafly's popular strains):",
    JSON.stringify(payload, null, 2),
    "",
    "You may also suggest strains not in this list from your general knowledge, as long as you are confident they are real and commonly reported for these symptoms.",
    "",
    "Return only the JSON object described in your instructions.",
  ].join("\n");
}

function normalizeRecommendations(value: unknown): StrainRecommendation[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: StrainRecommendation[] = [];
  for (const item of value) {
    const r = (item ?? {}) as Record<string, unknown>;
    const name = typeof r.strainName === "string" ? r.strainName.trim() : "";
    if (name === "") continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      strainName: name,
      reason: typeof r.reason === "string" ? r.reason.trim() : "",
      bestFor: typeof r.bestFor === "string" ? r.bestFor.trim() : "",
      caution: typeof r.caution === "string" ? r.caution.trim() : "",
    });
  }
  return out.slice(0, 6);
}

export const recommendStrainsForConditions = action({
  args: {
    conditions: v.array(v.string()),
    potency: v.optional(
      v.union(
        v.literal("mild"),
        v.literal("balanced"),
        v.literal("strong"),
      ),
    ),
  },
  handler: async (ctx, args): Promise<RecommendationResult> => {
    const conditions = [
      ...new Set(args.conditions.map((c) => c.trim()).filter((c) => c !== "")),
    ];
    if (conditions.length === 0) {
      throw new ConvexError(
        "Tell us at least one symptom or condition to search for.",
      );
    }

    // Real data to rank against: Leafly's popular strains (one fetch, no AI).
    // The AI is allowed to add well-known strains from its own knowledge.
    const popular = await ctx.runAction(api.leafly.popularStrains, {});

    // One AI call per search: the ranking only.
    const content = await callMiniMax([
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: buildPrompt(popular, conditions, args.potency),
      },
    ]);

    const parsed = extractJsonObject(content);
    const p = (parsed ?? {}) as Record<string, unknown>;
    const recommendations = normalizeRecommendations(p.recommendations);
    if (recommendations.length === 0) {
      throw new ConvexError(
        "The research service did not return usable recommendations. Please try again.",
      );
    }

    // Fetch full Leafly profiles for the recommended names so the UI can
    // render real data. Names Leafly doesn't have are marked for AI research
    // (researched in the same synthesis call — no extra AI call).
    const names = [...new Set(recommendations.map((r) => r.strainName))];
    const strains = await ctx.runAction(api.leafly.getStrainProfiles, {
      names,
    });

    return {
      headline:
        typeof p.headline === "string" && p.headline.trim()
          ? p.headline.trim()
          : "Here are the best matches for you",
      summary:
        typeof p.summary === "string" && p.summary.trim()
          ? p.summary.trim()
          : "No summary returned.",
      recommendations,
      strains,
    };
  },
});
