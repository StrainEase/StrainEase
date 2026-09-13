// Groq → DeepInfra fallback helper for the AI callables.
//
// Groq is the primary free-tier backend. Its 8000 TPM limit is enough
// for normal traffic; during heavy sessions (a user opening several
// strain pages in a minute) Groq returns 429. Rather than surface the
// 500 to the client, fall through to DeepInfra's metered DeepSeek
// V4 Flash endpoint. DeepInfra charges per token so we only land
// there when Groq is genuinely unavailable.
//
// "Unavailable" means the request failed for a reason that suggests
// the next call would also fail (rate limit, 5xx, transport error).
// We do NOT fall through on validation errors — those will reproduce
// against DeepInfra too and just waste a paid token.
//
// Logging: every fallback emits a `logger.warn` with the source so
// ops can see the rate in Cloud Logging.

import { logger } from "firebase-functions";
import { HttpsError } from "firebase-functions/v2/https";

import {
  callDeepInfra,
  DEEPINRA_FALLBACK_MODEL,
  type ChatMessage,
} from "./deepinfra";
import { callGroq } from "./groq";

function isTransient(err: unknown): boolean {
  if (!(err instanceof HttpsError)) return true; // transport-level
  switch (err.code) {
    case "unavailable":
      return true;
    case "internal": {
      // callGroq / callDeepInfra wrap a non-2xx response as "internal"
      // with the upstream status text in the message. We can't see the
      // status directly, but the messages we care about include the
      // well-known shapes Groq + DeepInfra use for 429 / 5xx. A
      // positive list keeps false positives out.
      const m = (err.message ?? "").toLowerCase();
      return (
        m.includes("rate limit") ||
        m.includes("429") ||
        m.includes("tpm") ||
        m.includes("tokens per minute") ||
        m.includes("502") ||
        m.includes("503") ||
        m.includes("504") ||
        m.includes("server error") ||
        m.includes("overloaded")
      );
    }
    default:
      return false;
  }
}

/**
 * Try Groq first; if it returns a transient failure, retry the same
 * messages against DeepInfra. Returns the model's raw content string.
 *
 * `groqModel` and `deepInfraModel` are passed separately so the caller
 * can keep the existing deliberate routing split (descriptions on the
 * smaller OSS-20B, comparisons on OSS-120B) on Groq, while the
 * fallback always uses DeepSeek V4 Flash on DeepInfra because that
 * model handles both workloads at lower per-token cost.
 */
export async function callWithGroqFallback(
  groqApiKey: string,
  deepInfraApiKey: string,
  messages: ChatMessage[],
  groqModel: string,
  deepInfraModel: string = DEEPINRA_FALLBACK_MODEL,
): Promise<string> {
  try {
    return await callGroq(groqApiKey, messages, groqModel);
  } catch (err) {
    if (!isTransient(err)) throw err;
    logger.warn(
      "ai-fallback: groq failed transiently, falling through to deepinfra",
      {
        groqModel,
        deepInfraModel,
        message: err instanceof Error ? err.message : String(err),
      },
    );
    return await callDeepInfra(deepInfraApiKey, messages, deepInfraModel);
  }
}
