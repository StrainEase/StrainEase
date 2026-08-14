"use node";

import { getAuthUserId } from "@convex-dev/auth/server";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import { vly } from "../lib/vly-integrations";
import { ConvexError, v } from "convex/values";

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
  strains: Doc<"strains">[];
  analysis: StrainAnalysis;
};

const SYSTEM_PROMPT = `You are StrainWise, a research assistant for medical cannabis patients. You compare strains using data aggregated from public sources: Leafly strain reviews, Weedmaps listings, Reddit discussions (r/trees, r/medicalmarijuana, r/MMJ), Google results, and dispensary menus.

Rules:
- Base every claim only on the strain data provided. Never invent numbers, terpenes, effects, or uses.
- Write for a medical audience: precise, calm, practical. Reference conditions and symptoms clearly.
- Never promise a cure, never advise stopping prescribed medication, and never diagnose.
- If a condition focus is given, evaluate each strain's suitability for that condition explicitly and name the best fit.
- Respond with ONLY a single JSON object. No markdown, no text outside the JSON.

JSON shape (all fields required):
{
  "headline": "one sentence, 18 words max, the practical takeaway",
  "summary": "2-4 sentences synthesizing the comparison for a medical user",
  "forCondition": {"best": "strain name", "why": "1-2 sentences", "runnerUp": "strain name"} or null when no condition focus is given,
  "keyDifferences": ["3-5 short bullets"],
  "commonGround": ["2-3 short bullets"],
  "cautions": ["2-4 short, practical cautions, including consulting a physician and starting with a low dose"]
}`;

function buildPrompt(
  strains: Doc<"strains">[],
  condition: string | undefined,
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
    communityNotes: s.communityNotes,
  }));

  return [
    "Compare the following cannabis strains for a medical cannabis patient.",
    `Condition focus: ${condition ?? "none — give a general medical comparison"}`,
    "",
    "Strain data (aggregated from Leafly, Weedmaps, Reddit, and dispensary menus):",
    JSON.stringify(payload, null, 2),
    "",
    "Return only the JSON object described in your instructions.",
  ].join("\n");
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

  try {
    const parsed = JSON.parse(content);
    return normalize(parsed);
  } catch {
    // Tolerate markdown fences or stray text around the JSON.
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return normalize(JSON.parse(content.slice(start, end + 1)));
      } catch {
        return fallback;
      }
    }
    return fallback;
  }
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

export const compareStrains = action({
  args: {
    strainIds: v.array(v.id("strains")),
    condition: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<StrainComparison> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError(
        "You must be signed in to run a comparison. Please sign in and try again.",
      );
    }

    if (args.strainIds.length < 2 || args.strainIds.length > 3) {
      throw new ConvexError("Select 2–3 strains to compare.");
    }

    const strains = (
      await Promise.all(
        args.strainIds.map((id) =>
          ctx.runQuery(api.strains.getStrainById, { id }),
        ),
      )
    ).filter((s): s is Doc<"strains"> => s !== null);

    if (strains.length !== args.strainIds.length) {
      throw new ConvexError("One or more strains could not be found.");
    }

    const response = await vly.ai.completion({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildPrompt(strains, args.condition) },
      ],
      temperature: 0.4,
      maxTokens: 1400,
    });

    if (!response.success || !response.data) {
      throw new ConvexError(
        response.error ??
          "The research service returned an error. Please try again in a moment.",
      );
    }

    const content =
      response.data.choices[0]?.message?.content ?? "";

    return {
      strains,
      analysis: parseAnalysis(content),
    };
  },
});
