import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

// Build a small but representative Allbud page so the parser is
// exercised end-to-end without a network call. Real Allbud HTML
// (from live probes) is used as the template.
// Representative reviews section copied from a live Allbud strain page
// (Bubba Kush): the aggregate rating block plus two written reviews with
// star widgets, body text, and author bylines.
function reviewsHtml(): string {
  return `
  <span class="ratings-summary "><div class="detail-rating-num collapse">4.6</div>
    <span class="rating-num">4.6</span>
    <div id="title-rateit-102" class="rateit_map rateit" data-rateit-value="4.64570737606" data-rateit-readonly="true"></div>
    <span class="rating-votes">
      <span class="product-rating-votes">
        135
      </span><span class="product-rating-votes-text">votes</span><span class="product-rating-votes-delimiter">| </span><span >84</span> reviews
    </span>
  </span>
  <article class="infopanel review mobile-panel">
    <div class="body">
      <div class="title"><div class="rateit_map rateit" data-rateit-value="5" data-rateit-readonly="true"></div></div>
      <p class="text">
        Bought a half oz for my joint pain and I will say I am quite enjoying. Definitely a nice light bubbly head high with a relaxing body high. Feels super good, would definitely recommend.
      </p>
      <div class="clearfix"></div>
      <div class="byline pull-left-sm"><span class="author"><span>robow1zard</span></span><span class="post-date">&nbsp; - <span>June 30, 2026, 11:24 a.m.</span></span></div>
    </div>
  </article>
  <hr class="hr-thin">
  <article class="infopanel review mobile-panel">
    <div class="body">
      <div class="title"><div class="rateit_map rateit" data-rateit-value="4" data-rateit-readonly="true"></div></div>
      <p class="text">Nice relaxing indica. One of the best strains I have smoked. It packs a punch and numbs the brain n body.</p>
      <div class="byline pull-left-sm"><span class="author"><span>DelGriffith87</span></span><span class="post-date">&nbsp; - <span>May 14, 2026, 4:49 p.m.</span></span></div>
    </div>
  </article>`;
}

function allbudHtml(opts: {
  title: string;
  variety: string;
  percentage: string;
  effects: string[];
  medical: string[];
  flavors: string[];
  lead: string;
  reviews?: string;
}): string {
  const renderTags = (prefix: string, items: string[], kind: string) => {
    const links = items
      .map(
        (it) =>
          `<a href="/marijuana-strains/${kind}/${it
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")}">${it}</a>`,
      )
      .join(",\n\n");
    return `<section id="${prefix}" class="panel panel-default" data-label="${prefix}"><div class="face front"><div class="panel-heading">${prefix}</div><div class="panel-body well tags-list">${links}</div></div></section>`;
  };
  return `<!doctype html>
<html>
<head>
  <title>${opts.title} Marijuana Strain Information &amp; Reviews | AllBud</title>
  <meta property="og:description" content="${opts.lead}" />
</head>
<body>
  <h4 class="variety">
    <img alt="Sativa Dominant Hybrid" />
    <a>${opts.variety}</a>
    <span class="strain-percentages">${opts.percentage}</span>
  </h4>
  <h4 class="percentage">${opts.percentage.replace(/^[^:]+/, "THC: 17% - 24%")}</h4>
  ${renderTags("positive_effects", opts.effects, "effect")}
  ${renderTags("relieved_symptoms", opts.medical, "symptom")}
  ${renderTags("strain_flavors", opts.flavors, "flavor")}
  ${opts.reviews ?? ""}
</body>
</html>`;
}

const SAMPLE_BLUE_DREAM_OPTS = {
  title: "Blue Dream",
  variety: "Sativa Dominant Hybrid - 60% Sativa / 40% Indica",
  percentage: "THC: 17% - 24%, CBD: 2 %, CBN: 1 %",
  effects: ["Creative", "Euphoria", "Happy"],
  medical: ["Anxiety", "Depression", "Pain"],
  flavors: ["Blueberry", "Berry", "Earthy"],
  lead: "Blue Dream is a sativa dominant hybrid (60% sativa/40% indica) strain. This infamous bud boasts a moderately high THC level.",
};

