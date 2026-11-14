// OpenRouter Chat Completions client.
//
// Used as the primary backend for describeStrainForUser,
// compareStrains, and the Discover recommend pipeline. OpenRouter
// exposes an OpenAI-compatible `/api/v1/chat/completions` endpoint
// at openrouter.ai.
//
// Model: openai/gpt-oss-120b:nitro. The `:nitro` suffix tells
// OpenRouter to route this request to its fastest tier regardless
// of price. Belt-and-suspenders: we also pin the `provider.order`
// field to prefer `groq` and `cerebras` (the two fastest hosts
// for this model), with `allow_fallbacks: true` so we still get an
// answer if those two are down.
//
// This replaced meta-llama/llama-3.3-70b-instruct:nitro (pinned to
// Together and Fireworks) in Nov 2026. The Llama route measured
// ~17 tok/s p50 on OpenRouter, so a 1,500-token JSON reply took
// 75-90s of generation alone and the Discover pipeline, which can
// run up to three sequential model calls inside a 180s budget,
// timed out on cold starts. gpt-oss-120b on Groq / Cerebras runs
// ~310 / ~746 tok/s via OpenRouter at $0.15 / $0.60 and
// $0.35 / $0.75 per 1M in / out, so the same reply takes seconds.
//
// gpt-oss-120b is a reasoning model: its reasoning tokens share
// the `max_tokens` budget on Chat Completions, so a 1,500-token
// cap would let reasoning eat the visible JSON and return an
// empty answer. `max_tokens: 3000` leaves room for low-effort
// reasoning plus the full JSON reply, and
// `reasoning: { effort: "low", exclude: true }` caps reasoning
// at roughly 20% of the budget and keeps it out of the response,
// so `choices[0].message.content` stays clean JSON.
//
// OpenRouter charges per token. Set a hard monthly usage limit in the
// OpenRouter console so a worst case is bounded. `OPENROUTER_API_KEY`
// is a Firebase Secret registered via
// `firebase functions:secrets:set OPENROUTER_API_KEY`. The Firestore
// cache in ai-cache.ts absorbs most repeat traffic so the bill stays
// low.
//
// OpenRouter also recommends two attribution headers (`HTTP-Referer`
// and `X-Title`) for app identification. They are not required for the
// call to succeed, so we omit them for now. Add them later if the
// console surfaces rate-limit or priority differences for attributed
// traffic.

import { HttpsError } from "firebase-functions/v2/https";

/** Model id routed through OpenRouter. gpt-oss-120b on
 *  OpenRouter's `:nitro` (fastest) tier. The provider order on the
 *  request body further pins routing to Groq and Cerebras. */
export const OPENROUTER_MODEL = "openai/gpt-oss-120b:nitro";

/** Provider preference for the OpenRouter request body. Groq and
 *  Cerebras are the fastest hosts for gpt-oss-120b; the cheapest
 *  hosts for this model run at ~30 tok/s, so we do not let
 *  OpenRouter fall back to them by price. `allow_fallbacks: true`
 *  keeps the call going if both preferred providers are
 *  temporarily unavailable. */
export const OPENROUTER_PROVIDER_ORDER = ["groq", "cerebras"];

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
    max_tokens: 3000,
    reasoning: { effort: "low", exclude: true },
    response_format: { type: "json_object" },
    provider: {
      order: OPENROUTER_PROVIDER_ORDER,
      allow_fallbacks: true,
    },
  };
}

/** Default timeout in milliseconds for the OpenRouter fetch call. 90
 *  seconds gives us headroom under Firebase's 120-second function
 *  timeout. Callers that run inside a longer pipeline (the Discover
 *  recommend call) pass a smaller budget so one slow model call cannot
 *  eat the whole request. */
const FETCH_TIMEOUT_MS = 90_000;

/**
 * Call OpenRouter's chat completions endpoint. Returns the model's
 * raw string content (already JSON-shaped because we set
 * `response_format: json_object`). Throws `HttpsError` on transport
 * failure, non-2xx, timeout, or empty content.
 *
 * `timeoutMs` caps how long this single call may take. It exists so a
 * caller with a wall-clock budget of its own can hand the model only
 * the slice of that budget it can afford, instead of discovering the
 * overrun when the function deadline kills the whole request.
 */
export async function callOpenRouter(
  apiKey: string,
  messages: ChatMessage[],
  model: string = OPENROUTER_MODEL,
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<string> {
  if (!apiKey) {
    throw new HttpsError(
      "failed-precondition",
      "The OpenRouter API key is missing. Run `firebase functions:secrets:set OPENROUTER_API_KEY` and redeploy.",
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(openRouterRequestBody(model, messages)),
      signal: controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      throw new HttpsError(
        "deadline-exceeded",
        "The research service took too long to respond. Please try again.",
      );
    }
    throw new HttpsError(
      "unavailable",
      "Could not reach our research service. Please try again in a moment.",
    );
  } finally {
    clearTimeout(timeoutId);
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
