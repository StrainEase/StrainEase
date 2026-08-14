"use node";

import { ConvexError } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { StrainProfile } from "../lib/strain-profile";

const MINIMAX_URL = "https://api.minimax.io/v1/chat/completions";

export const MINIMAX_MODEL = "MiniMax-M2.5-highspeed";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function callMiniMax(messages: ChatMessage[]): Promise<string> {
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
        // M2.x models always think; extractJsonObject tolerates <think> tags.
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

/**
 * Extract a JSON object from a model response, tolerating <think> tags,
 * markdown fences, and stray text around the JSON.
 */
export function extractJsonObject(content: string): unknown | null {
  try {
    return JSON.parse(content);
  } catch {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(content.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

/** Map a curated strain document to the shared StrainProfile shape. */
export function strainDocToProfile(doc: Doc<"strains">): StrainProfile {
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
}
