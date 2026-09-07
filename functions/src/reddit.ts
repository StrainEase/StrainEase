// Best-effort Reddit patient quotes for a strain + ailment.
//
// Source strategy (cheapest first; we never invent quotes):
//   1. PullPush keyword search (cross-subreddit, free). Fast and wide
//      coverage when it's up.
//   2. Arctic Shift per-subreddit scan (free). Used when PullPush is
//      down, returns nothing, or rate-limits us. We pull the latest
//      ~60 comments from each known cannabis subreddit, no full-text
//      filter on the wire, then filter locally.
//   3. Firestore-backed cache (see ./reddit-cache). Survives multi-week
//      upstream outages — the UI shows quotes up to 7 days old instead
//      of going silent.
//
// Failures return []. The UI is told "Not enough comments" rather than
// being shown fabricated text.
import type { CommunityNote } from "./types";
import {
  readPersistedRedditQuotes,
  writeRedditQuotes,
  type RedditQuoteSource,
} from "./reddit-cache";
import { extractThreadId, normalizeRedditUrl } from "./reddit-pool";

const PULLPUSH = "https://api.pullpush.io/reddit/search/comment/";
const ARCTIC_SHIFT = "https://arctic-shift.photon-reddit.com/api/comments/search";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const CACHE_TTL_MS = 15 * 60 * 1000;
const EMPTY_CACHE_TTL_MS = 60 * 1000;
const PULLPUSH_TIMEOUT_MS = 8000;
const ARCTIC_SHIFT_TIMEOUT_MS = 5000;
/** Per-subreddit page size for the Arctic Shift fallback. */
const ARCTIC_SHIFT_LIMIT = 60;
/** Cap concurrent Arctic Shift requests so we stay well below their
 *  documented "couple requests per second" polite usage budget. */
const ARCTIC_SHIFT_CONCURRENCY = 3;

const CANNABIS_SUBS = new Set([
  "trees",
  "weed",
  "medicalmarijuana",
  "MMJ",
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
  "sleep",
  "ukmedicalcannabis",
  "depression",
  "ptsd",
]);

/** Subs actually used for the Arctic Shift fallback. We pick the
 *  highest-signal ones first so we usually bail out after 2-3 calls. */
const FALLBACK_SUBS = [
  "trees",
  "weed",
  "medicalmarijuana",
  "MMJ",
  "chronicpain",
  "eldertrees",
  "sleep",
  "cannabis",
  "anxiety",
];

const AILMENT_ALIASES: Record<string, string[]> = {
  insomnia: ["insomnia", "can't sleep", "cant sleep", "sleeping", "asleep", "sleepless"],
  anxiety: ["anxiety", "anxious", "panic"],
  ocd: ["ocd", "anxiety", "anxious", "obsessive"],
  adhd: ["adhd", "add", "add/adhd"],
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

const memoryCache = new Map<
  string,
  { at: number; notes: CommunityNote[]; source: "live" | "cache" }
>();

type RawComment = {
  body?: string;
  subreddit?: string;
  score?: number;
  author?: string;
  permalink?: string;
  /** Thread title. PullPush comment payloads include it; Arctic Shift
   *  may omit it — those candidates are skipped for the pool. */
  link_title?: string;
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

/** AbortController wrapper shared by all upstream HTTP calls. */
async function fetchJson(
  url: string,
  timeoutMs: number,
): Promise<{ ok: boolean; data: unknown }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!res.ok) return { ok: false, data: null };
    const data = (await res.json()) as { data?: RawComment[] };
    return { ok: true, data };
  } catch {
    return { ok: false, data: null };
  } finally {
    clearTimeout(timer);
  }
}

async function searchPullPush(query: string): Promise<RawComment[]> {
  const url = `${PULLPUSH}?html_decode=true&size=25&q=${encodeURIComponent(query)}`;
  const { ok, data } = await fetchJson(url, PULLPUSH_TIMEOUT_MS);
  if (!ok) return [];
  const list = (data as { data?: RawComment[] } | null)?.data;
  return Array.isArray(list) ? list : [];
}

function arcticShiftRecentSubredditUrl(
  sub: string,
  limit = ARCTIC_SHIFT_LIMIT,
): string {
  // `after=6m` keeps pages bounded to the last six months. Without it
  // the endpoint will happily 502 on a popular sub. Note: Arctic Shift
  // accepts `6m` (singular unit) but rejects `6months` — keep this as
  // a regression-tested URL so we don't reintroduce the bug.
  return `${ARCTIC_SHIFT}?subreddit=${encodeURIComponent(
    sub,
  )}&after=6m&limit=${limit}&sort=desc`;
}

