"use node";

import { action } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import type { StrainProfile, StrainType } from "../lib/strain-profile";

// Leafly has no public API for strain data, so we read the data their public
// site embeds in its pages (Next.js __NEXT_DATA__ JSON). This is a read-only
// scrape of public pages — no keys needed, but the HTML structure can change,
// so the parsers below are defensive and return empty/partial data rather
// than throwing when a field is missing.
const BASE = "https://www.leafly.com";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const CACHE_TTL_MS = 15 * 60 * 1000;

// Per-instance in-memory cache so repeat lookups (popular list, same strain)
// don't re-hit Leafly. Resets when the function instance is recycled, which
// is fine — it only skips redundant fetches.
const htmlCache = new Map<string, { at: number; html: string }>();

async function fetchLeaflyHtml(path: string): Promise<string> {
  const hit = htmlCache.get(path);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.html;

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { "User-Agent": UA, Accept: "text/html" },
    });
  } catch {
    throw new ConvexError(
      "Could not reach Leafly right now. Please try again in a moment.",
    );
  }
  if (!res.ok) {
    throw new ConvexError(`Leafly returned status ${res.status}.`);
  }
  const html = await res.text();
  htmlCache.set(path, { at: Date.now(), html });
  return html;
}

/** Extract the __NEXT_DATA__ JSON blob embedded in Leafly pages. */
function extractNextData(html: string): Record<string, unknown> | null {
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

type RawRecord = Record<string, any>;

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

function communityNoteFrom(raw: RawRecord): { source: string; text: string }[] {
  const rating =
    typeof raw.averageRating === "number"
      ? raw.averageRating.toFixed(1)
      : typeof raw.rating === "number"
        ? raw.rating.toFixed(1)
        : null;
  const reviews =
    typeof raw.reviewCount === "number" ? raw.reviewCount : null;
  if (rating === null && reviews === null) return [];
  const text = [
    rating !== null ? `${rating}★` : null,
    reviews !== null ? `${reviews.toLocaleString("en-US")} reviews` : null,
  ]
    .filter(Boolean)
    .join(" from ");
  return [{ source: "Leafly community", text }];
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
    communityNotes: communityNoteFrom(raw),
  };
}

/** Full profile from a strain detail page. */
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
    communityNotes: communityNoteFrom(raw),
  };
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function fetchProfile(name: string): Promise<StrainProfile | null> {
  const slug = slugify(name);
  if (!slug) return null;
  try {
    const html = await fetchLeaflyHtml(`/strains/${slug}`);
    const data = extractNextData(html);
    const raw = (data as RawRecord)?.props?.pageProps?.strain as
      | RawRecord
      | undefined;
    if (!raw || typeof raw.name !== "string" || raw.name === "") return null;
    return detailToProfile(raw);
  } catch {
    // 404 or a parse failure → not a strain page on Leafly.
    return null;
  }
}

/**
 * Popular strains on Leafly right now (their homepage directory list).
 * Pure data fetch — no AI call.
 */
export const popularStrains = action({
  args: {},
  handler: async (): Promise<StrainProfile[]> => {
    const html = await fetchLeaflyHtml("/strains");
    const data = extractNextData(html);
    const list = (data as RawRecord)?.props?.pageProps?.data?.strains;
    if (!Array.isArray(list)) return [];
    return list
      .map(popularToProfile)
      .filter((p) => p.name !== "")
      .slice(0, 12);
  },
});

/**
 * Look up a single strain by name on Leafly. Returns null when the name
 * doesn't resolve to a Leafly strain page. Pure data fetch — no AI call.
 */
export const searchStrain = action({
  args: { name: v.string() },
  handler: async (_ctx, { name }): Promise<StrainProfile | null> => {
    return await fetchProfile(name);
  },
});

/**
 * Fetch full Leafly profiles for a batch of strain names (parallel). Names
 * that don't resolve come back as { name, inKnowledgeBase: false } so the
 * caller can have the AI research them in the same synthesis call.
 */
export const getStrainProfiles = action({
  args: { names: v.array(v.string()) },
  handler: async (_ctx, { names }): Promise<StrainProfile[]> => {
    const unique = [
      ...new Set(names.map((n) => n.trim()).filter((n) => n !== "")),
    ];
    const results = await Promise.all(unique.map(fetchProfile));
    return unique.map(
      (name, i): StrainProfile =>
        results[i] ?? { name, inKnowledgeBase: false },
    );
  },
});
