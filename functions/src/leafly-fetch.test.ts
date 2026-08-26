import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  clearStrainInfoCacheForTest,
  putCachedStrainProfile,
} from "./strain-info-cache";
import {
  clearLeaflyHtmlCacheForTest,
  fetchProfile,
  isThinProfile,
} from "./leafly";
import type { StrainProfile } from "./types";

const THIN_DESCRIPTION =
  "Blue Dream is a sativa-leaning hybrid that has become one of the most searched strains in the country.";

/** Minimal Leafly detail page carrying a full strain payload. */
function detailPageHtml(name: string): string {
  const nextData = {
    props: {
      pageProps: {
        strain: {
          name,
          category: "Hybrid",
          descriptionPlain: "A full detail-page description with real substance about this strain.",
          parents: [{ name: "Blueberry" }, { name: "Haze" }],
          conditions: { pain: { name: "Pain", score: 0.8 } },
          effects: {
            relaxed: { name: "Relaxed", score: 2.0 },
            happy: { name: "Happy", score: 1.5 },
          },
          terps: { myrcene: { name: "Myrcene", score: 0.9, description: "herbal" } },
          averageRating: 4.5,
          reviewCount: 13240,
        },
        reviews: {},
      },
    },
  };
  return `<!doctype html><html><head><title>${name} strain</title></head><body>
<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(nextData)}</script>
</body></html>`;
}

function thinProfile(name: string): StrainProfile {
  return {
    name,
    inKnowledgeBase: true,
    description: THIN_DESCRIPTION,
  };
}

const realFetch = globalThis.fetch;

beforeEach(() => {
  clearStrainInfoCacheForTest();
  clearLeaflyHtmlCacheForTest();
});

afterEach(() => {
  clearStrainInfoCacheForTest();
  clearLeaflyHtmlCacheForTest();
  globalThis.fetch = realFetch;
});

describe("isThinProfile", () => {
  test("flags a description-only profile as thin", () => {
    expect(isThinProfile(thinProfile("X"))).toBe(true);
  });

  test("does not flag profiles that carry medicalUses or effects", () => {
    expect(
      isThinProfile({
        ...thinProfile("X"),
        medicalUses: ["Stress"],
      }),
    ).toBe(false);
    expect(
      isThinProfile({
        ...thinProfile("X"),
        effects: [{ name: "Relaxed", intensity: 3 }],
      }),
    ).toBe(false);
  });

  test("does not flag profiles with no description at all", () => {
    expect(
      isThinProfile({
        name: "X",
        inKnowledgeBase: true,
        medicalUses: ["Stress"],
      }),
    ).toBe(false);
  });
});

describe("fetchProfile — thin pre-defined description upgrade", () => {
  test("still pulls the live Leafly detail page for a thin cached profile", async () => {
    // Simulate the legacy cache holding only a single-paragraph
    // pre-defined description (no detail fields).
    await putCachedStrainProfile("blue-dream", thinProfile("Blue Dream"));

    let fetchCalls = 0;
    const mockFetch: typeof fetch = async (input) => {
      fetchCalls += 1;
      const url = String(input);
      if (url.includes("/strains/blue-dream")) {
        return new Response(detailPageHtml("Blue Dream"), {
          status: 200,
          headers: { "Content-Type": "text/html" },
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    };
    globalThis.fetch = mockFetch;

    const out = await fetchProfile("Blue Dream");

    // The live detail page was actually fetched — the thin cache entry
    // was NOT treated as the final answer.
    expect(fetchCalls).toBe(1);
    expect(out?.description).toContain("full detail-page description");
    expect(out?.medicalUses).toContain("Pain");
    expect(out?.effects?.map((e) => e.name)).toContain("Relaxed");
    expect(out?.lineage).toBe("Blueberry × Haze");
    expect(out?.type).toBe("hybrid");
    expect(out?.leaflyRating).toBe(4.5);
  });

  test("keeps the cached description when Leafly is unreachable", async () => {
    await putCachedStrainProfile("granddaddy-purple", thinProfile("Granddaddy Purple"));

    const mockFetch: typeof fetch = async () => {
      throw new Error("Leafly is dead");
    };
    globalThis.fetch = mockFetch;

    const out = await fetchProfile("Granddaddy Purple");
    expect(out).not.toBeNull();
    expect(out?.description).toBe(THIN_DESCRIPTION);
  });

  test("returns null with no cache when Leafly is unreachable", async () => {
    const mockFetch: typeof fetch = async () => {
      throw new Error("Leafly is dead");
    };
    globalThis.fetch = mockFetch;

    const out = await fetchProfile("Sour Diesel");
    expect(out).toBeNull();
  });

  test("full cached profiles keep the fast path (no network)", async () => {
    const full = {
      ...thinProfile("Jack Herer"),
      type: "sativa" as const,
      thcRange: "18–23%",
      medicalUses: ["ADHD", "Fatigue"],
      effects: [{ name: "Focused", intensity: 4 }],
      leaflyRating: 4.5,
    };
    await putCachedStrainProfile("jack-herer", full);

    let fetchCalls = 0;
    const mockFetch: typeof fetch = async (input) => {
      fetchCalls += 1;
      throw new Error(`Unexpected fetch: ${String(input)}`);
    };
    globalThis.fetch = mockFetch;

    const out = await fetchProfile("Jack Herer");
    expect(fetchCalls).toBe(0);
    expect(out?.medicalUses).toEqual(["ADHD", "Fatigue"]);
    expect(out?.type).toBe("sativa");
  });
});
