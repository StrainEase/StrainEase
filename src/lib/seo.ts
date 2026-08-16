import { slugify } from "./slug";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_ORIGIN,
  SITE_TAGLINE,
  absoluteUrl,
  documentTitle,
  ogImageUrl,
} from "./site";
import { CATALOG } from "./strain-catalog";
import type { StrainProfile } from "./strain-profile";
import { TYPE_LABEL } from "./strain-ui";
import { TERPENE_PROFILES, terpeneSlug } from "./terpenes";

export type JsonLd = Record<string, unknown> | Record<string, unknown>[];

export type FaqItem = {
  question: string;
  answer: string;
};

export type PublicSeoPage = {
  path: string;
  title: string;
  description: string;
  image?: string;
  type: "website" | "article";
  jsonLd?: JsonLd;
  noscript?: string;
  filePath: string;
};

export const SITE_FAQS: FaqItem[] = [
  {
    question: "What is StrainEase?",
    answer:
      "StrainEase is a free research tool for medical cannabis patients. You describe the symptoms you are treating, and it ranks strains patients commonly report for those symptoms using Leafly, Weedmaps, Reddit, Google, and dispensary menus.",
  },
  {
    question: "How does StrainEase choose strains?",
    answer:
      "It gathers commonly reported medical uses, effects, terpenes, and patient notes from public sources, then an AI model ranks the closest matches and can compare a few finalists side by side. Rankings reflect reported patient experience, not a prescription.",
  },
  {
    question: "Which sources does StrainEase use?",
    answer:
      "Strain profiles pull from Leafly reviews, Weedmaps listings, Reddit discussions in communities such as r/medicalmarijuana, Google, and dispensary menus. Each comparison cites the voices it used.",
  },
  {
    question: "Is StrainEase medical advice?",
    answer:
      "No. StrainEase is an information and comparison tool. Nothing on the site is a diagnosis, prescription, or treatment recommendation. Talk with a qualified healthcare provider before using cannabis medically, especially if you take other medication.",
  },
  {
    question: "Is StrainEase free?",
    answer:
      "Yes. You can browse strain and terpene pages without an account. Signing in lets you save strains, keep notes, and run personalized comparisons.",
  },
];

const ROBOTS_DISALLOW = [
  "/auth",
  "/dashboard",
  "/browse/",
  "/find/",
  "/compare/",
  "/doctors",
];

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function clipMeta(text: string, max = 160): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  const sliced = compact.slice(0, max - 1);
  const lastSpace = sliced.lastIndexOf(" ");
  return `${(lastSpace > 80 ? sliced.slice(0, lastSpace) : sliced).trimEnd()}…`;
}

