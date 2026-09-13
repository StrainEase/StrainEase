// DeepInfra Chat Completions client.
//
// DeepInfra is the cheapest metered host of DeepSeek V4 Flash (and the
// V4.x family in general): $0.09 input / $0.18 output per 1M tokens
// at the time of writing. It exposes an OpenAI-compatible
// `/v1/openai/chat/completions` endpoint, so the request/response shape
// mirrors `groq.ts` exactly. The single behavioural difference: we
// pass `stream: false` explicitly because DeepInfra's OpenAI shim
// defaults to streaming when the field is omitted, which would
// return a `ReadableStream` body that our `res.json()` cannot parse.
//
// Used as a fallback when Groq returns 429 (rate limit) or 5xx.
// `index.ts` (describeStrainForUser / compareStrains) tries Groq first
// because it is free, then falls through to DeepInfra with the same
// messages and model-equivalent. The cache layer in `ai-cache.ts`
// short-circuits repeat calls before either provider is hit.

import { HttpsError } from "firebase-functions/v2/https";

/** Model id registered on DeepInfra. DeepSeek V4 Flash is open-weights
 *  (MIT), so the same id resolves to the same underlying model
 *  everywhere it is hosted. */
export const DEEPINFRA_FLASH_MODEL = "deepseek-ai/DeepSeek-V4-Flash";

const DEEPINFRA_URL = "https://api.deepinfra.com/v1/openai/chat/completions";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export function deepInfraRequestBody(
  model: string,
  messages: ChatMessage[],
): Record<string, unknown> {
  return {
    model,
    messages,
    temperature: 0.4,
    max_tokens: 2200,
    stream: false,
    response_format: { type: "json_object" },
  };
}

/**
 * Call DeepInfra's chat completions endpoint. Returns the model's raw
 * string content (already JSON-shaped because we set
 * `response_format: json_object`). Throws `HttpsError` on transport
 * failure, non-2xx, or empty content — same shape as `callGroq` so
 * the fallback path can treat either provider identically.
 */
export async function callDeepInfra(
  apiKey: string,
  messages: ChatMessage[],
  model: string = DEEPINFRA_FLASH_MODEL,
): Promise<string> {
  if (!apiKey) {
    throw new HttpsError(
      "failed-precondition",
      "The DeepInfra API key is missing. Run `firebase functions:secrets:set DEEPINFRA_API_KEY` and redeploy.",
    );
  }

  let res: Response;
  try {
    res = await fetch(DEEPINFRA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(deepInfraRequestBody(model, messages)),
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
