// JSON extraction + sanitization for AI responses.
//
// Provider-neutral helper shared by every AI callable. We request
// `response_format: { type: "json_object" }` from the model so the
// raw response is usually a single object, but the helper stays
// defensive against a stray preamble, markdown fence, or `<think>`
// reasoning block — all of which we strip before parsing. Em dashes
// in any string value get rewritten to en dashes so the output
// renders consistently across web, iOS, and Android (AI models
// generate em dashes far more often than people realize).

/**
 * Sanitize a string by replacing em dashes with en dashes to ensure
 * consistent rendering across all platforms. AI models sometimes
 * generate em dashes in their responses.
 */
function sanitizeString(str: string): string {
  return str.replace(/\u2014/g, "\u2013"); // em dash → en dash
}

/**
 * Recursively sanitize all string values in a JSON object.
 * Applied after parsing to catch em dashes that slip through in
 * any field.
 */
function sanitizeObject(obj: unknown): unknown {
  if (typeof obj === "string") {
    return sanitizeString(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = sanitizeObject(value);
    }
    return result;
  }
  return obj;
}

/**
 * Extract a JSON object from a model response, tolerating stray text,
 * markdown fences, and `<think>` tags. Even though we request JSON
 * mode from the provider, the helper stays defensive in case a future
 * model slips a preamble or reasoning block in. All string values are
 * sanitized to replace em dashes with en dashes.
 */
export function extractJsonObject(content: string): unknown | null {
  const stripped = content
    .replace(/<think\b[^>]*>[\s\S]*?<\/think>/gi, "")
    .trim();
  try {
    const parsed = JSON.parse(stripped);
    return sanitizeObject(parsed);
  } catch {
    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        const parsed = JSON.parse(stripped.slice(start, end + 1));
        return sanitizeObject(parsed);
      } catch {
        return null;
      }
    }
    return null;
  }
}
