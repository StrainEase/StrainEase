// OpenRouter Chat Completions client.
//
// Used as the primary backend for describeStrainForUser and
// compareStrains. OpenRouter exposes an OpenAI-compatible
// `/api/v1/chat/completions` endpoint at openrouter.ai, so the
// request/response shape mirrors `groq.ts` exactly.
//
// Model: meta-llama/llama-3.3-70b-instruct:nitro. The `:nitro`
// suffix tells OpenRouter to route this request to its fastest
// tier regardless of price. Belt-and-suspenders: we also pin the
// `provider.order` field to prefer `together` and `fireworks`
// (the two inference engines we already know are fast on these
// prompts), with `allow_fallbacks: true` so we still get an
// answer if those two are down.
//
// We previously tried OpenRouter's default routing on the plain
// `meta-llama/llama-3.3-70b-instruct` model id and watched latency
// climb into the 70-110s range as OpenRouter routed to the
// on-demand tier of whichever provider had the model available.
// Same model id, same prose, but the routing decision was the
// problem. Together.ai and Fireworks run Llama 3.3 70B on
// inference-optimised engines (5-15s warm); DeepInfra's
// on-demand tier is 15-25s with 40s+ spikes. The `:nitro` tag +
// provider pinning keeps us off DeepInfra.
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
// `OPENROUTER_API_KEY` is a Firebase Secret registered via
// `firebase functions:secrets:set OPENROUTER_API_KEY`. The Firestore
// cache in ai-cache.ts absorbs most repeat traffic so the bill stays
// low.
//
// `max_tokens: 1500` mirrors the prior default and is enough for the
// 3-section description and the comparison summary.

import { HttpsError } from "firebase-functions/v2/https";

/** Model id routed through OpenRouter. Llama 3.3 70B chat-tuned on
 *  OpenRouter's `:nitro` (fastest) tier. The provider order on the
 *  request body further pins routing to Together and Fireworks. */
export const OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct:nitro";

/** Provider preference for the OpenRouter request body. Together and
 *  Fireworks run the 70B on inference-optimised engines; DeepInfra
 *  on-demand has 15-25s warm latency with 40s+ spikes, so we do not
 *  list it. `allow_fallbacks: true` keeps the call going if both
 *  preferred providers are temporarily unavailable. */
export const OPENROUTER_PROVIDER_ORDER = ["together", "fireworks"];

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
    provider: {
      order: OPENROUTER_PROVIDER_ORDER,
      allow_fallbacks: true,
    },
  };
}

/** Timeout in milliseconds for the OpenRouter fetch call. 90 seconds
 *  gives us headroom under Firebase's 120-second function timeout. */
const FETCH_TIMEOUT_MS = 90_000;

/**
 * Call OpenRouter's chat completions endpoint. Returns the model's
 * raw string content (already JSON-shaped because we set
 * `response_format: json_object`). Throws `HttpsError` on transport
 * failure, non-2xx, timeout, or empty content.
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

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
