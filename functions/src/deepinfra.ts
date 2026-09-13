// DeepInfra Chat Completions client.
//
// Used as a fallback when Groq returns 429 (rate limit) or 5xx.
// `index.ts` (describeStrainForUser / compareStrains) tries Groq first
// because it is free, then falls through to DeepInfra with the same
// messages. The cache layer in `ai-cache.ts` short-circuits repeat
// calls before either provider is hit.
//
// Model: Llama-3.3-70B-Instruct-Turbo. We previously used
// `deepseek-ai/DeepSeek-V4-Flash` because it is the cheapest metered
// option on DeepInfra ($0.09 input / $0.18 output per 1M tokens), but
// it is a coding/agentic-tuned model that produces terse 1-2 sentence
// paragraphs even when the prompt asks for more. Llama 3.3 70B Turbo
// is Meta's chat-tuned 70B at $0.10 / $0.32 per 1M tokens and writes
// the multi-paragraph prose the prompt asks for. Cost difference is
// roughly $0.14 per million output tokens; the cache absorbs the bulk
// of repeat calls, so this stays under a few dollars per month at
// typical traffic.
//
// DeepInfra exposes an OpenAI-compatible `/v1/openai/chat/completions`
// endpoint, so the request/response shape mirrors `groq.ts` exactly.
// The single behavioural difference: we pass `stream: false` explicitly
// because DeepInfra's OpenAI shim defaults to streaming when the field
// is omitted, which would return a `ReadableStream` body that our
// `res.json()` cannot parse.

import { HttpsError } from "firebase-functions/v2/https";

/** Model id registered on DeepInfra. Llama 3.1 8B Turbo at $0.02 input /
 *  $0.04 output per 1M tokens. Chosen over the 70B variant for
 *  latency: warm-call latency on DeepInfra's on-demand tier is ~5s
 *  for the 8B versus ~15-25s for the 70B. The 8B is chat-tuned and
 *  the prompt asks for the same multi-paragraph prose shape either
 *  way, so the prose-quality difference is small in practice. */
export const DEEPINRA_FALLBACK_MODEL =
  "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo";

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
    temperature: 0.5,
    max_tokens: 1500,
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
  model: string = DEEPINRA_FALLBACK_MODEL,
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
