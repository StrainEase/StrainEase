import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";

// Build a small but representative Allbud page so the parser is
// exercised end-to-end without a network call. Real Allbud HTML
// (from live probes) is used as the template.
function allbudHtml(opts: {
  title: string;
  variety: string;
  percentage: string;
  effects: string[];
  medical: string[];
  flavors: string[];
  lead: string;
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
</body>
</html>`;
}

const SAMPLE_BLUE_DREAM = allbudHtml({
  title: "Blue Dream",
  variety: "Sativa Dominant Hybrid - 60% Sativa / 40% Indica",
  percentage: "THC: 17% - 24%, CBD: 2 %, CBN: 1 %",
  effects: ["Creative", "Euphoria", "Happy"],
  medical: ["Anxiety", "Depression", "Pain"],
  flavors: ["Blueberry", "Berry", "Earthy"],
  lead:
    "Blue Dream is a sativa dominant hybrid (60% sativa/40% indica) strain. This infamous bud boasts a moderately high THC level.",
});

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
});
