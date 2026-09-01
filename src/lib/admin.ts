// Operator-only admin surface. Mirrors the `REFERENCE_LIBRARY_OPERATOR_UIDS`
// set in `functions/src/index.ts`. The server is still the authority for
// authorization — this list is purely a UX gate so the admin route / nav
// affordances stay hidden from ordinary signed-in users.
//
// Populate this set when the first operator account is provisioned. The
// PR-216 admin UI calls the same operator-gated callables as the manual
// scripts under `scripts/`, so the audit trail is identical either way.

import {
  fetchReferenceLibrary,
  seedReferenceLibrary,
  seedInteractionLibrary,
} from "./reference-library";
import {
  vetRedditThread,
  listPendingRedditThreads,
  unvetRedditThread,
  type RedditThreadCandidate,
  type PendingRedditThread,
} from "./reddit-admin";

/**
 * Operator UIDs allowed to run admin migrations (reference library +
 * drug interactions) and to vet / unvet Reddit threads. Add new
 * operator UIDs here AND in `REFERENCE_LIBRARY_OPERATOR_UIDS` in
 * `functions/src/index.ts`. Both lists must be kept in sync.
 */
export const ADMIN_OPERATOR_UIDS: ReadonlySet<string> = new Set();

/** Return true when the supplied UID is a known admin operator. */
export function isAdminOperator(uid: string | null | undefined): boolean {
  return typeof uid === "string" && ADMIN_OPERATOR_UIDS.has(uid);
}

export type AdminSection = "library" | "interactions" | "reddit";

/**
 * Convenience re-exports so the admin page only needs to import from
 * one place. The server enforces auth + operator gating on every call;
 * these thin wrappers just match the admin UI's data shape.
 */
export const adminApi = {
  library: {
    fetch: fetchReferenceLibrary,
    seed: seedReferenceLibrary,
  },
  interactions: {
    seed: seedInteractionLibrary,
  },
  reddit: {
    listPending: listPendingRedditThreads,
    vet: vetRedditThread,
    unvet: unvetRedditThread,
  },
};

export type {
  RedditThreadCandidate,
  PendingRedditThread,
};
