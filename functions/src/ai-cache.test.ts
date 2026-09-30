import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

// Mock firebase-admin/firestore before importing the module under test.
// Without this mock, readFirestoreDoc hits a real Firestore instance when
// one is reachable, breaking the "cold miss" test. The mock returns
// { exists: false } by default; individual tests can swap in a populated
// document.
const mockGet = mock((doc: { __data?: unknown }) =>
  Promise.resolve({
    exists: Boolean(doc.__data),
    data: () => doc.__data,
  }),
);
type DocRecord = { __data?: unknown };
const docs = new Map<string, DocRecord>();
const mockDoc = mock((id: string) => {
  let entry = docs.get(id);
  if (!entry) {
    entry = {};
    docs.set(id, entry);
  }
  return {
    get: () => mockGet(entry as DocRecord),
    set: mock((data: unknown) => {
      entry!.__data = data;
      return Promise.resolve();
    }),
  };
});
const mockCollection = mock(() => ({
  doc: (id: string) => mockDoc(id),
}));

mock.module("firebase-admin/firestore", () => ({
  getFirestore: mock(() => ({
    collection: mockCollection,
  })),
}));

import {
  aiCacheStats,
  clearAiCacheForTest,
  computeAiCacheKey,
  getCachedAiResult,
  putCachedAiResult,
} from "./ai-cache";

beforeEach(() => {
  clearAiCacheForTest();
  docs.clear();
  mockGet.mockClear();
  mockDoc.mockClear();
  mockCollection.mockClear();
});

afterEach(() => {
  clearAiCacheForTest();
});

describe("computeAiCacheKey", () => {
  test("returns a 64-char lowercase hex SHA-256", () => {
    const k = computeAiCacheKey({ a: 1, b: 2 });
    expect(k).toMatch(/^[0-9a-f]{64}$/);
  });

  test("is order-independent for object keys", () => {
    const a = computeAiCacheKey({ a: 1, b: 2, c: 3 });
    const b = computeAiCacheKey({ c: 3, b: 2, a: 1 });
    expect(a).toBe(b);
  });

  test("is order-dependent for arrays (caller must pre-sort)", () => {
    const a = computeAiCacheKey({ ailments: ["insomnia", "anxiety"] });
    const b = computeAiCacheKey({ ailments: ["anxiety", "insomnia"] });
    expect(a).not.toBe(b);
  });

  test("distinguishes undefined vs null vs missing", () => {
    const a = computeAiCacheKey({ thc: undefined });
    const b = computeAiCacheKey({ thc: null });
    expect(a).not.toBe(b);
  });

  test("handles nested objects", () => {
    const a = computeAiCacheKey({
      prefs: { timeOfDay: "morning", thc: "experienced" },
    });
    const b = computeAiCacheKey({
      prefs: { thc: "experienced", timeOfDay: "morning" },
    });
    expect(a).toBe(b);
  });
});