const SAMPLE_BLUE_DREAM = allbudHtml(SAMPLE_BLUE_DREAM_OPTS);

// Replace the percentage h4 content with the actual Allbud text so
// the per-test data controls what the parser sees. The fixture
// above is just a template.
function withPct(html: string, pct: string): string {
  return html.replace(
    /<h4 class="percentage">[\s\S]*?<\/h4>/,
    `<h4 class="percentage">${pct}</h4>`,
  );
}

const originalFetch = globalThis.fetch;
let fetchMock: ReturnType<typeof mock> | null = null;

beforeEach(() => {
  fetchMock = mock(async (_url: string | URL | Request) => {
    return new Response(SAMPLE_BLUE_DREAM, { status: 200 });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("fetchAllbudProfile", () => {
  test("parses effects, medical uses, flavors, THC, CBD, type, lineage", async () => {
    const { fetchAllbudProfile } = await import("./allbud");
    const profile = await fetchAllbudProfile("Blue Dream");
    expect(profile).not.toBeNull();
    if (!profile) return;
    expect(profile.name).toBe("Blue Dream");
    expect(profile.type).toBe("sativa");
    expect(profile.thcRange).toBe("17–24%");
    expect(profile.cbdRange).toBe("2%");
    expect(profile.effects?.map((e) => e.name)).toEqual([
      "Creative",
      "Euphoria",
      "Happy",
    ]);
    expect(profile.medicalUses).toEqual(["Anxiety", "Depression", "Pain"]);
    expect(profile.communityNotes?.length).toBeGreaterThan(0);
    // The listing's marketing description must NOT appear as a community
    // note — it already renders as `description`, and the notes section
    // is reserved for real customer reviews + tag aggregates.
    expect(
      profile.communityNotes?.some((n) => n.source === "Allbud listing"),
    ).toBe(false);
  });

  test("returns null when all four species paths miss", async () => {
    fetchMock = mock(async () => new Response("not found", { status: 404 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const { fetchAllbudProfile } = await import("./allbud");
    const profile = await fetchAllbudProfile("Nonexistent Strain XYZ");
    expect(profile).toBeNull();
  });

  test("parses single-value THC (no range) from the percentage h4", async () => {
    fetchMock = mock(
      async () =>
        new Response(
          withPct(SAMPLE_BLUE_DREAM, "THC: 26%, CBD: 2 %, CBN: 4 %"),
          { status: 200 },
        ),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const { fetchAllbudProfile } = await import("./allbud");
    const profile = await fetchAllbudProfile("Sour Diesel");
    expect(profile?.thcRange).toBe("26%");
    expect(profile?.cbdRange).toBe("2%");
  });

  test("classifies a 'Sativa' / 'Indica' / 'Hybrid' variety as the pure species", async () => {
    fetchMock = mock(
      async () =>
        new Response(
          withPct(SAMPLE_BLUE_DREAM, "THC: 16% - 21%").replace(
            /Sativa Dominant Hybrid - [\s\S]*?strain-percentages">[\s\S]*?<\/span>/,
            `Indica`,
          ),
          { status: 200 },
        ),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const { fetchAllbudProfile } = await import("./allbud");
    const profile = await fetchAllbudProfile("Northern Lights");
    expect(profile?.type).toBe("indica");
  });

  test("caches a hit so the second call does not re-fetch", async () => {
    const { fetchAllbudProfile } = await import("./allbud");
    await fetchAllbudProfile("Blue Dream");
    const callsAfterFirst = fetchMock!.mock.calls.length;
    await fetchAllbudProfile("Blue Dream");
    expect(fetchMock!.mock.calls.length).toBe(callsAfterFirst);
  });

  test("does not attach notes for a strain that has no panels", async () => {
    fetchMock = mock(
      async () =>
        new Response(
          "<!doctype html><html><head><title>All</title></head><body></body></html>",
          { status: 200 },
        ),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const { fetchAllbudProfile } = await import("./allbud");
    const profile = await fetchAllbudProfile("Anything");
    expect(profile).toBeNull();
  });

  test("parses the aggregate rating and review count from the reviews block", async () => {
    fetchMock = mock(
      async () =>
        new Response(
          allbudHtml({
            ...SAMPLE_BLUE_DREAM_OPTS,
            reviews: reviewsHtml(),
          }),
          { status: 200 },
        ),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const { fetchAllbudProfile } = await import("./allbud");
    const profile = await fetchAllbudProfile("Bubba Kush");
    expect(profile?.allbudRating).toBe(4.6);
    expect(profile?.allbudReviewCount).toBe(84);
  });

  test("converts written reviews into community notes with author attribution", async () => {
    fetchMock = mock(
      async () =>
        new Response(
          allbudHtml({
            ...SAMPLE_BLUE_DREAM_OPTS,
            reviews: reviewsHtml(),
          }),
          { status: 200 },
        ),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const { fetchAllbudProfile } = await import("./allbud");
    const profile = await fetchAllbudProfile("Bubba Kush");
    const reviewNotes = (profile?.communityNotes ?? []).filter((n) =>
      n.source.startsWith("Allbud review"),
    );
    expect(reviewNotes.length).toBe(2);
    expect(reviewNotes[0].source).toBe("Allbud review · robow1zard");
    expect(reviewNotes[0].text).toContain("joint pain");
    expect(reviewNotes[1].source).toBe("Allbud review · DelGriffith87");
    // Curated effect/use notes still ride along beside the reviews.
    expect(profile?.communityNotes?.length).toBeGreaterThan(2);
  });

  test("leaves rating and review fields empty when no reviews exist", async () => {
    const { fetchAllbudProfile } = await import("./allbud");
    const profile = await fetchAllbudProfile("Blue Dream");
    expect(profile?.allbudRating).toBeUndefined();
    expect(profile?.allbudReviewCount).toBeUndefined();
    expect(
      (profile?.communityNotes ?? []).some((n) =>
        n.source.startsWith("Allbud review"),
      ),
    ).toBe(false);
  });
});

/**
 * Directory scraper tests. We stub the listing HTML shape (anchor tags
 * pointing at /marijuana-strains/{species}/{slug}) and verify pagination
 * stops on a page that yields zero new names.
 */
describe("fetchAllbudSpeciesDirectory", () => {
  beforeEach(() => {
    // Reset the per-species in-memory cache between tests so each one
    // starts with a clean request log.
    const mod = require("./allbud") as typeof import("./allbud");
    mod.clearAllbudDirectoryCacheForTest();
  });

  function directoryHtml(species: string, names: string[]): string {
    const links = names
      .map((name) => {
        const slug = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
        return `<a href="/marijuana-strains/${species}/${slug}">${name}</a>`;
      })
      .join("\n");
    return `<!doctype html><html><body>${links}</body></html>`;
  }

  test("returns one entry per strain on a single listing page", async () => {
    const fetchMock = mock(async (url: string) => {
      expect(url).toContain("/marijuana-strains/variety/sativa");
      return new Response(
        directoryHtml("sativa", ["Durban Poison", "Super Sour Diesel", "Thai"]),
        { status: 200 },
      );
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const { fetchAllbudSpeciesDirectory } = await import("./allbud");
    const entries = await fetchAllbudSpeciesDirectory("sativa");
    const names = entries.map((e) => e.name).sort();
    expect(names).toEqual(["Durban Poison", "Super Sour Diesel", "Thai"]);
    expect(entries.every((e) => e.type === "sativa")).toBe(true);
  });

  test("paginates with ?page=N and stops when a page has no new strains", async () => {
    const calls: string[] = [];
    const fetchMock = mock(async (url: string) => {
      calls.push(url);
      const u = new URL(url);
      const page = Number(u.searchParams.get("page") ?? "1");
      if (page === 1) {
        return new Response(
          directoryHtml("indica", ["Bubba Kush", "Northern Lights"]),
          { status: 200 },
        );
      }
      if (page === 2) {
        return new Response(
          directoryHtml("indica", ["Purple Kush", "Granddaddy Purple"]),
          { status: 200 },
        );
      }
      // page 3+: zero new names → loop breaks
      return new Response(directoryHtml("indica", []), { status: 200 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const { fetchAllbudSpeciesDirectory } = await import("./allbud");
    const entries = await fetchAllbudSpeciesDirectory("indica");
    expect(entries.map((e) => e.name).sort()).toEqual([
      "Bubba Kush",
      "Granddaddy Purple",
      "Northern Lights",
      "Purple Kush",
    ]);
    expect(calls.length).toBe(3);
    expect(calls[0]).toContain("/marijuana-strains/variety/indica");
    expect(calls[1]).toContain("page=2");
  });

  test("deduplicates strains that appear on multiple pages", async () => {
    const fetchMock = mock(async (url: string) => {
      const u = new URL(url);
      const page = Number(u.searchParams.get("page") ?? "1");
      const names =
        page === 1
          ? ["Blue Dream", "Green Crack"]
          : page === 2
            ? ["Blue Dream", "Sour Diesel"] // Blue Dream overlap
            : [];
      return new Response(directoryHtml("hybrid", names), { status: 200 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const { fetchAllbudSpeciesDirectory } = await import("./allbud");
    const entries = await fetchAllbudSpeciesDirectory("hybrid");
    expect(entries.map((e) => e.name).sort()).toEqual([
      "Blue Dream",
      "Green Crack",
      "Sour Diesel",
    ]);
  });
});

describe("fetchAllbudStrains", () => {
  beforeEach(() => {
    const mod = require("./allbud") as typeof import("./allbud");
    mod.clearAllbudDirectoryCacheForTest();
  });

  test("merges species directories and dedupes across them", async () => {
    const fetchMock = mock(async (url: string) => {
      if (url.includes("/sativa")) {
        return new Response(
          `<html><body><a href="/marijuana-strains/sativa/durban-poison">Durban Poison</a></body></html>`,
          { status: 200 },
        );
      }
      if (url.includes("/indica")) {
        return new Response(
          `<html><body><a href="/marijuana-strains/indica/bubba-kush">Bubba Kush</a></body></html>`,
          { status: 200 },
        );
      }
      if (url.includes("/hybrid")) {
        return new Response(
          `<html><body><a href="/marijuana-strains/hybrid/blue-dream">Blue Dream</a></body></html>`,
          { status: 200 },
        );
      }
      // cbd: same strain as hybrid (overlap)
      if (url.includes("/cbd")) {
        return new Response(
          `<html><body><a href="/marijuana-strains/cbd/blue-dream">Blue Dream</a></body></html>`,
          { status: 200 },
        );
      }
      return new Response("", { status: 200 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const { fetchAllbudStrains } = await import("./allbud");
    const profiles = await fetchAllbudStrains();
    expect(profiles.map((p) => p.name).sort()).toEqual([
      "Blue Dream",
      "Bubba Kush",
      "Durban Poison",
    ]);
    expect(profiles.find((p) => p.name === "Durban Poison")?.type).toBe(
      "sativa",
    );
    expect(profiles.find((p) => p.name === "Bubba Kush")?.type).toBe(
      "indica",
    );
    expect(profiles.find((p) => p.name === "Blue Dream")?.type).toBe(
      "hybrid",
    );
  });
});
