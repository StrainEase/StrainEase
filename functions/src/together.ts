// Together.ai Chat Completions client.
//
// Used as the primary backend for describeStrainForUser and
// compareStrains. Together.ai exposes an OpenAI-compatible
// `/v1/chat/completions` endpoint at api.together.xyz, so the
// request/response shape mirrors `groq.ts` exactly.
//
// Model: Llama-3.1-8B-Instruct-Turbo. Same shape as the DeepInfra
// model we used previously — Llama 3.1 8B chat-tuned — but Together.ai
// runs it on a faster inference engine, so warm-call latency is
// materially lower than DeepInfra's on-demand tier (which was
// 15-25s on the 70B and still 5s+ on the 8B). DeepInfra was removed
// from the chain for this reason.
//
// Together.ai charges per token. Set a hard monthly usage limit in
// the Together.ai console so a worst case is bounded.
// `TOGETHER_API_KEY` is a Firebase Secret registered next to
// `GROQ_API_KEY`. The Firestore cache in ai-cache.ts absorbs most
// repeat traffic so the bill stays low.
//
// `max_tokens: 1500` mirrors the prior default and is enough for the
// 3-section description and the comparison summary.

import { HttpsError } from "firebase-functions/v2/https";

/** Model id registered on Together.ai. Llama 3.1 8B Turbo on the
 *  Together.ai inference engine. Chosen for warm-call latency. */
export const TOGETHER_MODEL = "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo";

const TOGETHER_URL = "https://api.together.xyz/v1/chat/completions";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export function togetherRequestBody(
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
 * Call Together.ai's chat completions endpoint. Returns the model's
 * raw string content (already JSON-shaped because we set
 * `response_format: json_object`). Throws `HttpsError` on transport
 * failure, non-2xx, or empty content — same shape as `callGroq` and
 * the prior `callDeepInfra` so the fallback path can treat any
 * provider identically.
 */
export async function callTogether(
  apiKey: string,
  messages: ChatMessage[],
  model: string = TOGETHER_MODEL,
): Promise<string> {
  if (!apiKey) {
    throw new HttpsError(
      "failed-precondition",
      "The Together.ai API key is missing. Run `firebase functions:secrets:set TOGETHER_API_KEY` and redeploy.",
    );
  }

  let res: Response;
  try {
    res = await fetch(TOGETHER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(togetherRequestBody(model, messages)),
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
