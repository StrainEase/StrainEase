// Weedmaps has no documented public strain API, but their catalog endpoint
// is served to the public site without a key. Same posture as the Leafly
// scrape: read-only, defensive, return null/partial rather than throw.
//
// Cloudflare sits in front of api-g.weedmaps.com and challenges calls
// that look like a server-side desktop browser — a plain "curl/8.0" UA
// sails through, a long Chrome desktop UA on a non-browser connection
// gets 406. The retry-with-backoff below absorbs the occasional
// challenge that slips through when the WAF ratchets up.
import type { CommunityNote, StrainProfile, StrainType } from "./types";
import { slugify } from "./leafly";

const BASE = "https://api-g.weedmaps.com/wm/v1/strains";
// Plain curl-style UA — Cloudflare's WAF challenges full desktop Chrome
// UAs that arrive on a non-browser connection. curl/8.0 returned 200
// in repeated probes where the prior Chrome desktop UA returned 406.
const UA = "curl/8.0";
const CACHE_TTL_MS = 30 * 60 * 1000;
// Negative cache TTL — short enough that a transient WAF block doesn't
// stick for long, but long enough to avoid hot-looping on rate limits.
const NEG_CACHE_TTL_MS = 5 * 60 * 1000;

const cache = new Map<string, { at: number; profile: StrainProfile | null }>();

// Weedmaps' catalog endpoint has no public schema; we narrow on read below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawRecord = Record<string, any>;

function typeFrom(species?: string): StrainType | undefined {
  const c = (species ?? "").toLowerCase();
  if (c.includes("indica")) return "indica";
  if (c.includes("sativa")) return "sativa";
  if (c.includes("hybrid")) return "hybrid";
  return undefined;
}

function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x27;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
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

function rangeFrom(min?: unknown, max?: unknown): string | undefined {
  const lo = typeof min === "number" && min > 0 ? min : null;
  const hi = typeof max === "number" && max > 0 ? max : null;
  if (lo !== null && hi !== null && lo !== hi) {
    return `${lo}–${hi}%`;
  }
  if (hi !== null) return `~${hi}%`;
  if (lo !== null) return `~${lo}%`;
  return undefined;
}

/**
 * Pull the aggregate rating + review count from a Weedmaps detail
 * payload. The endpoint has no public schema; we read defensively
 * across the field names the response has shipped under in the past
 * (`average_rating`, `reviews_average`, `rating`, `averageRating`).
 * Counts come from `reviews_count` / `review_count` / `reviewsCount`.
 * Anything that isn't a finite number is dropped — the iOS UI shows
 * the card only when both fields are present.
 */
function readRating(raw: RawRecord): {
  weedmapsRating?: number;
  weedmapsReviewCount?: number;
} {
  const out: { weedmapsRating?: number; weedmapsReviewCount?: number } = {};
  const ratingCandidates = [
    raw.average_rating,
    raw.reviews_average,
    raw.averageRating,
    raw.rating,
  ];
  for (const candidate of ratingCandidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      out.weedmapsRating = Math.round(candidate * 10) / 10;
      break;
    }
  }
  const countCandidates = [
    raw.reviews_count,
    raw.review_count,
    raw.reviewsCount,
    raw.reviewCount,
  ];
  for (const candidate of countCandidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      out.weedmapsReviewCount = Math.round(candidate);
      break;
    }
  }
  return out;
}

function tagged(list: unknown, limit: number): { name: string; votes: number }[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter(
      (v): v is RawRecord =>
        !!v && typeof v === "object" && typeof v.name === "string",
    )
    .map((v) => ({
      name: v.name as string,
      votes: typeof v.votes === "number" ? v.votes : 0,
    }))
    .filter((v) => v.name !== "" && v.votes > 0)
    .sort((a, b) => b.votes - a.votes)
    .slice(0, limit);
}

function lineageFrom(text: string): string | undefined {
  const cross = text.match(
    /cross of\s+([^.,]{2,40}?)\s+and\s+([^.,]{2,40}?)(?:[.,]|$)/i,
  );
  if (cross) return `${cross[1].trim()} × ${cross[2].trim()}`;
  const times = text.match(
    /([A-Z][\w'’-]{1,28}(?:\s+[A-Z][\w'’-]+){0,3})\s+[×x]\s+([A-Z][\w'’-]{1,28}(?:\s+[A-Z][\w'’-]+){0,3})/,
  );
  if (times) return `${times[1].trim()} × ${times[2].trim()}`;
  return undefined;
}

function communityFrom(raw: RawRecord, uses: string[]): CommunityNote[] {
  const notes: CommunityNote[] = [];
  if (uses.length > 0) {
    notes.push({
      source: "Weedmaps",
      text: `Patients most often tag it for ${uses.slice(0, 3).join(", ")}.`,
      kind: "weedmaps",
    });
  }
  const desc = htmlToText(
    typeof raw.description === "string" ? raw.description : "",
  );
  if (desc) {
    notes.push({
      source: "Weedmaps listing",
      text: firstSentences(desc, 280),
      kind: "weedmaps",
    });
  }
  return notes;
}

