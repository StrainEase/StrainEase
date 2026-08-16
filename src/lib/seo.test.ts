import { describe, expect, test } from "bun:test";
import { CATALOG } from "./strain-catalog";
import { TERPENE_PROFILES, terpeneSlug } from "./terpenes";
import { slugify } from "./slug";
import { SITE_DESCRIPTION, SITE_NAME, SITE_ORIGIN, documentTitle } from "./site";
import {
  clipMeta,
  escapeHtml,
  faqJsonLd,
  homeJsonLd,
  injectSeoIntoHtml,
  llmsFullTxt,
  llmsTxt,
  prerenderPages,
  publicIndexablePaths,
  robotsTxt,
  sitemapXml,
  strainDescription,
  strainDisplayName,
  strainJsonLd,
  terpeneDescription,
} from "./seo";

describe("clipMeta", () => {
  test("keeps short copy intact", () => {
    expect(clipMeta("Blue Dream for sleep")).toBe("Blue Dream for sleep");
  });

  test("clips on a word boundary under 160 chars", () => {
    const long = `${"word ".repeat(50)}end`;
    const clipped = clipMeta(long, 160);
    expect(clipped.endsWith("…")).toBe(true);
    expect(clipped.length).toBeLessThanOrEqual(160);
    expect(clipped.includes("word")).toBe(true);
  });
});

describe("strain copy", () => {
  test("names a catalog strain with type, THC, and uses", () => {
    const dream = CATALOG.find((item) => item.name === "Blue Dream");
    expect(dream).toBeDefined();
    const text = strainDescription(dream!, "Blue Dream");
    expect(text).toContain("Blue Dream");
    expect(text.toLowerCase()).toContain("hybrid");
    expect(text).toContain("Chronic pain");
    expect(text.length).toBeLessThanOrEqual(160);
  });

  test("falls back when the profile is missing", () => {
    const text = strainDescription(null, "Mystery Kush");
    expect(text).toContain("Mystery Kush");
    expect(text).toContain("StrainEase");
  });

  test("title-cases a slug when the name is unknown", () => {
    expect(strainDisplayName(null, "blue-dream")).toBe("Blue Dream");
  });
});

describe("terpene copy", () => {
  test("includes the summary and pairing", () => {
    const text = terpeneDescription("myrcene", TERPENE_PROFILES.myrcene);
    expect(text.toLowerCase()).toContain("earthy");
    expect(text).toContain("Sleep");
    expect(text.length).toBeLessThanOrEqual(160);
  });
});

describe("sitemap and robots", () => {
  test("lists home, every catalog strain, and every terpene", () => {
    const xml = sitemapXml();
    expect(xml).toContain(`${SITE_ORIGIN}/</loc>`);
    for (const strain of CATALOG) {
      expect(xml).toContain(`${SITE_ORIGIN}/strain/${slugify(strain.name)}`);
    }
    for (const name of Object.keys(TERPENE_PROFILES)) {
      expect(xml).toContain(`${SITE_ORIGIN}/terpene/${terpeneSlug(name)}`);
    }
    expect(publicIndexablePaths()).toHaveLength(
      1 + CATALOG.length + Object.keys(TERPENE_PROFILES).length,
    );
  });

  test("blocks signed-in app routes and points at the sitemap", () => {
    const txt = robotsTxt();
    expect(txt).toContain("Disallow: /dashboard");
    expect(txt).toContain("Disallow: /auth");
    expect(txt).toContain("Disallow: /doctors");
    expect(txt).toContain("User-agent: GPTBot");
    expect(txt).toContain("User-agent: ClaudeBot");
    expect(txt).toContain("User-agent: PerplexityBot");
    expect(txt).toContain(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`);
  });
});

describe("llms.txt", () => {
  test("describes the product and links catalog pages", () => {
    const txt = llmsTxt();
    expect(txt.startsWith(`# ${SITE_NAME}`)).toBe(true);
    expect(txt).toContain(SITE_DESCRIPTION);
    expect(txt).toContain("not medical advice");
    expect(txt).toContain(`${SITE_ORIGIN}/llms-full.txt`);
    expect(txt).toContain("Blue Dream");
    expect(txt).toContain("Myrcene");
  });

  test("full notes include FAQ and structured strain facts", () => {
    const txt = llmsFullTxt();
    expect(txt).toContain("What is StrainEase?");
    expect(txt).toContain("Commonly reported medical uses");
    expect(txt).toContain("Granddaddy Purple");
    expect(txt).toContain("Limonene");
  });
});

describe("JSON-LD", () => {
  test("home graph includes Organization, WebSite, SoftwareApplication, FAQPage", () => {
    const graph = homeJsonLd();
    const types = (graph["@graph"] as { "@type": string }[]).map((node) => node["@type"]);
    expect(types).toEqual(
      expect.arrayContaining([
        "Organization",
        "WebSite",
        "SoftwareApplication",
        "FAQPage",
      ]),
    );
  });

  test("FAQ answers stay in the schema", () => {
    const node = faqJsonLd();
    const entities = node.mainEntity as { name: string }[];
    expect(entities.some((item) => item.name === "Is StrainEase medical advice?")).toBe(
      true,
    );
  });

  test("strain graph is a MedicalWebPage about a Drug", () => {
    const dream = CATALOG.find((item) => item.name === "Blue Dream")!;
    const graph = strainJsonLd(dream, "blue-dream");
    const nodes = graph["@graph"] as Record<string, unknown>[];
    const page = nodes.find((node) => node["@type"] === "MedicalWebPage")!;
    const about = page.about as { "@type": string; name: string };
    expect(about.name).toBe("Blue Dream");
    expect(about["@type"]).toBe("Drug");
  });
});

describe("injectSeoIntoHtml", () => {
  const shell = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Old title</title>
  <meta name="description" content="Old description" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`;

  test("rewrites title, canonical, JSON-LD, and noscript for a strain page", () => {
    const pages = prerenderPages();
    const dream = pages.find((page) => page.path === "/strain/blue-dream");
    expect(dream).toBeDefined();
    const html = injectSeoIntoHtml(shell, dream!);
    expect(html).toContain(`<title>${escapeHtml(documentTitle("Blue Dream"))}</title>`);
    expect(html).toContain(`<link rel="canonical" href="${SITE_ORIGIN}/strain/blue-dream" />`);
    expect(html).toContain('type="application/ld+json"');
    expect(html).toContain("MedicalWebPage");
    expect(html).toContain("<noscript>");
    expect(html).toContain("<h1>Blue Dream</h1>");
    expect(html).toContain("Chronic pain");
  });

  test("home prerender includes the FAQ copy for non-JS crawlers", () => {
    const home = prerenderPages()[0];
    const html = injectSeoIntoHtml(shell, home);
    expect(html).toContain("What is StrainEase?");
    expect(html).toContain("Not medical advice");
  });
});
