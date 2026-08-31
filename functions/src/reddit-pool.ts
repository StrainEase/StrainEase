// Vetted Reddit thread pool.
//
// This module replaces the static, hand-seeded `reddit-seed.ts` as the
// primary source of community evidence for the compare / recommend /
// describe callables. Threads live in the Firestore collection
// `redditThreads/{threadId}` and must be vetted by a reference-library
// operator before they become eligible to be served to clients.
//
// Design notes
// ------------
// - The static `reddit-seed.ts` is KEPT as a safety net fallback for
//   one release. `redditThreadsForStrain` in index.ts reads the vetted
//   pool first; if the pool yields zero matches for the requested
//   strain + condition combo, it falls back to `matchRedditSeeds`.
//   The seed file will be deleted in a follow-up PR once the live
//   pool has sufficient coverage.
//
// - Vetting workflow: candidate threads are written to the pool with
//   `vettedAt = null` by the daily refresh cron (`reddit-refresh.ts`,
//   whenever the upstreams are reachable) or by an operator via the
//   `vetRedditThread` callable. Only threads with a non-null `vettedAt`
//   and a non-empty `vettedBy` are served to clients. Unvetted records
//   are invisible to the public.
//
// - Pure data module: no AI in the loop. The vetting is deterministic
//   — a thread either has been approved by an operator or it hasn't.
//
// - Cross-platform: the shape is plain JSON (string / number / boolean
//   / null / array / object) so the iOS Codable decoder and the Android
//   Kotlin data classes can read the same payload.

import type { RedditSource } from "./types";

/* ── Domain types ────────────────────────────────────────────────── */

/**
 * A single vetted Reddit thread stored in `redditThreads/{threadId}`.
 * Extends the base `RedditSource` shape with vetting metadata and
 * applicability tags.
 */
export type VettedRedditThread = RedditSource & {
  /** Firestore document ID (extracted from the Reddit URL). */
  threadId: string;
  /** Conditions this thread is most relevant to (lower-case keywords). */
  applicableConditions: string[];
  /** Strain names explicitly mentioned in the OP / top comments. */
  applicableStrains: string[];
  /** Timestamp (ms since epoch) when the thread was vetted. null = unvetted. */
  vettedAt: number | null;
  /** Operator UID who vetted this thread. null = unvetted. */
  vettedBy: string | null;
  /** Optional operator notes about the vetting decision. */
  vettedNotes?: string;
  /** Timestamp when the candidate was first added to the pool. */
  addedAt: number;
};

/**
 * A candidate thread awaiting review. Same shape as VettedRedditThread
 * but with vetting fields explicitly null.
 */
export type PendingRedditThread = VettedRedditThread & {
  vettedAt: null;
  vettedBy: null;
};

/* ── Constants ───────────────────────────────────────────────────── */

export const REDDIT_THREADS_COLLECTION = "redditThreads";

/** Maximum number of vetted threads returned per lookup. */
export const MAX_VETTED_THREADS = 5;

/** Maximum age of a vetted thread before it is considered stale (30 days). */
export const VETTED_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/* ── Validation ──────────────────────────────────────────────────── */

const VALID_URL_PATTERN = /^https:\/\/old\.reddit\.com\/r\/[^/]+\/comments\/[a-z0-9]{4,}\//i;

/** Normalize supported Reddit hostnames to the canonical old.reddit.com form. */
export function normalizeRedditUrl(value: string): string {
  const url = value.trim();
  if (url.startsWith("/r/")) return `https://old.reddit.com${url}`;
  return url
    .replace(/^https?:\/\/(www\.|np\.)?reddit\.com/i, "https://old.reddit.com")
    .replace(/^https?:\/\/reddit\.com/i, "https://old.reddit.com");
}

/**
 * Validate and normalize a raw candidate thread object. Throws on
 * shape errors. Returns a clean PendingRedditThread with vetting
 * fields explicitly null.
 */
