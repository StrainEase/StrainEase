import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";

// Stub global fetch so the hook's hydration fetches (which run in
// the background after a URL is published) don't actually try to
// hit the network. The default returns an ok response so the
// hydration path is a no-op; individual tests can override.
const originalFetch = globalThis.fetch;
globalThis.fetch = mock(() =>
  Promise.resolve(new Response("", { status: 200 })),
) as unknown as typeof fetch;

// Mock the firebase-backed modules so the hook resolves through
// the three-tier path entirely in-memory. The mocks let each test
// control the order in which the cache lookup and the proxy call
// resolve, which is the surface area the Greptile races exposed.
mock.module("@/lib/strain-api", () => ({
  cachedStrainImage: mock(() => Promise.reject(new Error("not configured"))),
}));
mock.module("@/lib/image-blob-cache", () => ({
  getCachedImage: mock(() => Promise.resolve(null)),
  putCachedImage: mock(() => Promise.resolve()),
  releaseImage: mock(() => {}),
}));

import { useStrainImage } from "./use-strain-image";
import { cachedStrainImage } from "@/lib/strain-api";
import { getCachedImage, putCachedImage } from "@/lib/image-blob-cache";

// Helpers for the mocked modules so individual tests can swap in
// fresh implementations without touching the global mock module.
const cachedStrainImageMock = cachedStrainImage as unknown as ReturnType<
  typeof mock
> & ((...args: unknown[]) => Promise<unknown>);
const getCachedImageMock = getCachedImage as unknown as ReturnType<typeof mock> & ((
  ...args: unknown[]
) => Promise<unknown>);
const putCachedImageMock = putCachedImage as unknown as ReturnType<typeof mock> & ((
  ...args: unknown[]
) => Promise<void>);

