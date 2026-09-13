import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

import { callWithDeepInfraFallback } from "./ai-fallback";

// We mock fetch so we can drive both providers independently. The real
// callGroq and callDeepInfra are exercised in their own test files; here
// we only need them to honour the fetch mock so the fallback path can
// observe a DeepInfra failure and route to Groq.
const ORIGINAL_FETCH = globalThis.fetch;
let fetchMock: ReturnType<typeof mock> | undefined;

beforeEach(() => {
  fetchMock = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({ choices: [{ message: { content: "ok" } }] }),
        {
          status: 200,
        },
      ),
    ),
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  fetchMock = undefined;
});

function deepInfraFail(): Response {
  return new Response(
    JSON.stringify({ error: { message: "Rate limit reached (TPM)" } }),
    { status: 429 },
  );
}

function groqOk(body: string): Response {
  return new Response(
    JSON.stringify({ choices: [{ message: { content: body } }] }),
    { status: 200 },
  );
}

function groqFail(): Response {
  return new Response(
    JSON.stringify({ error: { message: "Groq also rate-limited" } }),
    { status: 429 },
  );
}

const isGroqUrl = (url: string) => url.includes("api.groq.com");
const isDeepInfraUrl = (url: string) => url.includes("api.deepinfra.com");

describe("callWithDeepInfraFallback", () => {
  test("returns the DeepInfra response when DeepInfra succeeds (no fallback)", async () => {
    fetchMock!.mockImplementation((url) =>
      isDeepInfraUrl(String(url))
        ? Promise.resolve(groqOk("from-deepinfra"))
        : Promise.resolve(groqOk("from-groq")),
    );
    const out = await callWithDeepInfraFallback(
      "d",
      "g",
      [{ role: "user", content: "x" }],
      "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      "openai/gpt-oss-20b",
    );
    expect(out).toBe("from-deepinfra");
  });

  test("falls through to Groq when DeepInfra returns 429 (transient)", async () => {
    fetchMock!.mockImplementation((url) =>
      isDeepInfraUrl(String(url))
        ? Promise.resolve(deepInfraFail())
        : Promise.resolve(groqOk("from-groq")),
    );
    const out = await callWithDeepInfraFallback(
      "d",
      "g",
      [{ role: "user", content: "x" }],
      "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      "openai/gpt-oss-20b",
    );
    expect(out).toBe("from-groq");
  });

  test("falls through on DeepInfra 503 (transient)", async () => {
    fetchMock!.mockImplementation((url) =>
      isDeepInfraUrl(String(url))
        ? Promise.resolve(
            new Response(
              JSON.stringify({ message: "503 Service Unavailable" }),
              {
                status: 503,
              },
            ),
          )
        : Promise.resolve(groqOk("from-groq")),
    );
    const out = await callWithDeepInfraFallback(
      "d",
      "g",
      [{ role: "user", content: "x" }],
      "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      "openai/gpt-oss-120b",
    );
    expect(out).toBe("from-groq");
  });

  test("falls through on a transport-level rejection (no HttpsError)", async () => {
    fetchMock!.mockImplementation((url) =>
      isDeepInfraUrl(String(url))
        ? Promise.reject(new Error("dns failure"))
        : Promise.resolve(groqOk("from-groq")),
    );
    const out = await callWithDeepInfraFallback(
      "d",
      "g",
      [{ role: "user", content: "x" }],
      "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      "openai/gpt-oss-20b",
    );
    expect(out).toBe("from-groq");
  });

  test("does NOT fall through on a permanent DeepInfra failure (bad key)", async () => {
    let groqCalled = false;
    fetchMock!.mockImplementation((url) => {
      if (isGroqUrl(String(url))) groqCalled = true;
      return Promise.resolve(groqOk("never"));
    });
    await expect(
      callWithDeepInfraFallback(
        "",
        "g",
        [{ role: "user", content: "x" }],
        "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        "openai/gpt-oss-20b",
      ),
    ).rejects.toThrow(/DEEPINFRA_API_KEY/);
    expect(groqCalled).toBe(false);
  });

  test("surfaces the Groq error if Groq also fails", async () => {
    fetchMock!.mockImplementation((url) =>
      isDeepInfraUrl(String(url))
        ? Promise.resolve(deepInfraFail())
        : Promise.resolve(groqFail()),
    );
    await expect(
      callWithDeepInfraFallback(
        "d",
        "g",
        [{ role: "user", content: "x" }],
        "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        "openai/gpt-oss-20b",
      ),
    ).rejects.toThrow(/Groq also rate-limited/);
  });

  test("routes to the Groq model the caller asked for", async () => {
    let groqBody: Record<string, unknown> | undefined;
    globalThis.fetch = (async (u: unknown, init: unknown) => {
      const url = String(u);
      if (isDeepInfraUrl(url)) return deepInfraFail();
      groqBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return groqOk("ok");
    }) as unknown as typeof fetch;
    await callWithDeepInfraFallback(
      "d",
      "g",
      [{ role: "user", content: "x" }],
      "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      "openai/gpt-oss-120b",
    );
    expect(groqBody?.model).toBe("openai/gpt-oss-120b");
  });
});