export function validateCandidateThread(raw: unknown, index: number): PendingRedditThread {
  const path = `redditThreads[${index}]`;
  if (typeof raw !== "object" || raw === null) {
    throw new Error(`${path}: must be an object`);
  }
  const obj = raw as Record<string, unknown>;

  // URL must be a valid old.reddit.com thread URL. PullPush and
  // Arctic-Shift candidates often use reddit.com or a relative
  // permalink, so normalize those before validation.
  const rawUrl =
    typeof obj.url === "string"
      ? obj.url
      : typeof obj.permalink === "string"
        ? obj.permalink
        : "";
  const normalizedUrl = normalizeRedditUrl(rawUrl);
  if (!VALID_URL_PATTERN.test(normalizedUrl)) {
    throw new Error(`${path}.url must be a valid old.reddit.com thread URL`);
  }

  // Extract threadId from the URL (the comment id segment).
  const match = normalizedUrl.match(/\/comments\/([a-z0-9]+)\//i);
  if (!match || !match[1]) {
    throw new Error(`${path}.url: could not extract threadId`);
  }
  const threadId = match[1];

  if (typeof obj.subreddit !== "string" || obj.subreddit.trim() === "") {
    throw new Error(`${path}.subreddit must be a non-empty string`);
  }
  if (typeof obj.title !== "string" || obj.title.trim() === "") {
    throw new Error(`${path}.title must be a non-empty string`);
  }
  if (obj.snippet !== undefined && typeof obj.snippet !== "string") {
    throw new Error(`${path}.snippet must be a string or undefined`);
  }
  if (obj.selftext !== undefined && typeof obj.selftext !== "string") {
    throw new Error(`${path}.selftext must be a string or undefined`);
  }
  if (obj.score !== undefined && typeof obj.score !== "number") {
    throw new Error(`${path}.score must be a number or undefined`);
  }
  if (!Array.isArray(obj.applicableConditions)) {
    throw new Error(`${path}.applicableConditions must be a string[]`);
  }
  if (!Array.isArray(obj.applicableStrains)) {
    throw new Error(`${path}.applicableStrains must be a string[]`);
  }

  return {
    threadId,
    url: normalizedUrl,
    subreddit: obj.subreddit.trim().slice(0, 100),
    title: obj.title.trim().slice(0, 300),
    snippet:
      typeof obj.snippet === "string"
        ? obj.snippet.trim().slice(0, 500)
        : typeof obj.selftext === "string"
          ? obj.selftext.trim().slice(0, 500)
          : undefined,
    score: typeof obj.score === "number" ? obj.score : 0,
    applicableConditions: (obj.applicableConditions as string[])
      .map((c) => c.trim().toLowerCase())
      .filter((c) => c.length > 0)
      .slice(0, 10),
    applicableStrains: (obj.applicableStrains as string[])
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 10),
    vettedAt: null,
    vettedBy: null,
    addedAt: Date.now(),
  };
}

/**
 * Validate an array of candidate threads. Throws on any shape error.
 * Enforces unique threadIds across the batch.
 */
export function validateCandidateBatch(raw: unknown): PendingRedditThread[] {
  if (!Array.isArray(raw)) {
    throw new Error("candidate batch: must be an array");
  }
  const threads = (raw as unknown[]).map((t, i) => validateCandidateThread(t, i));
  const ids = new Set<string>();
  for (const t of threads) {
    if (ids.has(t.threadId)) {
      throw new Error(`candidate batch: duplicate threadId "${t.threadId}"`);
    }
    ids.add(t.threadId);
  }
  return threads;
}

/* ── Pure helpers for vetted pool lookup ────────────────────────── */

/**
 * Filter a list of vetted threads to those applicable to the given
 * strain and conditions. Returns threads where:
 *   - `vettedAt` is not null (vetted)
 *   - `applicableStrains` contains the strain name (fuzzy match), OR
 *     `applicableConditions` matches any of the given conditions.
 * If `strains` is provided and non-empty, threads MUST match at least
 * one strain to be eligible (condition-only threads are excluded when
 * a specific strain is being looked up).
 *
 * Pure function (no Firestore SDK) so it is trivial to unit-test.
 */
export function filterVettedThreads(
  threads: VettedRedditThread[],
  strainName: string,
  conditions: string[],
  limit: number = MAX_VETTED_THREADS,
): VettedRedditThread[] {
  const target = strainName.trim().toLowerCase();
  const conds = conditions.map((c) => c.trim().toLowerCase()).filter(Boolean);

  const scored: { score: number; thread: VettedRedditThread }[] = [];

  for (const t of threads) {
    // Must be vetted.
    if (t.vettedAt === null || t.vettedBy === null) continue;

    // Must not be stale.
    if (Date.now() - t.vettedAt > VETTED_TTL_MS) continue;

    // If a specific strain is requested, thread must mention it.
    if (target !== "") {
      const strainMatch = t.applicableStrains.some(
        (s) => s.toLowerCase() === target || target.includes(s.toLowerCase()) || s.toLowerCase().includes(target),
      );
      if (!strainMatch) continue;
    }

    // Score by condition overlap. A strain match is sufficient when
    // no condition focus was supplied; condition-only matches never
    // qualify for a strain-specific lookup.
    let score = 0;
    for (const cond of conds) {
      if (t.applicableConditions.some((c) => c === cond)) score += 3;
      else if (t.applicableConditions.some((c) => c.includes(cond) || cond.includes(c))) score += 1;
    }
    if (target !== "" && score === 0 && t.applicableStrains.length === 0) {
      continue;
    }

    scored.push({ score, thread: t });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.thread);
}

