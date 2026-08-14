"use node";

import { getAuthUserId } from "@convex-dev/auth/server";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { ConvexError, v } from "convex/values";
import type { StrainProfile } from "../lib/strain-profile";

export type { StrainProfile };

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

const MINIMAX_URL = "https://api.minimax.io/v1/chat/completions";
const MINIMAX_MODEL = "MiniMax-M2.5-highspeed";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const SYSTEM_PROMPT = `You are StrainWise, a research assistant built for medical cannabis patients. Patients come to you to choose between strains for symptom relief, so you speak directly to them — not to budtenders or enthusiasts.

Rules:
- Base every claim on the strain data provided. Never invent numbers, terpenes, effects, or uses.
- Some strains arrive WITHOUT a curated profile (marked "noCuratedProfile": true). For those, research from your own knowledge of how the strain is commonly described on Leafly, Weedmaps, Reddit, Google, and dispensary menus. Only state details you are reasonably confident are commonly reported about that strain; otherwise say "not verified" or note the uncertainty instead of guessing. If a name does not appear to be a real, known strain, say so plainly in the summary.
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
    "Strain data:",
    JSON.stringify(payload, null, 2),
    "",
    'Strains marked "noCuratedProfile": true are NOT in our curated knowledge base. Research them from your knowledge of how they are commonly described on Leafly, Weedmaps, Reddit, Google, and dispensary menus, and be explicit in the summary when a detail is a commonly-reported figure rather than a verified lab result.',
    "",
    "Return only the JSON object described in your instructions.",
  ].join("\n");
}

async function callMiniMax(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    throw new ConvexError(
      "The MiniMax API key is missing. Add MINIMAX_API_KEY in the project's Keys/API keys tab, then try again.",
    );
  }

  let res: Response;
  try {
    res = await fetch(MINIMAX_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MINIMAX_MODEL,
        messages,
        temperature: 0.4,
        max_completion_tokens: 1600,
        // M2.x models always think; the JSON is extracted in parseAnalysis,
        // which tolerates <think> tags around the response.
      }),
    });
  } catch {
    throw new ConvexError(
      "Could not reach the MiniMax research service. Please try again in a moment.",
    );
  }

  const data = (await res.json().catch(() => null)) as {
    error?: { message?: string };
    base_resp?: { status_msg?: string };
    message?: string;
    choices?: { message?: { content?: string } }[];
  } | null;

  if (!res.ok) {
    const detail =
      data?.error?.message ??
      data?.base_resp?.status_msg ??
      data?.message ??
      `status ${res.status}`;
    throw new ConvexError(
      `The MiniMax research service returned an error: ${detail}`,
    );
  }

  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim() === "") {
    throw new ConvexError(
      "The MiniMax research service returned an empty response. Please try again.",
    );
  }
  return content;
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
    strainNames: v.array(v.string()),
    condition: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<StrainComparison> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError(
        "You must be signed in to run a comparison. Please sign in and try again.",
      );
    }

    const names = [
      ...new Set(
        args.strainNames.map((n) => n.trim()).filter((n) => n !== ""),
      ),
    ];
    if (names.length < 2 || names.length > 3) {
      throw new ConvexError("Select 2–3 strains to compare.");
    }

    // Match requested names against the curated knowledge base
    // (case-insensitively). Anything that doesn't match is handed to the AI
    // to research from public sources instead.
    const found = await ctx.runQuery(api.strains.getStrainsByNames, {
      names,
    });
    const byName = new Map(found.map((s) => [s.name.toLowerCase(), s]));

    const strains: StrainProfile[] = names.map((name) => {
      const doc = byName.get(name.toLowerCase());
      if (!doc) {
        return { name, inKnowledgeBase: false };
      }
      return {
        name: doc.name,
        inKnowledgeBase: true,
        type: doc.type,
        thcRange: doc.thcRange,
        cbdRange: doc.cbdRange,
        lineage: doc.lineage,
        terpenes: doc.terpenes,
        medicalUses: doc.medicalUses,
        effects: doc.effects,
        sideEffects: doc.sideEffects,
        description: doc.description,
        communityNotes: doc.communityNotes,
      };
    });

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
