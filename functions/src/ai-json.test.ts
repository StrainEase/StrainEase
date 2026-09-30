import { describe, expect, test } from "bun:test";
import { extractJsonObject } from "./ai-json";

describe("extractJsonObject", () => {
  test("strips <think> tags that contain braces", () => {
    const content = [
      '<think>I will return {"scratch": true} then the real object.</think>',
      '{"headline":"A calm night pick.","summary":"Go with GDP."}',
    ].join("");
    expect(extractJsonObject(content)).toEqual({
      headline: "A calm night pick.",
      summary: "Go with GDP.",
    });
  });

  test("still parses a bare JSON object", () => {
    expect(extractJsonObject('{"ok":true}')).toEqual({ ok: true });
  });

  test("rewrites em dashes to en dashes in nested string fields", () => {
    const content = '{"title":"a\u2014b","child":["c\u2014d"]}';
    expect(extractJsonObject(content)).toEqual({
      title: "a\u2013b",
      child: ["c\u2013d"],
    });
  });
});