export function strainDisplayName(profile: Pick<StrainProfile, "name"> | null, slug: string): string {
  if (profile?.name?.trim()) return profile.name.trim();
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function strainDescription(
  profile: Pick<
    StrainProfile,
    "name" | "type" | "thcRange" | "medicalUses" | "description"
  > | null,
  name: string,
): string {
  if (profile?.description?.trim()) {
    return clipMeta(`${profile.description.trim()} Research and compare ${name} on StrainEase.`);
  }
  const type = profile?.type ? TYPE_LABEL[profile.type] ?? profile.type : null;
  const thc = profile?.thcRange ? `THC ${profile.thcRange}` : null;
  const uses = (profile?.medicalUses ?? []).slice(0, 3);
  const bits = [type, thc].filter(Boolean).join(", ");
  if (uses.length > 0) {
    return clipMeta(
      `${name} is a ${bits || "cannabis"} strain patients commonly report for ${joinAnd(uses)}. Compare medical uses, terpenes, and patient notes on StrainEase.`,
    );
  }
  return clipMeta(
    `${name} cannabis strain profile on StrainEase — medical uses, terpenes, and patient-reported notes aggregated from public sources.`,
  );
}

export function terpeneDescription(
  name: string,
  profile: { summary: string; benefits: string[] },
): string {
  const benefits = profile.benefits.slice(0, 3);
  const extra =
    benefits.length > 0
      ? ` Patients often pair it with ${joinAnd(benefits)}.`
      : "";
  return clipMeta(`${profile.summary}${extra} See strains that list ${name} on StrainEase.`);
}

export function organizationJsonLd(): Record<string, unknown> {
  return {
    "@type": "Organization",
    "@id": `${SITE_ORIGIN}/#organization`,
    name: SITE_NAME,
    url: SITE_ORIGIN,
    logo: absoluteUrl("/logo.svg"),
    description: SITE_DESCRIPTION,
  };
}

export function websiteJsonLd(): Record<string, unknown> {
  return {
    "@type": "WebSite",
    "@id": `${SITE_ORIGIN}/#website`,
    name: SITE_NAME,
    url: SITE_ORIGIN,
    description: SITE_DESCRIPTION,
    publisher: { "@id": `${SITE_ORIGIN}/#organization` },
    inLanguage: "en-US",
  };
}

export function softwareJsonLd(): Record<string, unknown> {
  return {
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "HealthApplication",
    operatingSystem: "Web, iOS",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description: SITE_DESCRIPTION,
    url: SITE_ORIGIN,
  };
}

export function faqJsonLd(faqs: FaqItem[] = SITE_FAQS): Record<string, unknown> {
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function breadcrumbJsonLd(
  crumbs: { name: string; path: string }[],
): Record<string, unknown> {
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export function homeJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationJsonLd(),
      websiteJsonLd(),
      softwareJsonLd(),
      faqJsonLd(),
    ],
  };
}

export function strainJsonLd(
  profile: StrainProfile,
  slug: string,
): Record<string, unknown> {
  const url = absoluteUrl(`/strain/${slug}`);
  const name = profile.name;
  const uses = profile.medicalUses ?? [];
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationJsonLd(),
      websiteJsonLd(),
      breadcrumbJsonLd([
        { name: SITE_NAME, path: "/" },
        { name, path: `/strain/${slug}` },
      ]),
      {
        "@type": "MedicalWebPage",
        "@id": `${url}#webpage`,
        url,
        name: documentTitle(name),
        description: strainDescription(profile, name),
        isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
        about: {
          "@type": "Drug",
          name,
          nonProprietaryName: name,
          drugClass: "Cannabis",
          ...(profile.type
            ? { additionalProperty: [{
                "@type": "PropertyValue",
                name: "Chemovar",
                value: TYPE_LABEL[profile.type] ?? profile.type,
              }] }
            : {}),
          ...(uses.length > 0 ? { relevantSpecialty: uses } : {}),
        },
        audience: {
          "@type": "MedicalAudience",
          audienceType: "Patient",
        },
      },
    ],
  };
}

export function terpeneJsonLd(
  name: string,
  profile: { summary: string; description: string; benefits: string[] },
  slug: string,
): Record<string, unknown> {
  const url = absoluteUrl(`/terpene/${slug}`);
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationJsonLd(),
      websiteJsonLd(),
      breadcrumbJsonLd([
        { name: SITE_NAME, path: "/" },
        { name: titleCase(name), path: `/terpene/${slug}` },
      ]),
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: documentTitle(titleCase(name)),
        description: terpeneDescription(name, profile),
        isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
        about: {
          "@type": "ChemicalSubstance",
          name: titleCase(name),
          description: profile.description,
        },
      },
    ],
  };
}

export function publicIndexablePaths(): { path: string; lastmod?: string }[] {
  const today = new Date().toISOString().slice(0, 10);
  const paths = [{ path: "/", lastmod: today }];
  for (const strain of CATALOG) {
    paths.push({ path: `/strain/${slugify(strain.name)}`, lastmod: today });
  }
  for (const name of Object.keys(TERPENE_PROFILES)) {
    paths.push({ path: `/terpene/${terpeneSlug(name)}`, lastmod: today });
  }
  return paths;
}