function toProfile(raw: RawRecord): StrainProfile | null {
  const name = typeof raw.name === "string" ? raw.name : "";
  if (!name) return null;
  const descHtml = typeof raw.description === "string" ? raw.description : "";
  const desc = htmlToText(descHtml);
  const uses = tagged(raw.medical_conditions, 8).map((u) => u.name);
  const effectsRaw = tagged(raw.effects, 5);
  const topVotes = effectsRaw[0]?.votes ?? 0;
  return {
    name,
    inKnowledgeBase: true,
    type: typeFrom(raw.species),
    thcRange: rangeFrom(raw.thc_min, raw.thc_max),
    cbdRange: rangeFrom(raw.cbd_min, raw.cbd_max),
    lineage: lineageFrom(desc),
    medicalUses: uses.length > 0 ? uses : undefined,
    effects:
      effectsRaw.length > 0
        ? effectsRaw.map((e) => ({
            name: e.name,
            intensity: Math.max(
              1,
              Math.min(5, Math.round((e.votes / Math.max(topVotes, 1)) * 5)),
            ),
          }))
        : undefined,
    description: desc ? firstSentences(desc) : undefined,
    communityNotes: communityFrom(raw, uses),
    imageUrl: imageFrom(raw),
    ...readRating(raw),
  };
}

function imageFrom(raw: RawRecord): string | undefined {
  const avatar = raw.avatar_image;
  const image = raw.image;
  const candidates = [
    typeof avatar === "object" && avatar
      ? (avatar as RawRecord).original_url ?? (avatar as RawRecord).url
      : undefined,
    typeof image === "object" && image
      ? (image as RawRecord).url ?? (image as RawRecord).original_url
      : undefined,
    raw.image_url,
    raw.photo_url,
    raw.featured_image,
    raw.avatar_url,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && /^https:\/\//i.test(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

async function getJson(url: string): Promise<RawRecord | null> {
  // One retry on the WAF challenge statuses (403/406/429) with a short
  // backoff. Anything else is a hard fail — we don't burn budget on
  // real 4xx (the slug doesn't exist) or 5xx storms.
  const statuses = [403, 406, 429];
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "application/json" },
        signal: ctrl.signal,
      });
      if (res.ok) {
        return (await res.json()) as RawRecord;
      }
      if (!statuses.includes(res.status) || attempt === 1) {
        return null;
      }
    } catch {
      if (attempt === 1) return null;
    } finally {
      clearTimeout(timer);
    }
    // 200ms → 600ms before the retry. Keeps total wait under a second
    // even when both attempts fail, so a single stuck strain doesn't
    // blow the callable's 60s budget.
    await new Promise((r) => setTimeout(r, 200 + attempt * 400));
  }
  return null;
}

async function fetchBySlug(slug: string): Promise<StrainProfile | null> {
  const json = await getJson(`${BASE}/${encodeURIComponent(slug)}`);
  const attrs = json?.data?.attributes;
  if (!attrs || typeof attrs !== "object") return null;
  return toProfile(attrs as RawRecord);
}

/** Exact name match only — never the first search hit. */
export function pickWeedmapsSlug(
  list: unknown,
  name: string,
): string | null {
  if (!Array.isArray(list)) return null;
  const wanted = name.trim().toLowerCase();
  const match = list.find((item: RawRecord) => {
    const n = item?.attributes?.name;
    return typeof n === "string" && n.toLowerCase() === wanted;
  });
  const slug = match?.attributes?.slug;
  return typeof slug === "string" && slug !== "" ? slug : null;
}

async function fetchBySearch(name: string): Promise<StrainProfile | null> {
  const json = await getJson(
    `${BASE}?search=${encodeURIComponent(name)}&page[size]=10`,
  );
  const slug = pickWeedmapsSlug(json?.data, name);
  if (!slug) return null;
  return fetchBySlug(slug);
}

export async function fetchWeedmapsProfile(
  name: string,
): Promise<StrainProfile | null> {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  const hit = cache.get(key);
  if (hit) {
    // Positive hits stick for the full TTL. Negative hits expire
    // sooner so a transient WAF block doesn't keep us off a strain
    // for half an hour.
    const ttl = hit.profile ? CACHE_TTL_MS : NEG_CACHE_TTL_MS;
    if (Date.now() - hit.at < ttl) return hit.profile;
  }

  const slug = slugify(name);
  let profile = slug ? await fetchBySlug(slug) : null;
  if (!profile) profile = await fetchBySearch(name);

  cache.set(key, { at: Date.now(), profile });
  return profile;
}

export async function fetchWeedmapsProfiles(
  names: string[],
): Promise<(StrainProfile | null)[]> {
  return Promise.all(names.map(fetchWeedmapsProfile));
}
