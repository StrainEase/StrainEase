// Best-effort Reddit patient quotes for a strain + ailment.
// Reddit.com blocks datacenter scrapes (403). We use PullPush's public
// comment search and only keep comments that mention BOTH the strain and
// the ailment. Failures return [] — we never invent quotes.
import type { CommunityNote } from "./types";

const PULLPUSH = "https://api.pullpush.io/reddit/search/comment/";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const CACHE_TTL_MS = 15 * 60 * 1000;
const TIMEOUT_MS = 7000;

const CANNABIS_SUBS = new Set([
  "trees",
  "weed",
  "medicalmarijuana",
  "mmj",
  "eldertrees",
  "cannabis",
  "marijuana",
  "vaporents",
  "oilpen",
  "chronicpain",
  "anxiety",
  "insomnia",
  "petioles",
  "see",
  "delta8",
  "cultofthefranklin",
  "autoflowers",
]);

const AILMENT_ALIASES: Record<string, string[]> = {
  insomnia: ["insomnia", "can't sleep", "cant sleep", "sleeping", "asleep", "sleepless"],
  anxiety: ["anxiety", "anxious", "panic"],
  "chronic pain": ["chronic pain", "pain", "ache", "aching"],
  depression: ["depression", "depressed", "mood"],
  "nausea & appetite": ["nausea", "appetite", "nauseous", "hungry", "eating"],
  inflammation: ["inflammation", "inflamed", "swelling"],
  migraine: ["migraine", "headache"],
  "muscle spasm": ["spasm", "spasms", "cramp", "cramps"],
  ptsd: ["ptsd", "flashback", "trauma"],
  fatigue: ["fatigue", "tired", "exhausted", "energy"],
  arthritis: ["arthritis", "joint"],
  stress: ["stress", "stressed"],
};

const cache = new Map<string, { at: number; notes: CommunityNote[] }>();

type RawComment = {
  body?: string;
  subreddit?: string;
  score?: number;
  author?: string;
  permalink?: string;
};

function expandAilment(condition: string): string[] {
  const key = condition.trim().toLowerCase();
  const extra = AILMENT_ALIASES[key];
  return extra ? [key, ...extra] : [key];
}

function mentionsAll(text: string, terms: string[]): boolean {
  const t = text.toLowerCase();
  return terms.every((term) => t.includes(term.toLowerCase()));
}

function mentionsAny(text: string, terms: string[]): boolean {
  const t = text.toLowerCase();
  return terms.some((term) => t.includes(term.toLowerCase()));
}

function clipQuote(text: string, max = 280): string {
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

async function searchComments(query: string): Promise<RawComment[]> {
  const url = `${PULLPUSH}?html_decode=true&size=25&q=${encodeURIComponent(query)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: RawComment[] };
    return Array.isArray(json.data) ? json.data : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function pickQuotes(
  comments: RawComment[],
  strainName: string,
  conditions: string[],
): CommunityNote[] {
  const strainWords = strainName
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 1);
  const ailmentTerms = conditions.flatMap(expandAilment);
  const seen = new Set<string>();
  const scored: { score: number; note: CommunityNote }[] = [];

  for (const c of comments) {
    const body = typeof c.body === "string" ? c.body : "";
    if (body.length < 40) continue;
    const lower = body.toLowerCase();
    if (lower === "[deleted]" || lower === "[removed]") continue;
    if (!mentionsAll(body, strainWords)) continue;
    if (!mentionsAny(body, ailmentTerms)) continue;

    const sub =
      typeof c.subreddit === "string" ? c.subreddit.toLowerCase() : "";
    const bonus = CANNABIS_SUBS.has(sub) ? 8 : 0;
    const score = (typeof c.score === "number" ? c.score : 0) + bonus;
    const quote = clipQuote(body);
    const key = quote.toLowerCase().slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);

    const matched =
      conditions.find((cond) => mentionsAny(body, expandAilment(cond))) ??
      conditions[0];
    const source = sub
      ? `Reddit · r/${c.subreddit} · ${matched}`
      : `Reddit · ${matched}`;
    scored.push({ score, note: { source, text: quote } });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.note);
}

export async function fetchRedditQuotes(
  strainName: string,
  conditions: string[],
): Promise<CommunityNote[]> {
  const name = strainName.trim();
  const focus = conditions.map((c) => c.trim()).filter((c) => c !== "");
  if (!name || focus.length === 0) return [];

  const cacheKey = `${name.toLowerCase()}|${focus.map((c) => c.toLowerCase()).join(",")}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.notes;

  // One query per strain: quoted name plus the first two ailments. Extra
  // requests burn PullPush's rate limit and often return unrelated hits.
  const query = `"${name}" ${focus.slice(0, 2).join(" ")}`;
  const comments = await searchComments(query);
  const notes = pickQuotes(comments, name, focus);

  cache.set(cacheKey, { at: Date.now(), notes });
  return notes;
}

export async function fetchRedditQuotesFor(
  names: string[],
  conditions: string[],
): Promise<Map<string, CommunityNote[]>> {
  const unique = [...new Set(names.map((n) => n.trim()).filter((n) => n !== ""))];
  const results = await Promise.all(
    unique.map((name) => fetchRedditQuotes(name, conditions)),
  );
  const map = new Map<string, CommunityNote[]>();
  unique.forEach((name, i) => map.set(name.toLowerCase(), results[i]));
  return map;
}
