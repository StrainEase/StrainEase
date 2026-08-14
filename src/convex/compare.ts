"use node";

import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { ConvexError, v } from "convex/values";
import type { StrainProfile } from "../lib/strain-profile";
import { callMiniMax, extractJsonObject } from "./minimax";

export type StrainAnalysis = {
  headline: string;
  summary: string;
  forCondition: {
    best: string;
    why: string;
    runnerUp: string;
  } | null;
  keyDifferences: string[];
  commonGround: string[];
  cautions: string[];
};

export type StrainComparison = {
  strains: StrainProfile[];
  analysis: StrainAnalysis;
};

const SYSTEM_PROMPT = `You are StrainWise, a research assistant built for medical cannabis patients. Patients come to you to choose between strains for symptom relief, so you speak directly to them — not to budtenders or enthusiasts.

Rules:
- Base every claim on the strain data provided. Never invent numbers, terpenes, effects, or uses.
- Some strains arrive WITHOUT a Leafly profile (marked "noCuratedProfile": true). For those, research from your own knowledge of how the strain is commonly described on Leafly, Weedmaps, Reddit, Google, and dispensary menus. Only state details you are reasonably confident are commonly reported about that strain; otherwise say "not verified" or note the uncertainty instead of guessing. If a name does not appear to be a real, known strain, say so plainly in the summary.
- Write for the patient: precise, calm, practical, and low-jargon. Lead with symptom relief and day-to-day usability. If you use a technical term, define it in one short phrase.
- Never promise a cure, never advise stopping prescribed medication, and never diagnose. Encourage the patient to talk to their healthcare provider.
- If one or more condition focuses are given, evaluate each strain's suitability for those conditions and name the single best fit for the patient.
- Respond with ONLY a single JSON object. No markdown, no text outside the JSON.

JSON shape (all fields required):
{
  "headline": "one sentence, 18 words max, the practical takeaway for the patient",
  "summary": "2-4 sentences synthesizing the comparison for a patient choosing between strains",
  "forCondition": {"best": "strain name", "why": "1-2 sentences", "runnerUp": "strain name"} or null when no condition focus is given,
  "keyDifferences": ["3-5 short bullets"],
  "commonGround": ["2-3 short bullets"],
  "cautions": ["2-4 short, practical cautions, including consulting a physician and starting with a low dose"]
}`;

function buildPrompt(
  strains: StrainProfile[],
  conditions: string[] | undefined,
): string {
  const payload = strains.map((s) =>
    s.inKnowledgeBase
      ? {
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
          communityNotes: s.communityNotes,
        }
      : { name: s.name, noCuratedProfile: true },
  );

  return [
    "Compare the following cannabis strains for a patient deciding which one to try.",
    `Condition focus: ${
      conditions && conditions.length > 0
        ? conditions.join(", ")
        : "none — give a general comparison focused on patient symptom relief"
    }`,
    "",
    "Strain data (live from Leafly):",
    JSON.stringify(payload, null, 2),
    "",
    'Strains marked "noCuratedProfile": true were not found on Leafly. Research them from your knowledge of how they are commonly described on Leafly, Weedmaps, Reddit, Google, and dispensary menus, and be explicit in the summary when a detail is a commonly-reported figure rather than a verified lab result.',
    "",
    "Return only the JSON object described in your instructions.",
  ].join("\n");
}

function normalize(parsed: unknown): StrainAnalysis {
  const p = (parsed ?? {}) as Record<string, unknown>;
  const asStrings = (value: unknown): string[] =>
    Array.isArray(value)
      ? value.filter((x): x is string => typeof x === "string")
      : [];

  const forConditionRaw = p.forCondition as
    | Record<string, unknown>
    | null
    | undefined;

  return {
    headline:
      typeof p.headline === "string" && p.headline.trim()
        ? p.headline.trim()
        : "Comparison complete",
    summary:
      typeof p.summary === "string" && p.summary.trim()
        ? p.summary.trim()
        : "No summary returned.",
    forCondition:
      forConditionRaw &&
      typeof forConditionRaw.best === "string" &&
      typeof forConditionRaw.why === "string"
        ? {
            best: forConditionRaw.best,
            why: forConditionRaw.why,
            runnerUp:
              typeof forConditionRaw.runnerUp === "string"
                ? forConditionRaw.runnerUp
                : "",
          }
        : null,
    keyDifferences: asStrings(p.keyDifferences),
    commonGround: asStrings(p.commonGround),
    cautions: asStrings(p.cautions),
  };
}

function parseAnalysis(content: string): StrainAnalysis {
  const fallback: StrainAnalysis = {
    headline: "Comparison complete",
    summary: content.trim(),
    forCondition: null,
    keyDifferences: [],
    commonGround: [],
    cautions: [],
  };

  if (!content) {
    return fallback;
  }

  const parsed = extractJsonObject(content);
  if (parsed === null) {
    return fallback;
  }
  return normalize(parsed);
}

export const compareStrains = action({
  args: {
    strainNames: v.array(v.string()),
    condition: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<StrainComparison> => {
    const names = [
      ...new Set(
        args.strainNames.map((n) => n.trim()).filter((n) => n !== ""),
      ),
    ];
    if (names.length < 2 || names.length > 3) {
      throw new ConvexError("Select 2–3 strains to compare.");
    }

    // Pull live profiles from Leafly. Names Leafly doesn't have are marked
    // inKnowledgeBase: false and the AI researches them in the same call —
    // no extra AI call needed.
    const strains = await ctx.runAction(api.leafly.getStrainProfiles, {
      names,
    });

    // One AI call per comparison: the synthesis only.
    const content = await callMiniMax([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildPrompt(strains, args.condition) },
    ]);

    return {
      strains,
      analysis: parseAnalysis(content),
    };
  },
});
