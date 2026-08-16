import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  clearStrainInfoCacheForTest,
  getCachedStrainProfile,
  putCachedStrainProfile,
  strainInfoCacheStats,
} from "./strain-info-cache";
import type { StrainProfile } from "./types";

// The cache reads/writes Firestore via the admin SDK. We don't bring up
// Firebase in unit tests — the cache reads will return null, but the
// in-memory layer is testable on its own.

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