describe("getCachedAiResult / putCachedAiResult", () => {
  test("returns null on a cold miss", async () => {
    const hit = await getCachedAiResult<{ sections: string[] }>(
      "testCache",
      "abc",
    );
    expect(hit).toBeNull();
  });

  test("returns from memory after a put (does not read Firestore)", async () => {
    await putCachedAiResult(
      "testCache",
      "abc",
      { sections: ["overview"] },
      "openai/gpt-oss-20b",
    );
    const hit = await getCachedAiResult<{ sections: string[] }>(
      "testCache",
      "abc",
    );
    expect(hit).toEqual({
      result: { sections: ["overview"] },
      createdAt: expect.any(Number),
      source: "memory",
    });
    // Memory hit should not fall through to Firestore.
    expect(mockGet).not.toHaveBeenCalled();
  });

  test("reads from Firestore on a cold instance and primes memory", async () => {
    // Simulate a Firestore document already populated by a prior cold
    // start: stage the doc via the mock before the read.
    docs.set("abc", {
      __data: {
        result: { sections: ["from-firestore"] },
        createdAt: Date.now(),
        model: "openai/gpt-oss-20b",
      },
    });
    const hit = await getCachedAiResult<{ sections: string[] }>(
      "testCache",
      "abc",
    );
    expect(hit).toEqual({
      result: { sections: ["from-firestore"] },
      createdAt: expect.any(Number),
      source: "firestore",
    });

    // Second read should be served from memory (no second Firestore hit).
    mockGet.mockClear();
    const hit2 = await getCachedAiResult<{ sections: string[] }>(
      "testCache",
      "abc",
    );
    expect(hit2?.source).toBe("memory");
    expect(mockGet).not.toHaveBeenCalled();
  });

  test("falls through to network when the Firestore entry is older than the TTL", async () => {
    const stale = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days ago
    docs.set("abc", {
      __data: {
        result: { sections: ["stale"] },
        createdAt: stale,
        model: "openai/gpt-oss-20b",
      },
    });
    const hit = await getCachedAiResult<{ sections: string[] }>(
      "testCache",
      "abc",
    );
    expect(hit).toBeNull();
  });

  test("falls through to network when Firestore is unreachable", async () => {
    mockGet.mockImplementationOnce(() =>
      Promise.reject(new Error("firestore-timeout")),
    );
    const hit = await getCachedAiResult<{ sections: string[] }>(
      "testCache",
      "abc",
    );
    expect(hit).toBeNull();
  });

  test("put is best-effort: Firestore write failure does not throw", async () => {
    mockDoc.mockImplementationOnce(() => ({
      get: mock(() =>
        Promise.resolve({ exists: false, data: () => undefined }),
      ),
      set: mock(() => Promise.reject(new Error("firestore-timeout"))),
    }));
    // Should not throw.
    await putCachedAiResult(
      "testCache",
      "abc",
      { sections: ["x"] },
      "openai/gpt-oss-20b",
    );
    // Memory should still be populated.
    const hit = await getCachedAiResult<{ sections: string[] }>(
      "testCache",
      "abc",
    );
    expect(hit?.result).toEqual({ sections: ["x"] });
  });

  test("coalesces concurrent puts into one Firestore write", async () => {
    const setSpy = mock(() => Promise.resolve());
    mockDoc.mockImplementation(() => ({
      get: mock(() =>
        Promise.resolve({ exists: false, data: () => undefined }),
      ),
      set: setSpy,
    }));

    // Fire several puts for the same key without awaiting between them.
    await Promise.all([
      putCachedAiResult("testCache", "abc", { n: 1 }, "m1"),
      putCachedAiResult("testCache", "abc", { n: 2 }, "m2"),
      putCachedAiResult("testCache", "abc", { n: 3 }, "m3"),
    ]);
    // Coalescing should result in a single set() call for the key.
    expect(setSpy).toHaveBeenCalledTimes(1);
  });

  test("collections are isolated by key", async () => {
    await putCachedAiResult(
      "descriptionCache",
      "abc",
      { kind: "desc" },
      "openai/gpt-oss-20b",
    );
    await putCachedAiResult(
      "compareCache",
      "abc",
      { kind: "cmp" },
      "openai/gpt-oss-120b",
    );
    const a = await getCachedAiResult<{ kind: string }>(
      "descriptionCache",
      "abc",
    );
    const b = await getCachedAiResult<{ kind: string }>("compareCache", "abc");
    expect(a?.result.kind).toBe("desc");
    expect(b?.result.kind).toBe("cmp");
  });
});

describe("aiCacheStats", () => {
  test("reports entries and distinct collections", async () => {
    await putCachedAiResult("a", "k1", { v: 1 }, "m");
    await putCachedAiResult("a", "k2", { v: 2 }, "m");
    await putCachedAiResult("b", "k1", { v: 3 }, "m");
    const s = aiCacheStats();
    expect(s.entries).toBe(3);
    expect(s.collections).toBe(2);
  });
});
