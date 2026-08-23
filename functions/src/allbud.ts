// Allbud exposes strain detail pages with stable HTML structure but no
// JSON-LD strain payload. Two structured h4 elements carry the most
// reliable signal:
//   <h4 class="variety">…Sativa Dominant Hybrid - 60% Sativa / 40% Indica</h4>
//   <h4 class="percentage">THC: 17% - 24%, CBD: 2 %, CBN: 1 %</h4>
// Effect / medical-use / flavor panels live in <section data-label="…">
// blocks. Read-only scrape, no key, defensive — fields we can't find
// just stay empty.
import type { CommunityNote, StrainProfile, StrainType } from "./types";
import { slugify } from "./leafly";

const BASE = "https://www.allbud.com";
// Browser-style UA. Allbud's WAF is more permissive than Weedmaps' and
// returns 200 to a desktop Chrome; the curl-style UA we use for
// Weedmaps is also fine but the rendered HTML doesn't depend on it.
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const CACHE_TTL_MS = 30 * 60 * 1000;
const NEG_CACHE_TTL_MS = 5 * 60 * 1000;

// Allbud splits strains by species in the URL, but the server returns
// the same page for every species — so the URL path is only useful as
// a fetch hint. We try the common species in parallel and use the
// first response that has the strain panels. "cbd" covers high-CBD
// strains that don't fit the three species buckets.
const SPECIES_PATHS = ["sativa", "indica", "hybrid", "cbd"] as const;

const cache = new Map<string, { at: number; profile: StrainProfile | null }>();

function typeFromSpecies(species: string): StrainType | undefined {
  const s = species.toLowerCase();
  if (s === "sativa") return "sativa";
  if (s === "indica") return "indica";
  if (s === "hybrid") return "hybrid";
  return undefined;
}

