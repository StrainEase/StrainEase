// Leafly has no public API for strain data, so we read the data their public
// site embeds in its pages (Next.js __NEXT_DATA__ JSON). This is a read-only
// scrape of public pages — no keys needed, but the HTML structure can change,
// so the parsers below are defensive and return empty/partial data rather
// than throwing when a field is missing.
import {
  getCachedStrainProfile,
  putCachedStrainProfile,
} from "./strain-info-cache";
import type { CommunityNote, StrainProfile, StrainType } from "./types";

const BASE = "https://www.leafly.com";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const CACHE_TTL_MS = 15 * 60 * 1000;

// Per-instance in-memory cache so repeat lookups (popular list, same strain)
// don't re-hit Leafly. Resets when the instance is recycled, which is fine.
const htmlCache = new Map<string, { at: number; html: string }>();

type RawRecord = Record<string, any>;

export async function fetchLeaflyHtml(path: string): Promise<string> {
  const hit = htmlCache.get(path);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.html;

  const res = await fetch(`${BASE}${path}`, {
    headers: { "User-Agent": UA, Accept: "text/html" },
  });
  if (!res.ok) {
    throw new Error(`Leafly returned status ${res.status}`);
  }
  const html = await res.text();
  htmlCache.set(path, { at: Date.now(), html });
  return html;
}

