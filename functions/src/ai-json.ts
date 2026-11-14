// JSON extraction + sanitization for AI responses.
//
// Provider-neutral helper shared by every AI callable. We request
// `response_format: { type: "json_object" }` from the model so the
// raw response is usually a single object, but the helper stays
// defensive against a stray preamble, markdown fence, or `<think>`
// reasoning block, all of which we strip before parsing.
//
// Every string in the parsed response goes through the anti-slop pass
// (`./anti-slop.ts`) before it leaves this module. That pass rewrites
// em dashes into real punctuation, drops stock AI filler, and turns
// third-person references to the reader ("the patient") into direct
// address ("you"). The Kaya prompts already ask for that style, but a
// prompt line alone does not hold across every model and every
// provider, so the copy is cleaned here as well.

import { antiSlopObject } from "./anti-slop";

/**
 * Extract a JSON object from a model response, tolerating stray text,
 * markdown fences, and `<think>` tags. Even though we request JSON
 * mode from the provider, the helper stays defensive in case a future
 * model slips a preamble or reasoning block in. All string values run
 * through the anti-slop pass.
 */
export function extractJsonObject(content: string): unknown | null {
  const stripped = content
    .replace(/<think\b[^>]*>[\s\S]*?<\/think>/gi, "")
    .trim();
  try {
    const parsed = JSON.parse(stripped);
    return antiSlopObject(parsed);
  } catch {
    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        const parsed = JSON.parse(stripped.slice(start, end + 1));
        return antiSlopObject(parsed);
      } catch {
        return null;
      }
    }
    return null;
  }
}