/** Manually-controllable promise so tests can pick the resolve order. */
function deferred<T>(): { promise: Promise<T>; resolve: (v: T) => void; reject: (e: unknown) => void } {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  cachedStrainImageMock.mockReset();
  getCachedImageMock.mockReset();
  putCachedImageMock.mockReset();
  // Default to "no cache hit, proxy throws" so tests have to opt
  // into the layers they care about.
  getCachedImageMock.mockImplementation(() => Promise.resolve(null));
  cachedStrainImageMock.mockImplementation(() =>
    Promise.reject(new Error("not configured")),
  );
  putCachedImageMock.mockImplementation(() => Promise.resolve());
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  globalThis.fetch = originalFetch;
});

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("useStrainImage", () => {
  test("publishes the proxy URL and exposes it as the image src", async () => {
    cachedStrainImageMock.mockImplementation(() =>
      Promise.resolve({ url: "https://proxy.example/img.jpg", contentType: "image/jpeg" }),
    );

    const { result } = renderHook(() => useStrainImage("https://leafly.com/strain"));
    await waitFor(() => expect(result.current.url).toBe("https://proxy.example/img.jpg"));
    expect(result.current.exhausted).toBe(false);
  });

  test("proxy URL fails -> retry() advances to upstream, not exhausted", async () => {
    const proxyUrl = "https://proxy.example/img.jpg";
    cachedStrainImageMock.mockImplementation(() =>
      Promise.resolve({ url: proxyUrl, contentType: "image/jpeg" }),
    );

    const { result } = renderHook(() => useStrainImage("https://leafly.com/strain"));
    await waitFor(() => expect(result.current.url).toBe(proxyUrl));

    await act(async () => {
      result.current.retry();
    });

    // The proxy URL is the same as the upstream src in our test
    // harness (cachedStrainImage only resolves to it on success).
    // The retry() function should not flip exhausted to true after
    // just one attempt — the upstream tier must still be tried.
    expect(result.current.exhausted).toBe(false);
  });

  test("two failures in a row -> exhausted flips to true", async () => {
    cachedStrainImageMock.mockImplementation(() =>
      Promise.resolve({ url: "https://proxy.example/img.jpg", contentType: "image/jpeg" }),
    );

    const { result } = renderHook(() => useStrainImage("https://leafly.com/strain"));
    await waitFor(() => expect(result.current.url).toBe("https://proxy.example/img.jpg"));

    // First retry (proxy tier failed, advance to upstream).
    await act(async () => {
      result.current.retry();
    });
    expect(result.current.exhausted).toBe(false);

    // Second retry (upstream tier failed, mark exhausted).
    await act(async () => {
      result.current.retry();
    });
    await waitFor(() => expect(result.current.exhausted).toBe(true));
  });

  test("proxy call itself throws -> upstream published, retry can still mark exhausted", async () => {
    cachedStrainImageMock.mockImplementation(() =>
      Promise.reject(new Error("network")),
    );

    const { result } = renderHook(() => useStrainImage("https://leafly.com/strain"));
    await waitFor(() => expect(result.current.url).toBe("https://leafly.com/strain"));

    // Upstream URL is the src itself in this harness (the .catch
    // handler publishes src as the last-resort fallback).
    // First retry(): tierRef is already "done" from the catch
    // handler, so this should land in the exhausted branch.
    await act(async () => {
      result.current.retry();
    });
    await waitFor(() => expect(result.current.exhausted).toBe(true));
  });

  test("cache lookup finishing after the proxy does not block upstream retry", async () => {
    // This is the race Greptile flagged: cache hit resolves AFTER
    // the proxy. The cache callback used to flip tierRef to "done"
    // unconditionally, which would block retry() from advancing to
    // the upstream tier on a dead proxy URL. The fix only flips
    // tierRef when the cache actually wins the race.
    const proxyUrl = "https://proxy.example/img.jpg";
    cachedStrainImageMock.mockImplementation(() =>
      Promise.resolve({ url: proxyUrl, contentType: "image/jpeg" }),
    );
    const cacheDeferred = deferred<{ url: string; contentType: string } | null>();
    getCachedImageMock.mockImplementation(() => cacheDeferred.promise);

    const { result } = renderHook(() => useStrainImage("https://leafly.com/strain"));
    await waitFor(() => expect(result.current.url).toBe(proxyUrl));

    // Now the cache lookup finally resolves. Proxy already won.
    await act(async () => {
      cacheDeferred.resolve({ url: "blob:https://cache/old", contentType: "image/jpeg" });
    });
    // Give the microtask queue a tick to settle.
    await wait(0);

    // The proxy URL is still the active one. retry() should still
    // be able to advance to the upstream tier (not flip to
    // exhausted) because tierRef was NOT clobbered to "done" by
    // the late cache hit.
    await act(async () => {
      result.current.retry();
    });
    expect(result.current.exhausted).toBe(false);
  });

  test("proxy URL fails and upstream URL also fails -> exhausted only after second retry", async () => {
    // This is the "upstream failure skips exhaustion" race: first
    // retry() (proxy tier) used to clear resolvedForSrcRef without
    // restoring it, so the second retry() (upstream tier) saw
    // resolvedForSrcRef as undefined and returned before setting
    // exhausted. The fix keeps the ref across the tier boundary
    // and resets failedUrlRef when publishing the upstream URL.
    cachedStrainImageMock.mockImplementation(() =>
      Promise.resolve({ url: "https://proxy.example/img.jpg", contentType: "image/jpeg" }),
    );

    const { result } = renderHook(() => useStrainImage("https://leafly.com/strain"));
    await waitFor(() => expect(result.current.url).toBe("https://proxy.example/img.jpg"));

    // First retry advances to upstream; exhausted must still be false.
    await act(async () => {
      result.current.retry();
    });
    expect(result.current.exhausted).toBe(false);

    // Second retry on the upstream URL marks exhausted.
    await act(async () => {
      result.current.retry();
    });
    await waitFor(() => expect(result.current.exhausted).toBe(true));
  });
});
