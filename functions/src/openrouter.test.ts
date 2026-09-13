import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

import {
  callOpenRouter,
  OPENROUTER_MODEL,
  openRouterRequestBody,
} from "./openrouter";

const ORIGINAL_FETCH = globalThis.fetch;

let fetchMock: ReturnType<typeof mock> | undefined;

beforeEach(() => {
  fetchMock = mock(() => Promise.resolve(new Response("{}")));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  fetchMock = undefined;
});

describe("openRouterRequestBody", () => {
  test("targets the Llama 3.3 70B model on OpenRouter", () => {
    const body = openRouterRequestBody(OPENROUTER_MODEL, [
      { role: "system", content: "stable instructions" },
      { role: "user", content: "dynamic strain data" },
    ]);
    expect(body.model).toBe(OPENROUTER_MODEL);
  });

  test("requests strict JSON output", () => {
    const body = openRouterRequestBody(OPENROUTER_MODEL, [
      { role: "user", content: "x" },
    ]);
    expect(body.response_format).toEqual({ type: "json_object" });
  });
});

describe("callOpenRouter", () => {
  test("returns the first-choice content on a 2xx response", async () => {
    fetchMock!.mockImplementationOnce(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: '{"sections":[]}' } }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    const out = await callOpenRouter("test-key", [
      { role: "user", content: "hi" },
    ]);
    expect(out).toBe('{"sections":[]}');
  });

  test("throws failed-precondition when the key is missing", async () => {
    await expect(
      callOpenRouter("", [{ role: "user", content: "x" }]),
    ).rejects.toThrow(/OpenRouter API key is missing/);
  });

  test("throws internal with the upstream message on a 429", async () => {
    fetchMock!.mockImplementationOnce(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ error: { message: "Rate limit reached" } }),
          { status: 429 },
        ),
      ),
    );
    await expect(
      callOpenRouter("k", [{ role: "user", content: "x" }]),
    ).rejects.toThrow(/Rate limit reached/);
  });

  test("throws internal with the upstream message on a 500", async () => {
    fetchMock!.mockImplementationOnce(() =>
      Promise.resolve(
        new Response(JSON.stringify({ message: "internal error" }), {
          status: 500,
        }),
      ),
    );
    await expect(
      callOpenRouter("k", [{ role: "user", content: "x" }]),
    ).rejects.toThrow(/internal error/);
  });

  test("throws internal on empty content", async () => {
    fetchMock!.mockImplementationOnce(() =>
      Promise.resolve(
        new Response(JSON.stringify({ choices: [{ message: {} }] }), {
          status: 200,
        }),
      ),
    );
    await expect(
      callOpenRouter("k", [{ role: "user", content: "x" }]),
    ).rejects.toThrow(/empty response/);
  });

  test("throws unavailable when fetch itself rejects (network error)", async () => {
    fetchMock!.mockImplementationOnce(() =>
      Promise.reject(new Error("dns failure")),
    );
    await expect(
      callOpenRouter("k", [{ role: "user", content: "x" }]),
    ).rejects.toThrow(/Could not reach/);
  });

  test("sends a Bearer Authorization header", async () => {
    fetchMock!.mockImplementationOnce(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ choices: [{ message: { content: "ok" } }] }),
          { status: 200 },
        ),
      ),
    );
    await callOpenRouter("secret-key", [{ role: "user", content: "x" }]);
    const call = fetchMock!.mock.calls.at(-1) as
      | [unknown, RequestInit]
      | undefined;
    const headers = call?.[1]?.headers as Record<string, string> | undefined;
    expect(headers?.Authorization).toBe("Bearer secret-key");
  });

  test("targets the openrouter.ai host", async () => {
    fetchMock!.mockImplementationOnce(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ choices: [{ message: { content: "ok" } }] }),
          { status: 200 },
        ),
      ),
    );
    await callOpenRouter("k", [{ role: "user", content: "x" }]);
    const call = fetchMock!.mock.calls.at(-1) as
      | [string, RequestInit]
      | undefined;
    expect(call?.[0]).toContain("openrouter.ai");
  });
});
