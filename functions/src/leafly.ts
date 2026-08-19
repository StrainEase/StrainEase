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
