import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { callWithGroqFallback } from "./ai-fallback";

const ORIGINAL_FETCH = globalThis.fetch;
let mockImpl: (url: string) => Promise<Response> = () =>
  Promise.resolve(
    new Response(
      JSON.stringify({ choices: [{ message: { content: "ok" } }] }),
      {
        status: 200,
      },
    ),
  );

beforeEach(() => {
  globalThis.fetch = ((url: unknown, init: unknown) =>
    mockImpl(String(url))) as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  mockImpl = () =>
    Promise.resolve(
      new Response(
        JSON.stringify({ choices: [{ message: { content: "ok" } }] }),
        { status: 200 },
      ),
    );
});

function groqFail(): Response {
  return new Response(
    JSON.stringify({ error: { message: "Rate limit reached (TPM)" } }),
    { status: 429 },
  );
}

function groqBadKeyFail(): Response {
  return new Response(
    JSON.stringify({
      error: {
        message:
          "The Groq API key is missing. Run `firebase functions:secrets:set GROQ_API_KEY`",
      },
    }),
    { status: 400 },
  );
}

function deepInfraOk(body: string): Response {
  return new Response(
    JSON.stringify({ choices: [{ message: { content: body } }] }),
    { status: 200 },
  );
}

function deepInfraFail(): Response {
  return new Response(
    JSON.stringify({ error: { message: "DeepInfra also rate-limited" } }),
    { status: 429 },
  );
}

const isGroqUrl = (url: string) => url.includes("api.groq.com");
const isDeepInfraUrl = (url: string) => url.includes("api.deepinfra.com");

describe("callWithGroqFallback", () => {
  test("returns the Groq response when Groq succeeds (no fallback)", async () => {
    mockImpl = (url) =>
      isGroqUrl(url)
        ? Promise.resolve(deepInfraOk("from-groq"))
        : Promise.resolve(deepInfraOk("from-deepinfra"));
    const out = await callWithGroqFallback(
      "g",
      "d",
      [{ role: "user", content: "x" }],
      "openai/gpt-oss-20b",
    );
    expect(out).toBe("from-groq");
  });

  test("falls through to DeepInfra when Groq returns 429 (transient)", async () => {
    mockImpl = (url) =>
      isGroqUrl(url)
        ? Promise.resolve(groqFail())
        : Promise.resolve(deepInfraOk("from-deepinfra"));
    const out = await callWithGroqFallback(
      "g",
      "d",
      [{ role: "user", content: "x" }],
      "openai/gpt-oss-20b",
    );
    expect(out).toBe("from-deepinfra");
  });

  test("falls through on Groq 503 (transient)", async () => {
    mockImpl = (url) =>
      isGroqUrl(url)
        ? Promise.resolve(
            new Response(
              JSON.stringify({ message: "503 Service Unavailable" }),
              {
                status: 503,
              },
            ),
          )
        : Promise.resolve(deepInfraOk("from-deepinfra"));
    const out = await callWithGroqFallback(
      "g",
      "d",
      [{ role: "user", content: "x" }],
      "openai/gpt-oss-120b",
    );
    expect(out).toBe("from-deepinfra");
  });

  test("falls through on a transport-level rejection (no HttpsError)", async () => {
    mockImpl = (url) =>
      isGroqUrl(url)
        ? Promise.reject(new Error("dns failure"))
        : Promise.resolve(deepInfraOk("from-deepinfra"));
    const out = await callWithGroqFallback(
      "g",
      "d",
      [{ role: "user", content: "x" }],
      "openai/gpt-oss-20b",
    );
    expect(out).toBe("from-deepinfra");
  });

  test("does NOT fall through on a permanent Groq failure (bad key)", async () => {
    // An empty api key triggers a failed-precondition HttpsError from
    // callGroq BEFORE fetch is called. The fallback helper sees the
    // non-transient code and rethrows.
    let deepInfraCalled = false;
    mockImpl = (url) => {
      if (isDeepInfraUrl(url)) deepInfraCalled = true;
      return Promise.resolve(deepInfraOk("never"));
    };
    await expect(
      callWithGroqFallback(
        "",
        "d",
        [{ role: "user", content: "x" }],
        "openai/gpt-oss-20b",
      ),
    ).rejects.toThrow(/GROQ_API_KEY/);
    expect(deepInfraCalled).toBe(false);
  });

  test("surfaces the DeepInfra error if DeepInfra also fails", async () => {
    mockImpl = (url) =>
      isGroqUrl(url)
        ? Promise.resolve(groqFail())
        : Promise.resolve(deepInfraFail());
    await expect(
      callWithGroqFallback(
        "g",
        "d",
        [{ role: "user", content: "x" }],
        "openai/gpt-oss-20b",
      ),
    ).rejects.toThrow(/DeepInfra also rate-limited/);
  });

  test("routes to the DeepInfra model the caller asked for", async () => {
    let seenModel: string | undefined;
    mockImpl = (url) => {
      if (isGroqUrl(url)) return Promise.resolve(groqFail());
      seenModel = JSON.parse(url as unknown as never as never) as never;
      return Promise.resolve(deepInfraOk("ok"));
    };
    // Capture the second fetch's body to verify the model name.
    let deepInfraBody: Record<string, unknown> | undefined;
    globalThis.fetch = (async (u: unknown, init: unknown) => {
      const url = String(u);
      if (isDeepInfraUrl(url)) {
        deepInfraBody = JSON.parse(String(init?.body)) as Record<
          string,
          unknown
        >;
        return deepInfraOk("ok");
      }
      return groqFail();
    }) as unknown as typeof fetch;
    await callWithGroqFallback(
      "g",
      "d",
      [{ role: "user", content: "x" }],
      "openai/gpt-oss-120b",
      "deepseek-ai/DeepSeek-V4-Pro",
    );
    expect(deepInfraBody?.model).toBe("deepseek-ai/DeepSeek-V4-Pro");
  });
});