/**
 * Convert a VettedRedditThread to a plain RedditSource for the AI
 * prompt. Strips vetting metadata.
 */
export function toRedditSource(t: VettedRedditThread): RedditSource {
  return {
    url: t.url,
    subreddit: t.subreddit,
    title: t.title,
    snippet: t.snippet,
    score: t.score,
  };
}

/**
 * Prefer vetted sources and use the static pool only when no vetted
 * source matches. Kept pure so fallback ordering is covered without
 * importing the Firebase Admin SDK in tests.
 */
export function vettedSourcesOrFallback(
  threads: VettedRedditThread[],
  strainName: string,
  conditions: string[],
  fallback: RedditSource[],
): RedditSource[] {
  const vetted = filterVettedThreads(threads, strainName, conditions)
    .map(toRedditSource);
  return vetted.length > 0 ? vetted : fallback;
}

/**
 * Extract threadId from a Reddit URL. Returns null if the URL does
 * not match the expected old.reddit.com pattern.
 */
export function extractThreadId(url: string): string | null {
  const match = url.match(/\/comments\/([a-z0-9]+)\//i);
  return match ? match[1] : null;
}

/* ── Operator gate + vetting write (pure, tested) ───────────────── */

/**
 * Error thrown by [requirePoolOperator] with a code the callable layer
 * maps onto an `HttpsError`. Kept as a plain Error subclass so this
 * module stays free of the Firebase Functions SDK (unit-testable).
 */
export class PoolOperatorError extends Error {
  constructor(
    public readonly code: "unauthenticated" | "permission-denied",
    message: string,
  ) {
    super(message);
    this.name = "PoolOperatorError";
  }
}

/**
 * Resolve the caller UID against the operator list. Throws
 * [PoolOperatorError] when the caller is anonymous or not an operator
 * — the callable layer converts that into an `HttpsError`. Pure so the
 * auth gate is unit-testable without the Firebase SDK.
 */
export function requirePoolOperator(
  uid: string | null | undefined,
  operatorUids: ReadonlySet<string>,
  action: string,
): string {
  if (!uid) {
    throw new PoolOperatorError("unauthenticated", "Sign in first.");
  }
  if (!operatorUids.has(uid)) {
    throw new PoolOperatorError(
      "permission-denied",
      `Only Reddit pool operators can ${action}.`,
    );
  }
  return uid;
}

/**
 * Compute the Firestore document fields for a vetting decision.
 * Idempotent on re-vet: the original `addedAt` is preserved so the
 * candidate keeps its queue position and audit trail across re-vets.
 * Pure so re-vet idempotency is unit-testable.
 */
export function buildVettedWrite(
  candidate: PendingRedditThread,
  existing: Partial<VettedRedditThread> | undefined,
  vettedAt: number,
  vettedBy: string,
  vettedNotes?: string,
): Record<string, unknown> {
  return {
    ...candidate,
    addedAt:
      typeof existing?.addedAt === "number"
        ? existing.addedAt
        : candidate.addedAt,
    vettedAt,
    vettedBy,
    ...(vettedNotes ? { vettedNotes } : { vettedNotes: null }),
  };
}

/**
 * Compute the Firestore document fields for an unvetted candidate
 * written by the daily refresh cron. Idempotent on re-write: the
 * original `addedAt` is preserved so a candidate keeps its queue
 * position across daily re-writes, and vetting fields stay null until
 * an operator approves it. Pure so cron idempotency is unit-testable.
 */
export function buildCandidateWrite(
  candidate: PendingRedditThread,
  existing: Partial<VettedRedditThread> | undefined,
): Record<string, unknown> {
  return {
    ...candidate,
    addedAt:
      typeof existing?.addedAt === "number"
        ? existing.addedAt
        : candidate.addedAt,
    vettedAt: null,
    vettedBy: null,
  };
}

/* ── Exports for tests ──────────────────────────────────────────── */

export const __test__ = {
  VALID_URL_PATTERN,
  extractThreadId,
  normalizeRedditUrl,
  vettedSourcesOrFallback,
};
