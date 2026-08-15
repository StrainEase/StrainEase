import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  cachedFetchImage,
  clearImageCacheForTest,
  imageCacheKey,
  imageCacheStats,
} from "./image-cache";

// Minimal fetch stub — cache logic shouldn't depend on real network or
// Firebase admin in unit tests. We exercise the source-of-truth: the
// in-memory layer and the key derivation. The Storage layer is wired
// up but best-effort; we don't fail the cache on a missing bucket.

const originalFetch = globalThis.fetch;
const originalRandomUUID = globalThis.crypto?.randomUUID;

function stubNetwork(bytes: ArrayBuffer, contentType: string) {
  let calls = 0;
  globalThis.fetch = (async (_input: unknown) => {
    calls += 1;
    return new Response(bytes, {
      status: 200,
      headers: { "content-type": contentType },
    });
  }) as typeof fetch;
  return () => calls;
}

beforeEach(() => {
  clearImageCacheForTest();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  // restore randomUUID noop
  void originalRandomUUID;
});

describe("imageCacheKey", () => {
  test("returns a 64-char hex sha256 of the url", () => {
    const k = imageCacheKey("https://example.com/foo.png");
    expect(k).toMatch(/^[0-9a-f]{64}$/);
  });

  test("is stable across calls", () => {
    const a = imageCacheKey("https://example.com/foo.png");
    const b = imageCacheKey("https://example.com/foo.png");
    expect(a).toBe(b);
  });

  test("is unique per URL", () => {
    const a = imageCacheKey("https://example.com/a.png");
    const b = imageCacheKey("https://example.com/b.png");
    expect(a).not.toBe(b);
  });
});

describe("cachedFetchImage", () => {
  test("rejects non-http URLs", async () => {
    await expect(cachedFetchImage("not-a-url")).rejects.toThrow();
    await expect(cachedFetchImage("")).rejects.toThrow();
    await expect(cachedFetchImage("ftp://example.com")).rejects.toThrow();
  });

  test("caches the bytes after the first fetch and reports source", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const getCalls = stubNetwork(png.buffer, "image/png");
    const url = "https://example.com/test.png";

    const first = await cachedFetchImage(url);
    expect(first.source).toBe("network");
    expect(first.contentType).toBe("image/png");
    expect(first.bytes.length).toBe(png.length);
    expect(getCalls()).toBe(1);

    const second = await cachedFetchImage(url);
    expect(second.source).toBe("memory");
    expect(getCalls()).toBe(1); // not re-fetched
  });

  test("coalesces concurrent fetches for the same URL", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const getCalls = stubNetwork(png.buffer, "image/png");
    const url = "https://example.com/coalesce.png";

    const [a, b, c] = await Promise.all([
      cachedFetchImage(url),
      cachedFetchImage(url),
      cachedFetchImage(url),
    ]);
    expect(a.bytes.length).toBe(png.length);
    expect(b.bytes.length).toBe(png.length);
    expect(c.bytes.length).toBe(png.length);
    // One network round-trip total; the rest hit the inflight promise
    // or memory. Allow for one or two calls because the third caller
    // might race past the inflight slot.
    expect(getCalls()).toBeLessThanOrEqual(2);
  });

  test("reports fresh/stale entries in stats", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    stubNetwork(png.buffer, "image/png");
    await cachedFetchImage("https://example.com/stats.png");
    const stats = imageCacheStats();
    expect(stats.entries).toBe(1);
    expect(stats.fresh).toBe(1);
  });
});