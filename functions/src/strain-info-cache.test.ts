import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

// Mock firebase-admin/firestore before importing the module under test.
// Without this mock, readFirestoreDoc hits a real Firestore instance when
// one is reachable from the test environment, causing the "cold miss" test
// to unexpectedly find data. The mock ensures every .get() returns
// { exists: false } so the cache layer behaves as if Firestore is empty.
const mockGet = mock(() =>
  Promise.resolve({ exists: false, data: () => undefined }),
);
const mockDoc = mock(() => ({ get: mockGet, set: mock(() => Promise.resolve()) }));
const mockCollection = mock(() => ({ doc: mockDoc }));

mock.module("firebase-admin/firestore", () => ({
  getFirestore: mock(() => ({
    collection: mockCollection,
  })),
}));

import {
  clearStrainInfoCacheForTest,
  getCachedStrainProfile,
  putCachedStrainProfile,
  strainInfoCacheStats,
} from "./strain-info-cache";
import type { StrainProfile } from "./types";

const sampleProfile: StrainProfile = {
  name: "Blue Dream",
  inKnowledgeBase: true,
  type: "hybrid",
  thcRange: "17–24%",
  cbdRange: "<1%",
  medicalUses: ["stress", "pain"],
  effects: [{ name: "relaxed", intensity: 4 }],
};

beforeEach(() => {
  clearStrainInfoCacheForTest();
  mockGet.mockClear();
  mockDoc.mockClear();
  mockCollection.mockClear();
});

afterEach(() => {
  clearStrainInfoCacheForTest();
});

describe("strain info cache", () => {
  test("returns null on a cold miss", async () => {
    const hit = await getCachedStrainProfile("blue-dream");
    expect(hit).toBeNull();
  });

  test("reads from memory after a put", async () => {
    await putCachedStrainProfile("blue-dream", sampleProfile);
    const hit = await getCachedStrainProfile("blue-dream");
    expect(hit).not.toBeNull();
    expect(hit?.source).toBe("memory");
    expect(hit?.profile.name).toBe("Blue Dream");
    expect(hit?.profile.type).toBe("hybrid");
  });

  test("rejects empty slugs", async () => {
    const hit = await getCachedStrainProfile("");
    expect(hit).toBeNull();
    // Should also not throw on put.
    await putCachedStrainProfile("", sampleProfile);
  });

  test("tracks fresh counts in stats", async () => {
    await putCachedStrainProfile("a", sampleProfile);
    await putCachedStrainProfile("b", sampleProfile);
    const stats = strainInfoCacheStats();
    expect(stats.entries).toBe(2);
    expect(stats.fresh).toBe(2);
  });

  test("separate slugs do not collide", async () => {
    const other: StrainProfile = {
      ...sampleProfile,
      name: "OG Kush",
    };
    await putCachedStrainProfile("blue-dream", sampleProfile);
    await putCachedStrainProfile("og-kush", other);
    const a = await getCachedStrainProfile("blue-dream");
    const b = await getCachedStrainProfile("og-kush");
    expect(a?.profile.name).toBe("Blue Dream");
    expect(b?.profile.name).toBe("OG Kush");
  });
});