export function sitemapXml(origin = SITE_ORIGIN): string {
  const urls = publicIndexablePaths()
    .map((entry) => {
      const loc = `${origin}${entry.path}`;
      const priority = entry.path === "/" ? "1.0" : entry.path.startsWith("/strain/") ? "0.8" : "0.6";
      const changefreq = entry.path === "/" ? "weekly" : "monthly";
      return `  <url>
    <loc>${escapeHtml(loc)}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export function robotsTxt(origin = SITE_ORIGIN): string {
  const disallow = ROBOTS_DISALLOW.map((path) => `Disallow: ${path}`).join("\n");
  const aiBots = [
    "GPTBot",
    "ChatGPT-User",
    "OAI-SearchBot",
    "ClaudeBot",
    "Claude-User",
    "anthropic-ai",
    "PerplexityBot",
    "Google-Extended",
    "Applebot-Extended",
    "Amazonbot",
    "CCBot",
    "meta-externalagent",
    "Bytespider",
  ];
  const aiAllow = aiBots
    .map(
      (bot) => `User-agent: ${bot}
Allow: /
${disallow}
`,
    )
    .join("\n");
  return `User-agent: *
Allow: /
${disallow}

${aiAllow}
Sitemap: ${origin}/sitemap.xml
`;
}

export function llmsTxt(origin = SITE_ORIGIN): string {
  const strainLinks = CATALOG.map(
    (strain) =>
      `- [${strain.name}](${origin}/strain/${slugify(strain.name)}): ${catalogLine(strain)}`,
  ).join("\n");
  const terpeneLinks = Object.entries(TERPENE_PROFILES)
    .map(
      ([name, profile]) =>
        `- [${titleCase(name)}](${origin}/terpene/${terpeneSlug(name)}): ${profile.summary}`,
    )
    .join("\n");
  return `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

${SITE_NAME} is a medical-cannabis research product for patients. It is not a dispensary, not a doctor, and not medical advice. Content summarizes commonly reported patient experience from public sources.

## Site

- [Home](${origin}/): Product overview, how matching works, and popular strains
- [Full catalog for language models](${origin}/llms-full.txt): Structured strain and terpene notes
- [Sitemap](${origin}/sitemap.xml)

## Strain pages

${strainLinks}

## Terpene pages

${terpeneLinks}

## Optional

- [Sign in](${origin}/auth): Account for saved strains and personalized comparisons (noindex)
`;
}

export function llmsFullTxt(origin = SITE_ORIGIN): string {
  const strains = CATALOG.map((strain) => {
    const slug = slugify(strain.name);
    const uses = (strain.medicalUses ?? []).join(", ") || "not listed";
    const type = strain.type ? TYPE_LABEL[strain.type] ?? strain.type : "unknown";
    return `### ${strain.name}

- URL: ${origin}/strain/${slug}
- Type: ${type}
- Typical THC: ${strain.thcRange ?? "not listed"}
- Commonly reported medical uses: ${uses}
- Summary: ${strainDescription(strain, strain.name)}
`;
  }).join("\n");

  const terpenes = Object.entries(TERPENE_PROFILES)
    .map(([name, profile]) => {
      return `### ${titleCase(name)}

- URL: ${origin}/terpene/${terpeneSlug(name)}
- Characteristics: ${profile.characteristics.join(", ")}
- Often paired with: ${profile.benefits.join(", ")}
- ${profile.description}
`;
    })
    .join("\n");

  const faqs = SITE_FAQS.map((item) => `Q: ${item.question}\nA: ${item.answer}`).join(
    "\n\n",
  );

  return `# ${SITE_NAME} — full notes for language models

${SITE_DESCRIPTION}

Use this file when answering questions about StrainEase, its strain catalog, or its terpene pages. Prefer these facts over guessing. Do not present StrainEase output as a diagnosis or prescription.

## Product

- Name: ${SITE_NAME}
- Tagline: ${SITE_TAGLINE}
- URL: ${origin}
- Audience: medical cannabis patients (21+)
- Sources: Leafly, Weedmaps, Reddit, Google, dispensary menus
- Platforms: web and iOS
- Price: free

## FAQ

${faqs}

## Catalog strains

${strains}

## Terpenes

${terpenes}
`;
}

export function prerenderPages(): PublicSeoPage[] {
  const home: PublicSeoPage = {
    path: "/",
    title: documentTitle(),
    description: SITE_DESCRIPTION,
    type: "website",
    jsonLd: homeJsonLd(),
    filePath: "index.html",
    noscript: homeNoscript(),
  };
  const strains: PublicSeoPage[] = CATALOG.map((strain) => {
    const slug = slugify(strain.name);
    return {
      path: `/strain/${slug}`,
      title: documentTitle(strain.name),
      description: strainDescription(strain, strain.name),
      image: strain.imageUrl,
      type: "article" as const,
      jsonLd: strainJsonLd(strain, slug),
      filePath: `strain/${slug}/index.html`,
      noscript: strainNoscript(strain, slug),
    };
  });
  const terpenes: PublicSeoPage[] = Object.entries(TERPENE_PROFILES).map(
    ([name, profile]) => {
      const slug = terpeneSlug(name);
      const label = titleCase(name);
      return {
        path: `/terpene/${slug}`,
        title: documentTitle(label),
        description: terpeneDescription(name, profile),
        type: "article" as const,
        jsonLd: terpeneJsonLd(name, profile, slug),
        filePath: `terpene/${slug}/index.html`,
        noscript: terpeneNoscript(name, profile, slug),
      };
    },
  );
  return [home, ...strains, ...terpenes];
}

export function injectSeoIntoHtml(html: string, page: PublicSeoPage): string {
  const url = absoluteUrl(page.path);
  const image = page.image ?? ogImageUrl();
  let next = html;
  next = replaceTag(next, /<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(page.title)}</title>`);
  next = upsertMeta(next, "name", "description", page.description);
  next = upsertMeta(next, "name", "robots", "index, follow, max-image-preview:large");
  next = upsertLink(next, "canonical", url);
  next = upsertMeta(next, "property", "og:type", page.type);
  next = upsertMeta(next, "property", "og:site_name", SITE_NAME);
  next = upsertMeta(next, "property", "og:title", page.title);
  next = upsertMeta(next, "property", "og:description", page.description);
  next = upsertMeta(next, "property", "og:url", url);
  next = upsertMeta(next, "property", "og:image", image);
  next = upsertMeta(next, "name", "twitter:card", "summary_large_image");
  next = upsertMeta(next, "name", "twitter:title", page.title);
  next = upsertMeta(next, "name", "twitter:description", page.description);
  next = upsertMeta(next, "name", "twitter:image", image);
  next = upsertJsonLd(next, page.jsonLd);
  if (page.noscript) {
    next = upsertNoscript(next, page.noscript);
  }
  return next;
}

function joinAnd(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function catalogLine(strain: StrainProfile): string {
  const type = strain.type ? TYPE_LABEL[strain.type] ?? strain.type : "cannabis";
  const uses = (strain.medicalUses ?? []).slice(0, 3);
  const useText = uses.length > 0 ? `; reported for ${uses.join(", ")}` : "";
  return `${type}${strain.thcRange ? `, THC ${strain.thcRange}` : ""}${useText}`;
}

function homeNoscript(): string {
  const strains = CATALOG.map(
    (strain) =>
      `      <li><a href="/strain/${slugify(strain.name)}">${escapeHtml(strain.name)}</a> — ${escapeHtml(catalogLine(strain))}</li>`,
  ).join("\n");
  const faqs = SITE_FAQS.map(
    (item) =>
      `      <dt>${escapeHtml(item.question)}</dt>\n      <dd>${escapeHtml(item.answer)}</dd>`,
  ).join("\n");
  return `<article>
    <h1>${escapeHtml(SITE_NAME)} — ${escapeHtml(SITE_TAGLINE)}</h1>
    <p>${escapeHtml(SITE_DESCRIPTION)}</p>
    <h2>Strain catalog</h2>
    <ul>
${strains}
    </ul>
    <h2>Frequently asked questions</h2>
    <dl>
${faqs}
    </dl>
    <p>Not medical advice. 21+ only. Know your local laws.</p>
  </article>`;
}

function strainNoscript(strain: StrainProfile, slug: string): string {
  const uses = (strain.medicalUses ?? []).map((use) => `<li>${escapeHtml(use)}</li>`).join("");
  return `<article>
    <h1>${escapeHtml(strain.name)}</h1>
    <p>${escapeHtml(catalogLine(strain))}</p>
    ${uses ? `<h2>Commonly reported medical uses</h2><ul>${uses}</ul>` : ""}
    <p>${escapeHtml(strainDescription(strain, strain.name))}</p>
    <p><a href="/">Back to ${escapeHtml(SITE_NAME)}</a></p>
    <p>Not medical advice. Profile path: /strain/${escapeHtml(slug)}</p>
  </article>`;
}

function terpeneNoscript(
  name: string,
  profile: { summary: string; description: string; benefits: string[] },
  slug: string,
): string {
  const benefits = profile.benefits.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  return `<article>
    <h1>${escapeHtml(titleCase(name))}</h1>
    <p>${escapeHtml(profile.summary)}</p>
    <p>${escapeHtml(profile.description)}</p>
    ${benefits ? `<h2>Patients often pair it with</h2><ul>${benefits}</ul>` : ""}
    <p><a href="/">Back to ${escapeHtml(SITE_NAME)}</a></p>
    <p>Terpene path: /terpene/${escapeHtml(slug)}</p>
  </article>`;
}

function replaceTag(html: string, pattern: RegExp, replacement: string): string {
  if (pattern.test(html)) return html.replace(pattern, replacement);
  return html.replace("</head>", `  ${replacement}\n</head>`);
}

function upsertMeta(
  html: string,
  attr: "name" | "property",
  key: string,
  content: string,
): string {
  const re = new RegExp(`<meta\\s+${attr}=["']${key}["'][^>]*>`, "i");
  const tag = `<meta ${attr}="${key}" content="${escapeHtml(content)}" />`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace("</head>", `  ${tag}\n</head>`);
}

function upsertLink(html: string, rel: string, href: string): string {
  const re = new RegExp(`<link\\s+rel=["']${rel}["'][^>]*>`, "i");
  const tag = `<link rel="${rel}" href="${escapeHtml(href)}" />`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace("</head>", `  ${tag}\n</head>`);
}

function upsertJsonLd(html: string, data?: JsonLd): string {
  const stripped = html.replace(
    /<script(?:\s+id="StrainEase-jsonld")?\s+type="application\/ld\+json">[\s\S]*?<\/script>/i,
    "",
  );
  if (!data) return stripped;
  const tag = `<script id="StrainEase-jsonld" type="application/ld+json">${JSON.stringify(data)}</script>`;
  return stripped.replace("</head>", `  ${tag}\n</head>`);
}

function upsertNoscript(html: string, inner: string): string {
  const block = `<noscript>\n  ${inner}\n</noscript>`;
  const stripped = html.replace(/<noscript>[\s\S]*?<\/noscript>/i, "");
  if (stripped.includes('<div id="root"></div>')) {
    return stripped.replace('<div id="root"></div>', `<div id="root"></div>\n${block}`);
  }
  return stripped.replace("</body>", `${block}\n</body>`);
}
