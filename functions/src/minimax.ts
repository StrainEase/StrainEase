import { HttpsError } from "firebase-functions/v2/https";

export const MINIMAX_MODEL = "MiniMax-M2.5-highspeed";
const MINIMAX_URL = "https://api.minimax.io/v1/chat/completions";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function callMiniMax(
  apiKey: string,
  messages: ChatMessage[],
): Promise<string> {
  if (!apiKey) {
    throw new HttpsError(
      "failed-precondition",
      "The MiniMax API key is missing. Run `firebase functions:secrets:set MINIMAX_API_KEY` and redeploy.",
    );
  }

  let res: Response;
  try {
    res = await fetch(MINIMAX_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MINIMAX_MODEL,
        messages,
        temperature: 0.4,
        max_completion_tokens: 1600,
        // M2.x models always think; extractJsonObject tolerates <think> tags.
      }),
    });
  } catch {
    throw new HttpsError(
      "unavailable",
      "Could not reach the MiniMax research service. Please try again in a moment.",
    );
  }

  const data = (await res.json().catch(() => null)) as {
    error?: { message?: string };
    base_resp?: { status_msg?: string };
    message?: string;
    choices?: { message?: { content?: string } }[];
  } | null;

  if (!res.ok) {
    const detail =
      data?.error?.message ??
      data?.base_resp?.status_msg ??
      data?.message ??
      `status ${res.status}`;
    throw new HttpsError(
      "internal",
      `The MiniMax research service returned an error: ${detail}`,
    );
  }

  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim() === "") {
    throw new HttpsError(
      "internal",
      "The MiniMax research service returned an empty response. Please try again.",
    );
  }
  return content;
}

/**
 * Extract a JSON object from a model response, tolerating <think> tags,
 * markdown fences, and stray text around the JSON.
 */
export function extractJsonObject(content: string): unknown | null {
  try {
    return JSON.parse(content);
  } catch {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(content.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}