/**
 * Pull the latest comments from one subreddit via Arctic Shift. We do
 * NOT pass a `body` keyword filter on the wire — its Postgres FTS path
 * times out on the highest-traffic cannabis subs. Instead we filter
 * the dumped comments locally for the strain + ailment keywords.
 */
async function searchArcticShiftSubreddit(
  sub: string,
): Promise<RawComment[]> {
  const url = arcticShiftRecentSubredditUrl(sub);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ARCTIC_SHIFT_TIMEOUT_MS);
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

/** Run an async mapper with bounded concurrency. */
async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const idx = cursor++;
      const result = await mapper(items[idx]);
      out[idx] = result;
    }
  }
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return out;
}

/**
 * Scan our curated cannabis subreddits via Arctic Shift, in
 * FALLBACK_SUBS order, and return the union of comments that pass the
 * strain-name filter. Stops early once we have a healthy candidate
 * pool (>= 60) so we don't pound the upstream for nothing.
 */
async function searchArcticShift(strainName: string): Promise<RawComment[]> {
  const name = strainName.trim().toLowerCase();
  if (!name) return [];
  const collected: RawComment[] = [];
  // We use a small concurrency budget + stop-early to keep us well
  // under Arctic Shift's "couple req/s" polite-usage guidance.
  await mapWithConcurrency(FALLBACK_SUBS, ARCTIC_SHIFT_CONCURRENCY, async (sub) => {
    if (collected.length >= 60) return;
    const list = await searchArcticShiftSubreddit(sub);
    for (const c of list) {
      const body = typeof c.body === "string" ? c.body : "";
      if (!body) continue;
    const lower = body.toLowerCase();
    const words = name.split(/\s+/).filter((word) => word.length > 1);
    if (lower.includes(name) || words.every((word) => lower.includes(word))) collected.push(c);
    }
  });
  return collected;
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
    if (body.length < 32) continue;
    const lower = body.toLowerCase();
    if (lower === "[deleted]" || lower === "[removed]") continue;
    const name = strainName.trim().toLowerCase();
    if (!lower.includes(name) && !mentionsAll(body, strainWords)) continue;
    if (ailmentTerms.length > 0 && !mentionsAny(body, ailmentTerms)) continue;

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
      ? matched
        ? `Reddit · r/${c.subreddit} · ${matched}`
        : `Reddit · r/${c.subreddit}`
      : matched
        ? `Reddit · ${matched}`
        : "Reddit";
    scored.push({ score, note: { source, text: quote } });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((s) => s.note);
}

/**
 * Fetch live Reddit comments for a strain. PullPush first (full-text
 * search across all subs), falling back to an Arctic Shift per-subreddit
 * scan. Shared by the quotes path and the vetted-pool candidate path so
 * both derive from the same upstream shape and semantics.
 */
async function fetchLiveComments(
  name: string,
  focus: string[],
): Promise<{
  comments: RawComment[];
  source: Exclude<RedditQuoteSource, "cache">;
}> {
  const query =
    focus.length > 0 ? `"${name}" ${focus.slice(0, 2).join(" ")}` : `"${name}"`;
  let comments = await searchPullPush(query);
  if (comments.length === 0) {
    comments = await searchPullPush(`"${name}"`);
  }
  if (comments.length === 0) {
    const arctic = await searchArcticShift(name);
    if (arctic.length > 0) {
      return { comments: arctic, source: "arctic-shift" };
    }
  }
  return { comments, source: "pullpush" };
}

/**
 * A candidate Reddit thread shaped the way `validateCandidateThread`
 * expects, ready to be written into the vetted pool for operator review.
 */
export type RedditCandidateInput = {
  url: string;
  subreddit: string;
  title: string;
  snippet?: string;
  score?: number;
  applicableConditions: string[];
  applicableStrains: string[];
};

/** Max candidates collected per strain by the daily refresh cron. */
export const MAX_CANDIDATES_PER_STRAIN = 5;

/**
 * Map a raw PullPush / Arctic Shift comment to a candidate thread.
 * Returns null when the payload can't become a valid pool record
 * (missing permalink, thread title, or subreddit; deleted/removed
 * bodies) — those are skipped rather than guessed at.
 */
