import { describe, expect, test } from "bun:test";
import {
  groqRequestBody,
  GROQ_DESCRIPTION_MODEL,
  GROQ_MODEL,
} from "./groq";

describe("groqRequestBody", () => {
  test("routes descriptions to GPT-OSS 20B with a cache-friendly message order", () => {
    const body = groqRequestBody(GROQ_DESCRIPTION_MODEL, [
      { role: "system", content: "stable instructions" },
      { role: "user", content: "dynamic strain data" },
    ]);

    expect(body.model).toBe(GROQ_DESCRIPTION_MODEL);
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages).toEqual([
      { role: "system", content: "stable instructions" },
      { role: "user", content: "dynamic strain data" },
    ]);
  });

  test("keeps GPT-OSS 120B as the default for higher-value requests", () => {
    const body = groqRequestBody(GROQ_MODEL, [
      { role: "system", content: "stable instructions" },
      { role: "user", content: "dynamic strain data" },
    ]);

    expect(body.model).toBe(GROQ_MODEL);
  });
});
