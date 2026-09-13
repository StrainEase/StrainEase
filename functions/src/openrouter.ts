// OpenRouter Chat Completions client.
//
// Used as the primary backend for describeStrainForUser and
// compareStrains. OpenRouter exposes an OpenAI-compatible
// `/api/v1/chat/completions` endpoint at openrouter.ai, so the
// request/response shape mirrors `groq.ts` exactly. OpenRouter routes
// each request to whichever backend has the model available with the
// lowest expected latency, so the same model id can sit on Together.ai,
// Fireworks, or DeepInfra depending on current capacity.
//
// Model: meta-llama/llama-3.3-70b-instruct (Meta's chat-tuned 70B).
// We previously tried DeepInfra's Llama 3.3 70B Turbo directly (15-25s
// warm latency, occasional 40s+ spikes on the on-demand tier) and
// Together.ai's Llama 3.1 8B Turbo (faster but lower prose richness).
// OpenRouter's automatic routing keeps the 70B's prose quality while
// letting the inference land on whichever provider currently has the
// shortest queue, so the user-visible latency is much closer to the 8B
// tier without giving up the 70B's richer section paragraphs.
//
// OpenRouter charges per token. Set a hard monthly usage limit in the
// OpenRouter console so a worst case is bounded. `OPENROUTER_API_KEY`
// is a Firebase Secret registered next to `GROQ_API_KEY`. The Firestore
// cache in ai-cache.ts absorbs most repeat traffic so the bill stays
// low.
//
// OpenRouter also recommends two attribution headers (`HTTP-Referer`
// and `X-Title`) for app identification. They are not required for the
// call to succeed, so we omit them for now. Add them later if the
// console surfaces rate-limit or priority differences for attributed
// traffic.
//
// `max_tokens: 1500` mirrors the prior default and is enough for the
// 3-section description and the comparison summary.

import { HttpsError } from "firebase-functions/v2/https";

/** Model id routed through OpenRouter. Llama 3.3 70B chat-tuned.
 *  OpenRouter picks the lowest-latency backend with the model
 *  currently available. */
export const OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export function openRouterRequestBody(
  model: string,
  messages: ChatMessage[],
): Record<string, unknown> {
  return {
    model,
    messages,
    temperature: 0.5,
    max_tokens: 1500,
    response_format: { type: "json_object" },
  };
}

/**
 * Call OpenRouter's chat completions endpoint. Returns the model's
 * raw string content (already JSON-shaped because we set
 * `response_format: json_object`). Throws `HttpsError` on transport
 * failure, non-2xx, or empty content, same shape as `callGroq` so
 * the fallback path can treat any provider identically.
 */
export async function callOpenRouter(
  apiKey: string,
  messages: ChatMessage[],
  model: string = OPENROUTER_MODEL,
): Promise<string> {
  if (!apiKey) {
    throw new HttpsError(
      "failed-precondition",
      "The OpenRouter API key is missing. Run `firebase functions:secrets:set OPENROUTER_API_KEY` and redeploy.",
    );
  }

  let res: Response;
  try {
    res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(openRouterRequestBody(model, messages)),
    });
  } catch {
    throw new HttpsError(
      "unavailable",
      "Could not reach our research service. Please try again in a moment.",
    );
  }

  const data = (await res.json().catch(() => null)) as {
    error?: { message?: string };
    message?: string;
    choices?: { message?: { content?: string } }[];
  } | null;

  if (!res.ok) {
    const detail =
      data?.error?.message ?? data?.message ?? `status ${res.status}`;
    throw new HttpsError(
      "internal",
      `Our research service returned an error: ${detail}`,
    );
  }

  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim() === "") {
    throw new HttpsError(
      "internal",
      "Our research service returned an empty response. Please try again.",
    );
  }
  return content;
}
