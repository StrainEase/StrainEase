// DeepInfra → Groq fallback helper for the AI callables.
//
// DeepInfra is now the primary backend (Llama 3.3 70B Turbo on
// meta-llama/Llama-3.3-70B-Instruct-Turbo). Groq is the last-resort
// fallback. Reasoning: Groq's free tier caps each chat model at
// 8000 TPM and intermittently truncates responses mid-stream when
// the TPM ceiling is hit mid-generation (we observed 2-of-3 sections
// coming back from gpt-oss-20b on what should have been a routine
// call). DeepInfra charges per token but produces complete
// responses, so the failure mode shifts from "user sees a 500" to
// "user pays a tenth of a cent". The Firestore cache in ai-cache.ts
// absorbs most repeat traffic so the bill stays bounded.
//
// "Unavailable" means the request failed for a reason that suggests
// the next call would also fail (rate limit, 5xx, transport error).
// We do NOT fall through on validation errors — those will reproduce
// against the fallback too and just waste a paid token.
//
// Logging: every fallback emits a `logger.warn` with the source so
// ops can see the rate in Cloud Logging. The Cloud Monitoring alert
// `Groq → DeepInfra fallback rate spike` should be renamed to
// `DeepInfra → Groq fallback rate spike` because the fallback
// direction is now reversed.

import { logger } from "firebase-functions";
import { HttpsError } from "firebase-functions/v2/https";

import { callDeepInfra, type ChatMessage } from "./deepinfra";
import { callGroq } from "./groq";

function isTransient(err: unknown): boolean {
  if (!(err instanceof HttpsError)) return true; // transport-level
  switch (err.code) {
    case "unavailable":
      return true;
    case "internal": {
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
 * Try DeepInfra first; if it returns a transient failure, retry the
 * same messages against Groq (free tier, paid nothing but capped at
 * 8000 TPM). Returns the model's raw content string.
 *
 * `deepInfraModel` is the primary model id (always Llama 3.3 70B
 * Turbo at the moment). `groqModel` is the fallback model id the
 * caller wants — descriptions pass `openai/gpt-oss-20b` (small,
 * cheap on tokens), comparisons pass `openai/gpt-oss-120b` (heavier
 * reasoning). The split mirrors the existing deliberate Groq routing
 * and lets us pick a smaller model on the fallback when the prompt
 * is small.
 */
export async function callWithDeepInfraFallback(
  deepInfraApiKey: string,
  groqApiKey: string,
  messages: ChatMessage[],
  deepInfraModel: string,
  groqModel: string,
): Promise<string> {
  try {
    return await callDeepInfra(deepInfraApiKey, messages, deepInfraModel);
  } catch (err) {
    if (!isTransient(err)) throw err;
    logger.warn(
      "ai-fallback: deepinfra failed transiently, falling through to groq",
      {
        deepInfraModel,
        groqModel,
        message: err instanceof Error ? err.message : String(err),
      },
    );
    return await callGroq(groqApiKey, messages, groqModel);
  }
}

/** Re-export for callers that need the default fallback model. */
export { DEEPINRA_FALLBACK_MODEL } from "./deepinfra";