function htmlDecode(s: string): string {
  return s
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#39;/gi, "'")
    .replace(/&#8211;/gi, "–")
    .replace(/&#8212;/gi, "—")
    .replace(/&#8217;/gi, "'")
    .replace(/&#8220;/gi, "\u201c")
    .replace(/&#8221;/gi, "\u201d");
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ");
}

function compressWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Pull the visible text from a named Allbud panel. Each panel is a
 * <section data-label="…"> with the items inside <a> tags within a
 * "panel-body well tags-list" div, comma-separated. We anchor on
 * data-label="LABEL" then read until the next </section>.
 */
function readPanel(html: string, label: string): string | undefined {
  const re = new RegExp(
    `data-label="${label}"[\\s\\S]*?<div class="panel-body well tags-list">([\\s\\S]*?)</div>`,
    "i",
  );
  const m = re.exec(html);
  if (!m) return undefined;
  return compressWhitespace(stripTags(htmlDecode(m[1])));
}

function splitList(s: string | undefined): string[] {
  if (!s) return [];
  return s
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "");
}

function readTags(html: string, label: string): string[] {
  return splitList(readPanel(html, label));
}

/**
 * Allbud renders the species and the THC/CBD numbers into two <h4>
 * elements in the strain header:
 *   <h4 class="variety">…Sativa Dominant Hybrid - 60% Sativa / 40% Indica</h4>
 *   <h4 class="percentage">THC: 17% - 24%, CBD: 2 %, CBN: 1 %</h4>
 * These are far more reliable than prose in the lead paragraph, so
 * we anchor the type + cannabinoid parsing to them.
 */
function readVariety(html: string): { type?: StrainType } {
  const m = html.match(
    /<h4[^>]*class="[^"]*variety[^"]*"[^>]*>([\s\S]*?)<\/h4>/i,
  );
  if (!m) return {};
  const text = compressWhitespace(stripTags(htmlDecode(m[1])));
  // "Indica Dominant Hybrid" or "Sativa Dominant Hybrid" — the site
  // uses the X Dominant Hybrid label for true hybrids, so a plain
  // "Sativa" or "Indica" is a pure-strain declaration.
  const dom = text.match(/\b(Sativa|Indica)\s+Dominant\s+Hybrid/i);
  if (dom) return { type: typeFromSpecies(dom[1]) };
  const pure = text.match(/^(Sativa|Indica|Hybrid)\b/);
  if (pure) return { type: typeFromSpecies(pure[1]) };
  return {};
}

function readCannabinoids(html: string): {
  thc?: string;
  cbd?: string;
} {
  const m = html.match(
    /<h4[^>]*class="[^"]*percentage[^"]*"[^>]*>([\s\S]*?)<\/h4>/i,
  );
  if (!m) return {};
  const text = compressWhitespace(stripTags(htmlDecode(m[1])));
  // Match each token. Examples after whitespace collapse:
  //   "THC: 17% - 24%, CBD: 2 %, CBN: 1 %"
  //   "THC: 26%"
  //   "THC: 20% - 26%, CBN: 1 %"  (no CBD field at all)
  const out: { thc?: string; cbd?: string } = {};
  const thcMatch = text.match(
    /THC\s*:\s*(\d+(?:\.\d+)?\s*%?\s*[-–]?\s*\d*(?:\.\d+)?\s*%?)/i,
  );
  if (thcMatch) {
    const raw = thcMatch[1].replace(/\s+/g, "").trim();
    // Allbud formats ranges as "17%-24%" (percent on each side) or
    // single values as "26%". Both shapes after whitespace stripping.
    const range = raw.match(
      /^(\d+(?:\.\d+)?)%?[-–](\d+(?:\.\d+)?)%$/,
    );
    if (range) {
      out.thc = `${range[1]}–${range[2]}%`;
    } else {
      const single = raw.match(/^(\d+(?:\.\d+)?)(%)?$/);
      if (single) out.thc = `${single[1]}${single[2] ?? "%"}`;
    }
  }
  const cbdMatch = text.match(/CBD\s*:\s*(\d+(?:\.\d+)?\s*%?)/i);
  if (cbdMatch) {
    const raw = cbdMatch[1].replace(/\s+/g, "").trim();
    const single = raw.match(/^(\d+(?:\.\d+)?)(%)?$/);
    if (single) out.cbd = `${single[1]}${single[2] ?? "%"}`;
  }
  return out;
}

/** "cross between the hugely popular Blueberry X Haze strains" */
function readLineage(text: string): string | undefined {
  const cross = text.match(
    /cross\s+between\s+(?:the\s+)?(?:hugely\s+popular\s+)?([^.,]{2,80}?)\s+(?:X|×|x|and)\s+([^.,]{2,80}?)(?:\s+strains?)?(?:[.,]|$)/i,
  );
  if (cross) {
    const a = cross[1].trim().replace(/^(?:the\s+)?(?:hugely\s+)?popular\s+/i, "");
    const b = cross[2].trim().replace(/\s+strains?$/i, "");
    return `${a} × ${b}`;
  }
  return undefined;
}

function firstSentences(text: string, maxChars = 420): string {
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars);
  const lastStop = Math.max(
    cut.lastIndexOf(". "),
    cut.lastIndexOf("! "),
    cut.lastIndexOf("? "),
  );
  return (lastStop > 80 ? cut.slice(0, lastStop + 1) : cut).trim();
}

function communityFrom(
  effects: string[],
  medical: string[],
  flavors: string[],
  lead: string | undefined,
): CommunityNote[] {
  const notes: CommunityNote[] = [];
  if (effects.length > 0) {
    notes.push({
      source: "Allbud",
      text: `Patients most often report: ${effects.slice(0, 4).join(", ")}.`,
    });
  }
  if (medical.length > 0) {
    notes.push({
      source: "Allbud",
      text: `Commonly used for ${medical.slice(0, 4).join(", ")}.`,
    });
  }
  if (flavors.length > 0) {
    notes.push({
      source: "Allbud",
      text: `Flavor profile: ${flavors.slice(0, 4).join(", ")}.`,
    });
  }
  if (lead) {
    notes.push({
      source: "Allbud listing",
      text: firstSentences(lead, 280),
    });
  }
  return notes;
}

function toProfile(html: string): StrainProfile | null {
  // Real Allbud pages render the strain's name into the <title> tag;
  // a 404 / wrong species path returns a generic page with no panels.
  const title = compressWhitespace(
    stripTags(
      htmlDecode(
        html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "",
      ),
    ),
  );
  if (!title || title.toLowerCase().includes("404")) return null;
  if (!html.includes('data-label="positive_effects"')) return null;

  const effects = readTags(html, "positive_effects");
  const medical = readTags(html, "relieved_symptoms");
  const flavors = readTags(html, "strain_flavors");
  const lead =
    html.match(
      /<meta\s+property="og:description"\s+content="([\s\S]*?)"/i,
    )?.[1] ?? undefined;
  const leadPlain = lead
    ? compressWhitespace(stripTags(htmlDecode(lead)))
    : undefined;
  const lineage = readLineage(leadPlain ?? title);
  const { type } = readVariety(html);
  const { thc, cbd } = readCannabinoids(html);

  // Pull the canonical name from the title; Allbud formats it
  // "Blue Dream Marijuana Strain Information - Allbud".
  const nameFromTitle = title
    .replace(/\s+Marijuana Strain Information.*$/i, "")
    .replace(/\s+[-–]\s+Allbud.*$/i, "")
    .trim();

  return {
    name: nameFromTitle,
    inKnowledgeBase: true,
    type,
    thcRange: thc,
    cbdRange: cbd,
    lineage,
    medicalUses: medical.length > 0 ? medical : undefined,
    effects: effects.length > 0
      ? effects.slice(0, 5).map((name) => ({ name, intensity: 3 }))
      : undefined,
    description: leadPlain ? firstSentences(leadPlain) : undefined,
    communityNotes: communityFrom(effects, medical, flavors, leadPlain),
  };
}

async function fetchHtml(path: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchAllbudProfile(
  name: string,
): Promise<StrainProfile | null> {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  const hit = cache.get(key);
  if (hit) {
    const ttl = hit.profile ? CACHE_TTL_MS : NEG_CACHE_TTL_MS;
    if (Date.now() - hit.at < ttl) return hit.profile;
  }

  const slug = slugify(name);
  if (!slug) {
    cache.set(key, { at: Date.now(), profile: null });
    return null;
  }

  // Try each species path in parallel; the first non-null profile wins.
  const results = await Promise.all(
    SPECIES_PATHS.map((species) =>
      fetchHtml(`/marijuana-strains/${species}/${slug}`),
    ),
  );
  let profile: StrainProfile | null = null;
  for (const html of results) {
    if (!html) continue;
    const candidate = toProfile(html);
    if (candidate) {
      profile = candidate;
      break;
    }
  }

  cache.set(key, { at: Date.now(), profile });
  return profile;
}

export async function fetchAllbudProfiles(
  names: string[],
): Promise<(StrainProfile | null)[]> {
  return Promise.all(names.map(fetchAllbudProfile));
}