/** Extract the __NEXT_DATA__ JSON blob embedded in Leafly pages. */
export function extractNextData(html: string): Record<string, unknown> | null {
  const m = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
  );
  if (!m) return null;
  try {
    return JSON.parse(m[1]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function typeFrom(category?: string): StrainType | undefined {
  const c = (category ?? "").toLowerCase();
  if (c.includes("indica")) return "indica";
  if (c.includes("sativa")) return "sativa";
  if (c.includes("hybrid")) return "hybrid";
  return undefined;
}

/** Flatten an object of { key: { name, score, ... } } sorted by score desc. */
function topScored(
  obj: unknown,
  limit: number,
): { name: string; score: number; extra?: string }[] {
  if (!obj || typeof obj !== "object") return [];
  const entries = Object.values(obj as RawRecord)
    .filter((v) => v && typeof v === "object" && typeof v.score === "number")
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return entries.map((v) => ({
    name: typeof v.name === "string" ? v.name : "",
    score: v.score as number,
    extra: typeof v.description === "string" ? v.description : undefined,
  }));
}

function effectsFrom(obj: unknown, limit = 5): StrainProfile["effects"] {
  return topScored(obj, limit)
    .filter((e) => e.name !== "")
    .map((e) => ({
      name: e.name,
      // Leafly scores are roughly 0..2.5; map to a 1-5 intensity bar.
      intensity: Math.max(1, Math.min(5, Math.round(e.score * 2))),
    }));
}

function terpenesFrom(obj: unknown, limit = 4): StrainProfile["terpenes"] {
  return topScored(obj, limit)
    .filter((t) => t.name !== "")
    .map((t) => ({ name: t.name, profile: t.extra ?? "" }));
}

function usesFrom(...objs: unknown[]): string[] {
  const out: string[] = [];
  for (const obj of objs) {
    for (const { name, score } of topScored(obj, 30)) {
      if (score > 0 && name !== "" && !out.includes(name)) out.push(name);
    }
  }
  return out.slice(0, 8);
}

function thcRangeFrom(raw: RawRecord): string | undefined {
  const thc = raw?.cannabinoids?.thc?.percentile50 ?? raw?.thc;
  if (typeof thc === "number" && thc > 0) return `~${thc}%`;
  return undefined;
}

function cbdRangeFrom(raw: RawRecord): string | undefined {
  const cbd = raw?.cannabinoids?.cbd?.percentile50;
  if (typeof cbd === "number" && cbd > 0) return `~${cbd}%`;
  return undefined;
}

function isPlaceholderImage(url: string): boolean {
  return /\/strains\/flowers\/default\.(png|svg|jpe?g|webp)/i.test(url);
}

function firstHttpsImage(...candidates: unknown[]): string | undefined {
  for (const candidate of candidates) {
    if (
      typeof candidate === "string" &&
      /^https:\/\//i.test(candidate) &&
      !isPlaceholderImage(candidate)
    ) {
      return candidate;
    }
  }
  return undefined;
}

function highlightedPhoto(raw: RawRecord): string | undefined {
  if (!Array.isArray(raw.highlightedPhotos)) return undefined;
  for (const item of raw.highlightedPhotos) {
    if (item && typeof item === "object") {
      const url = (item as RawRecord).imageUrl;
      if (typeof url === "string" && /^https:\/\//i.test(url)) return url;
    }
  }
  return undefined;
}

/** Prefer Leafly's nug shot; fall back to a review photo. */
function imageFrom(raw: RawRecord): string | undefined {
  return firstHttpsImage(
    raw.nugImage,
    raw.stockNugImage,
    raw.imageUrl,
    raw.image,
    raw.photoUrl,
    raw.photo_url,
    highlightedPhoto(raw),
  );
}

function clipReview(text: string, max = 280): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  const cut = cleaned.slice(0, max);
  const lastStop = Math.max(
    cut.lastIndexOf(". "),
    cut.lastIndexOf("! "),
    cut.lastIndexOf("? "),
  );
  if (lastStop > 80) return cut.slice(0, lastStop + 1).trim();
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 60 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

function reviewsListFrom(reviews: unknown): unknown[] {
  if (Array.isArray(reviews)) return reviews;
  if (reviews && typeof reviews === "object") {
    const rec = reviews as RawRecord;
    for (const key of ["reviews", "items", "data", "results"]) {
      if (Array.isArray(rec[key])) return rec[key] as unknown[];
    }
  }
  return [];
}

function reviewTextFrom(raw: RawRecord): string {
  for (const key of ["text", "body", "content", "comment"]) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function mergeReviewNotes(...lists: CommunityNote[][]): CommunityNote[] {
  const seen = new Set<string>();
  const out: CommunityNote[] = [];
  for (const list of lists) {
    for (const note of list) {
      const key = `${note.source}|${note.text.slice(0, 80)}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(note);
      if (out.length >= 8) return out;
    }
  }
  return out;
}

/**
 * Patient-language keywords that signal a review is talking about medical
 * or symptom-relief use, rather than recreational effects. Matched as
 * whole words against lowercased text. The list is deliberately broad:
 * patients describe relief in many ways, and missing a real medical
 * review is worse than over-matching a recreational one.
 */
const MEDICAL_KEYWORDS: readonly string[] = [
  // Common ailments / symptoms
  "pain",
  "anxiety",
  "anxious",
  "panic",
  "depression",
  "depressed",
  "insomnia",
  "sleep",
  "slept",
  "sleeping",
  "nausea",
  "nauseous",
  "migraine",
  "headache",
  "headaches",
  "cramps",
  "cramp",
  "spasm",
  "spasms",
  "inflammation",
  "arthritis",
  "ptsd",
  "trauma",
  "adhd",
  "focus",
  "fatigue",
  "stressed",
  "stress",
  "tension",
  "restless",
  // Relief language
  "relief",
  "relieve",
  "relieved",
  "eases",
  "ease",
  "eased",
  "helps",
  "helped",
  "helping",
  "treat",
  "treats",
  "treating",
  "manage",
  "manages",
  "managing",
  "control",
  "controls",
  "calms",
  "calm",
  "soothes",
  "soothe",
  // Medical framing
  "medical",
  "medicine",
  "medicinal",
  "patient",
  "patients",
  "doctor",
  "physician",
  "clinic",
  "prescription",
  "diagnosis",
  "diagnosed",
  "chronic",
  "acute",
  "dose",
  "dosage",
  "mg",
  "thc",
  "cbd",
  "terpene",
  "terpenes",
];

/**
 * Aliases that link the canonical ailment names we save in the
 * patient's profile to the natural-language words a Leafly reviewer
 * uses. The first term is the patient's canonical label (so the
 * matcher works even when the review uses the exact same word), the
 * rest are common paraphrases. Kept here next to MEDICAL_KEYWORDS so
 * they stay close to the rest of the medical-language vocabulary.
 */
const AILMENT_ALIASES: Record<string, string[]> = {
  insomnia: ["insomnia", "sleep", "asleep", "sleeping", "sleepless", "restless"],
  anxiety: ["anxiety", "anxious", "panic", "stress", "stressed", "tension"],
  ocd: ["ocd", "obsessive", "anxious"],
  adhd: ["adhd", "add", "focus"],
  "chronic pain": ["chronic pain", "pain", "aching", "ache", "sore"],
  depression: ["depression", "depressed", "mood"],
  "nausea & appetite": ["nausea", "nauseous", "appetite", "hungry", "eating"],
  inflammation: ["inflammation", "inflamed", "swelling", "swollen"],
  migraine: ["migraine", "headache", "headaches"],
  "muscle spasm": ["spasm", "spasms", "cramp", "cramps"],
  ptsd: ["ptsd", "flashback", "trauma"],
  fatigue: ["fatigue", "tired", "exhausted", "energy"],
  arthritis: ["arthritis", "joint", "joints"],
  stress: ["stress", "stressed", "tension"],
};

/**
 * Hype / first-person celebration patterns that signal a recreational
 * review rather than a patient-language report. We strip the noise
 * characters first so "I GOT SO HIGH!!!" and "lmao cooked" both match.
 * Reviews that consist almost entirely of these phrases are dropped
 * before scoring.
 */
const HYPE_PHRASES: readonly string[] = [
  "got so high",
  "so high",
  "got too high",
  "way too high",
  "got cooked",
  "absolutely cooked",
  "blazed",
  "smacked",
  "fucked up",
  "messed up",
  "ripped",
  "zonked",
  "knocked me on my ass",
  "couldn't move",
  "couldnt move",
  "couldn't feel my",
  "couldnt feel my",
  "couldn't stop laughing",
  "couldnt stop laughing",
  "non stop laughing",
];

/** True when the text is dominated by hype / celebration phrasing. */
function isHypeReview(text: string): boolean {
  if (!text) return false;
  const stripped = text
    .toLowerCase()
    .replace(/[!.?,;:*\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (stripped.length < 40) return false;
  let hypeHits = 0;
  for (const phrase of HYPE_PHRASES) {
    if (stripped.includes(phrase)) hypeHits++;
  }
  // Two or more distinct hype signals — almost certainly a recreational
  // report rather than a patient-language writeup.
  return hypeHits >= 2;
}

/** Expand a canonical ailment name into the terms we look for in a review. */
export function ailmentTerms(condition: string): string[] {
  const key = condition.trim().toLowerCase();
  if (!key) return [];
  const aliases = AILMENT_ALIASES[key];
  return aliases ? aliases : [key];
}

/**
 * Score a single review for medical relevance. Count keyword hits in
 * the lowercased text and bias toward longer reviews (which carry more
 * usable signal). When `conditions` is supplied, any term that matches
 * the patient's ailment aliases counts extra so the top of the list
 * stays useful for them. Exposed for tests.
 */
export function medicalScore(
  text: string,
  conditions: readonly string[] = [],
): number {
  if (!text) return 0;
  const lower = text.toLowerCase();
  let hits = 0;
  for (const kw of MEDICAL_KEYWORDS) {
    if (!kw) continue;
    const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
    const matches = lower.match(re);
    if (matches) hits += matches.length;
  }
  // Ailment-specific boost. We treat each ailment-alias hit as worth
  // a full MEDICAL_KEYWORDS hit but only once per term so a single
  // review doesn't get an outsized score for spamming one word.
  const seen = new Set<string>();
  for (const c of conditions) {
    for (const term of ailmentTerms(c)) {
      const t = term.trim().toLowerCase();
      if (!t || seen.has(t)) continue;
      seen.add(t);
      const re = new RegExp(
        `\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        "g",
      );
      if (re.test(lower)) hits += 1;
    }
  }
  // Slight preference for reviews in the 80–400 char sweet spot. Anything
  // shorter than the 40-char floor is filtered out before this runs.
  const len = text.length;
  const lenBoost = len >= 80 && len <= 400 ? 0.5 : 0;
  return hits + lenBoost;
}

/** Sort reviews by medical score desc, then by review rating desc, then by length desc. */
function rankByMedical(
  reviews: RawRecord[],
  conditions: readonly string[] = [],
): RawRecord[] {
  return reviews
    .map((r) => {
      const text = typeof r.text === "string" ? r.text : "";
      const rating =
        typeof r.rating === "number"
          ? r.rating
          : typeof r.averageRating === "number"
            ? r.averageRating
            : 0;
      return {
        r,
        score: medicalScore(text, conditions),
        rating,
        length: text.length,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.rating !== a.rating) return b.rating - a.rating;
      return b.length - a.length;
    })
    .map(({ r }) => r);
}

/**
 * Convert Leafly review rows into CommunityNote strings for the UI.
 * Reviews are ranked by medical relevance first (so symptom / relief
 * language surfaces), then by rating, then by length. If no review
 * scores positively on medical terms, fall back to the same ranking
 * without the medical preference — patients still get the best of what
 * was written.
 */
export function reviewNotesFrom(
  reviews: unknown,
  conditions: readonly string[] = [],
): CommunityNote[] {
  const cleaned: RawRecord[] = [];
  for (const raw of reviewsListFrom(reviews)) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as RawRecord;
    const text = reviewTextFrom(r);
    if (text.length < 40) continue;
    if (isHypeReview(text)) continue;
    cleaned.push(r);
  }
  const ranked = rankByMedical(cleaned, conditions);
  const out: CommunityNote[] = [];
  for (const r of ranked) {
    const text = typeof r.text === "string" ? r.text.trim() : "";
    const username =
      typeof r.username === "string" && r.username.trim()
        ? r.username.trim()
        : "a Leafly reviewer";
    out.push({
      source: `Leafly review · ${username}`,
      text: clipReview(text),
    });
    if (out.length >= 8) break;
  }
  return out;
}

function ratingFrom(raw: RawRecord): {
  leaflyRating?: number;
  leaflyReviewCount?: number;
} {
  const stars =
    typeof raw.averageRating === "number"
      ? raw.averageRating
      : typeof raw.rating === "number"
        ? raw.rating
        : undefined;
  const count =
    typeof raw.reviewCount === "number" ? raw.reviewCount : undefined;
  return {
    leaflyRating:
      typeof stars === "number" && Number.isFinite(stars)
        ? Math.round(stars * 10) / 10
        : undefined,
    leaflyReviewCount:
      typeof count === "number" && Number.isFinite(count)
        ? Math.round(count)
        : undefined,
  };
}

/** Profile from the popular-strains directory list (lighter data). */
function popularToProfile(raw: RawRecord): StrainProfile {
  return {
    name: typeof raw.name === "string" ? raw.name : "",
    inKnowledgeBase: true,
    type: typeFrom(raw.category ?? raw.phenotype),
    thcRange: thcRangeFrom(raw),
    terpenes: terpenesFrom(raw.terps, 3),
    effects: effectsFrom(raw.effects, 5),
    description:
      typeof raw.shortDescriptionPlain === "string"
        ? raw.shortDescriptionPlain
        : undefined,
    imageUrl: imageFrom(raw),
    ...ratingFrom(raw),
  };
}

/** Full profile from a strain detail page. Written reviews are attached by the caller. */
function detailToProfile(raw: RawRecord): StrainProfile {
  const lineage = Array.isArray(raw.parents)
    ? raw.parents
        .map((p: RawRecord) => (p && typeof p.name === "string" ? p.name : ""))
        .filter(Boolean)
        .join(" × ")
    : undefined;
  return {
    name: typeof raw.name === "string" ? raw.name : "",
    inKnowledgeBase: true,
    type: typeFrom(raw.category ?? raw.phenotype),
    thcRange: thcRangeFrom(raw),
    cbdRange: cbdRangeFrom(raw),
    lineage: lineage || undefined,
    terpenes: terpenesFrom(raw.terps, 4),
    medicalUses: usesFrom(raw.conditions, raw.symptoms),
    effects: effectsFrom(raw.effects, 5),
    sideEffects: topScored(raw.negatives, 6)
      .filter((n) => n.score > 0)
      .map((n) => n.name),
    description:
      typeof raw.descriptionPlain === "string"
        ? raw.descriptionPlain
        : typeof raw.description === "string"
          ? raw.description
          : undefined,
    imageUrl: imageFrom(raw),
    ...ratingFrom(raw),
  };
}

export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const POPULAR_SLUG = "__popular__";

export async function fetchPopular(): Promise<StrainProfile[]> {
  const html = await fetchLeaflyHtml("/strains");
  const data = extractNextData(html);
  const list = (data as RawRecord)?.props?.pageProps?.data?.strains;
  if (!Array.isArray(list)) return [];
  return list
    .map(popularToProfile)
    .filter((p) => p.name !== "")
    .slice(0, 12);
}

export async function fetchProfile(
  name: string,
  opts: { extraReviews?: boolean; conditions?: readonly string[] } = {},
): Promise<StrainProfile | null> {
  const slug = slugify(name);
  if (!slug) return null;
  const conditions = opts.conditions ?? [];
  // Distributed cache hit — reuse the parsed profile, only freshly fetch
  // the extra ailment reviews that were not part of the original scrape.
  const cached = await getCachedStrainProfile(slug);
  if (cached) {
    const extraReviews = opts.extraReviews
      ? await fetchLeaflyReviews(name, conditions)
      : ([] as CommunityNote[]);
    return {
      ...cached.profile,
      communityNotes: mergeReviewNotes(
        cached.profile.communityNotes ?? [],
        extraReviews,
      ),
    };
  }
  try {
    const extraPromise = opts.extraReviews
      ? fetchLeaflyReviews(name, conditions)
      : Promise.resolve([] as CommunityNote[]);
    const [html, extra] = await Promise.all([
      fetchLeaflyHtml(`/strains/${slug}`),
      extraPromise,
    ]);
    const data = extractNextData(html);
    const raw = (data as RawRecord)?.props?.pageProps?.strain as
      | RawRecord
      | undefined;
    if (!raw || typeof raw.name !== "string" || raw.name === "") return null;
    const pageReviews = reviewNotesFrom(
      (data as RawRecord)?.props?.pageProps?.reviews,
      conditions,
    );
    const profile = {
      ...detailToProfile(raw),
      communityNotes: mergeReviewNotes(pageReviews, extra),
    };
    void putCachedStrainProfile(slug, profile);
    return profile;
  } catch {
    // 404 or a parse failure → not a strain page on Leafly.
    return null;
  }
}

/** Extra Leafly written reviews (used when we have a condition to match). */
export async function fetchLeaflyReviews(
  name: string,
  conditions: readonly string[] = [],
): Promise<CommunityNote[]> {
  const slug = slugify(name);
  if (!slug) return [];
  try {
    const html = await fetchLeaflyHtml(`/strains/${slug}/reviews`);
    const data = extractNextData(html);
    const reviews = (data as RawRecord)?.props?.pageProps?.reviews;
    return reviewNotesFrom(reviews, conditions);
  } catch {
    return [];
  }
}

export async function fetchProfiles(names: string[]): Promise<StrainProfile[]> {
  const unique = [
    ...new Set(names.map((n) => n.trim()).filter((n) => n !== "")),
  ];
  const results = await Promise.all(unique.map((name) => fetchProfile(name)));
  return unique.map(
    (name, i): StrainProfile =>
      results[i] ?? { name, inKnowledgeBase: false },
  );
}
