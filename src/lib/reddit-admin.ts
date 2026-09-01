// Operator-only client wrappers for the Firestore-backed Reddit pool.
// The backend remains the authority for authorization; this UID list only
// keeps future admin UI affordances hidden from ordinary signed-in users.

import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

export type RedditThreadCandidate = {
  threadId?: string;
  url: string;
  permalink?: string;
  subreddit: string;
  title: string;
  snippet?: string;
  selftext?: string;
  score?: number;
  applicableConditions: string[];
  applicableStrains: string[];
  vettedNotes?: string;
};

export type PendingRedditThread = RedditThreadCandidate & {
  threadId: string;
  vettedAt: null;
  vettedBy: null;
  addedAt: number;
};

export type VetRedditThreadResult = {
  ok: true;
  threadId: string;
  vettedAt: number;
};

/** Keep this in sync with REFERENCE_LIBRARY_OPERATOR_UIDS in functions/src/index.ts. */
export const REDDIT_POOL_OPERATOR_UIDS: ReadonlySet<string> = new Set();

export function canManageRedditPool(uid: string | null | undefined): boolean {
  return typeof uid === "string" && REDDIT_POOL_OPERATOR_UIDS.has(uid);
}

function call<TArgs, TResult>(name: string, args: TArgs): Promise<TResult> {
  if (!functions) {
    return Promise.reject(
      new Error(
        "Firebase isn't configured yet — add your VITE_FIREBASE_* keys in the Keys tab, then deploy the functions.",
      ),
    );
  }
  return httpsCallable<TArgs, TResult>(functions, name)(args).then(
    (result) => result.data,
  );
}

/** Vet or re-vet a candidate. The backend records the operator UID and timestamp. */
export function vetRedditThread(
  candidate: RedditThreadCandidate,
): Promise<VetRedditThreadResult> {
  return call<RedditThreadCandidate, VetRedditThreadResult>(
    "vetRedditThread",
    candidate,
  );
}

/** Load the operator review queue. */
export function listPendingRedditThreads(): Promise<PendingRedditThread[]> {
  return call<Record<string, never>, { threads: PendingRedditThread[] }>(
    "listPendingRedditThreads",
    {},
  ).then((result) => result.threads);
}

/** Remove approval and return a thread to the review queue. */
export function unvetRedditThread(
  threadId: string,
): Promise<{ ok: true; threadId: string; existed: boolean }> {
  return call<
    { threadId: string },
    { ok: true; threadId: string; existed: boolean }
  >("unvetRedditThread", { threadId });
}
