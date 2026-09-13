import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

import {
  callDeepInfra,
  DEEPINRA_FALLBACK_MODEL,
  deepInfraRequestBody,
} from "./deepinfra";

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

describe("deepInfraRequestBody", () => {
  test("targets the Llama 3.3 70B Turbo model on DeepInfra", () => {
    const body = deepInfraRequestBody(DEEPINRA_FALLBACK_MODEL, [
      { role: "system", content: "stable instructions" },
      { role: "user", content: "dynamic strain data" },
    ]);
    expect(body.model).toBe(DEEPINRA_FALLBACK_MODEL);
  });

  test("forces non-streaming (DeepInfra OpenAI shim defaults to streaming)", () => {
    const body = deepInfraRequestBody(DEEPINRA_FALLBACK_MODEL, [
      { role: "user", content: "x" },
    ]);
    expect(body.stream).toBe(false);
  });

  test("requests strict JSON output", () => {
    const body = deepInfraRequestBody(DEEPINRA_FALLBACK_MODEL, [
      { role: "user", content: "x" },
    ]);
    expect(body.response_format).toEqual({ type: "json_object" });
  });
});

describe("callDeepInfra", () => {
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
    const out = await callDeepInfra("test-key", [
      { role: "user", content: "hi" },
    ]);
    expect(out).toBe('{"sections":[]}');
  });

  test("throws failed-precondition when the key is missing", async () => {
    await expect(
      callDeepInfra("", [{ role: "user", content: "x" }]),
    ).rejects.toThrow(/DeepInfra API key is missing/);
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
      callDeepInfra("k", [{ role: "user", content: "x" }]),
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
      callDeepInfra("k", [{ role: "user", content: "x" }]),
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
      callDeepInfra("k", [{ role: "user", content: "x" }]),
    ).rejects.toThrow(/empty response/);
  });

  test("throws unavailable when fetch itself rejects (network error)", async () => {
    fetchMock!.mockImplementationOnce(() =>
      Promise.reject(new Error("dns failure")),
    );
    await expect(
      callDeepInfra("k", [{ role: "user", content: "x" }]),
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
    await callDeepInfra("secret-key", [{ role: "user", content: "x" }]);
    // Inspect the most recent call's init (second positional arg).
    const call = fetchMock!.mock.calls.at(-1) as
      | [unknown, RequestInit]
      | undefined;
    const headers = call?.[1]?.headers as Record<string, string> | undefined;
    expect(headers?.Authorization).toBe("Bearer secret-key");
  });
});