export function commentToCandidate(
  comment: RawComment,
  strainName: string,
): RedditCandidateInput | null {
  const permalink =
    typeof comment.permalink === "string" ? comment.permalink.trim() : "";
  const title =
    typeof comment.link_title === "string" ? comment.link_title.trim() : "";
  const subreddit =
    typeof comment.subreddit === "string" ? comment.subreddit.trim() : "";
  const body = typeof comment.body === "string" ? comment.body.trim() : "";
  if (!permalink || !title || !subreddit) return null;
  if (body === "" || body === "[deleted]" || body === "[removed]") return null;
  const strain = strainName.trim();
  return {
    url: permalink,
    subreddit: subreddit.slice(0, 100),
    title: title.slice(0, 300),
    snippet: clipQuote(body, 500),
    score: typeof comment.score === "number" ? comment.score : undefined,
    applicableConditions: [],
    applicableStrains: strain ? [strain] : [],
  };
}

/**
 * Dedupe candidate threads by their normalized thread id (many comments
 * come from the same thread) and cap the per-strain batch. Pure so the
 * cron behavior is unit-testable without the network.
 */
export function uniqueCandidatesByThread(
  candidates: RedditCandidateInput[],
  limit: number = MAX_CANDIDATES_PER_STRAIN,
): RedditCandidateInput[] {
  const byThread = new Map<string, RedditCandidateInput>();
  for (const candidate of candidates) {
    const threadId = extractThreadId(normalizeRedditUrl(candidate.url));
    if (!threadId || byThread.has(threadId)) continue;
    byThread.set(threadId, candidate);
  }
  return [...byThread.values()].slice(0, limit);
}

/**
 * Fetch candidate threads for one strain from the live upstreams,
 * deduped by thread and capped. Used by the daily refresh cron to
 * grow the vetted pool; unvetted records await operator review.
 */
export async function fetchRedditCandidates(
  strainName: string,
  limit: number = MAX_CANDIDATES_PER_STRAIN,
): Promise<RedditCandidateInput[]> {
  const name = strainName.trim();
  if (!name) return [];
  const { comments } = await fetchLiveComments(name, []);
  const candidates: RedditCandidateInput[] = [];
  for (const comment of comments) {
    const candidate = commentToCandidate(comment, name);
    if (candidate) candidates.push(candidate);
  }
  return uniqueCandidatesByThread(candidates, limit);
}

/**
 * Fetch community quotes for one strain. Tries the in-memory cache
 * first, then the Firestore cache, then PullPush live, then Arctic
 * Shift as a fallback. Always falls back to the Firestore cache (even
 * when stale) when both upstreams fail, so the UI never goes silent
 * during a multi-week PullPush outage.
 */
export async function fetchRedditQuotes(
  strainName: string,
  conditions: string[] = [],
): Promise<CommunityNote[]> {
  const name = strainName.trim();
  const focus = conditions.map((c) => c.trim()).filter((c) => c !== "");
  if (!name) return [];

  const cacheKey = `${name.toLowerCase()}|${focus.length > 0 ? focus.map((c) => c.toLowerCase()).join(",") : "general"}`;

  // 1. Memory cache.
  const memHit = memoryCache.get(cacheKey);
  if (memHit) {
    const ttl =
      memHit.notes.length > 0
        ? memHit.source === "cache"
          ? // Surviving on cached data: serve but don't hammer the cache window.
            60 * 1000
          : CACHE_TTL_MS
        : EMPTY_CACHE_TTL_MS;
    if (Date.now() - memHit.at < ttl) return memHit.notes;
  }

  // 2. Firestore cache (when memory is cold, e.g. across cold starts).
  let notes = await readFromPersistentCache(name, focus);
  if (notes && notes.length > 0) {
    memoryCache.set(cacheKey, { at: Date.now(), notes, source: "cache" });
    return notes;
  }

  // 3. Live: PullPush first (it has full-text search across all subs),
  //    then Arctic Shift as a fallback.
  const { comments, source: liveSource } = await fetchLiveComments(name, focus);

  notes = pickQuotes(comments, name, focus);
  memoryCache.set(cacheKey, { at: Date.now(), notes, source: "live" });

  // Persist to Firestore. Fire-and-forget — never block the response
  // on this, and never write empty results.
  if (notes.length > 0) {
    void writeRedditQuotes(name, focus, notes, liveSource);
  }

  return notes;
}

async function readFromPersistentCache(
  name: string,
  focus: string[],
): Promise<CommunityNote[] | null> {
  try {
    const hit = await readPersistedRedditQuotes(name, focus);
    return hit?.notes ?? null;
  } catch {
    return null;
  }
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

/** Exposed for tests + the daily refresh cron. */
export function __resetRedditMemoryCacheForTest(): void {
  memoryCache.clear();
}

/** Test-only namespace. The shape is intentional — internal surface,
 *  not public API. */
export const __test__ = {
  arcticShiftRecentSubredditUrl,
  pickQuotes,
  expandAilment,
};
