// Daily pre-warm of the Reddit quotes cache + candidate pool.
//
// PullPush has documented multi-week outages. Even with the Firestore
// cache in place, fresh quotes are better than week-old ones. We
// re-fetch the top popular strains once per day so the cache stays
// warm when the upstream is responsive, and degrades gracefully when
// it's not.
//
// We deliberately keep this scoped to the "general" (no-condition)
// variant of the cache key — patients searching with a specific
// condition focus will still hit the warm general cache as their
// fallback if their specific query returns nothing.
//
// The same per-strain upstream fetch also feeds the vetted Reddit pool
// (`redditThreads/{threadId}`): matching comments become unvetted
// candidate records that a pool operator approves via
// `vetRedditThread` / `listPendingRedditThreads`. Candidate writes are
// best-effort and idempotent — a malformed thread is skipped, never
// guessed at, and a refresh never fails because of the pool.
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { getFirestore } from "firebase-admin/firestore";
import { fetchPopular } from "./leafly";
import { fetchRedditCandidates, fetchRedditQuotes } from "./reddit";
import {
  REDDIT_THREADS_COLLECTION,
  buildCandidateWrite,
  validateCandidateThread,
  type VettedRedditThread,
} from "./reddit-pool";

const SCHEDULE = "every 24 hours";
const TIMEZONE = "UTC";
const MAX_STRAINS = 50;

export const redditCacheRefresh = onSchedule(
  {
    schedule: SCHEDULE,
    timeZone: TIMEZONE,
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async () => {
    const startedAt = Date.now();
    const popular = await fetchPopular();
    const names = popular
      .map((p) => (typeof p.name === "string" ? p.name.trim() : ""))
      .filter((n) => n !== "")
      .slice(0, MAX_STRAINS);

    if (names.length === 0) {
      logger.warn("redditCacheRefresh: no popular strains to refresh");
      return;
    }

    let warmed = 0;
    let empty = 0;
    let failed = 0;
    let candidates = 0;

    // Sequential — we don't want to nuke PullPush / Arctic Shift by
    // firing 50 parallel upstream calls on top of normal traffic.
    for (const name of names) {
      try {
        const notes = await fetchRedditQuotes(name, []);
        if (notes.length > 0) warmed += 1;
        else empty += 1;
      } catch (err) {
        failed += 1;
        logger.warn(`redditCacheRefresh: failed for ${name}`, err);
      }

      // Candidate pool: write unvetted threads for operator review.
      // Best-effort — upstream hiccups or malformed payloads only
      // skip that strain's candidates, never the whole refresh.
      try {
        const fetched = await fetchRedditCandidates(name);
        for (const raw of fetched) {
          try {
            const candidate = validateCandidateThread(raw, 0);
            const ref = getFirestore()
              .collection(REDDIT_THREADS_COLLECTION)
              .doc(candidate.threadId);
            const existing = await ref.get();
            await ref.set(
              buildCandidateWrite(
                candidate,
                existing.data() as Partial<VettedRedditThread> | undefined,
              ),
              { merge: true },
            );
            candidates += 1;
          } catch (err) {
            logger.warn(
              `redditCacheRefresh: skipped malformed candidate for ${name}`,
              err,
            );
          }
        }
      } catch (err) {
        logger.warn(`redditCacheRefresh: candidate fetch failed for ${name}`, err);
      }
    }

    logger.info(
      `redditCacheRefresh: warmed=${warmed} empty=${empty} failed=${failed} ` +
        `candidates=${candidates} strains=${names.length} ` +
        `durationMs=${Date.now() - startedAt}`,
    );
  },
);
