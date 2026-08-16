// Saved symptom chips on the user's account doc.
//
// The iOS app owns the editor today (`SavedAilmentsStore.swift`). The
// web app reads the same `users/{uid}.ailments` array so Home, the
// strain detail page, and any future surface can talk about the
// patient's saved conditions without forcing them to retype them.
//
// We never *write* from web — the Account settings dialog does not
// expose ailments yet. If we ever add a chip editor on web, write
// helpers live here too (mirror the iOS `normalize` cap so the two
// surfaces can't drift).

import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { db } from "./firebase";

/** Max ailments the iOS app will keep; mirrors its `normalize` cap. */
export const AILMENTS_MAX = 16;

/** Per-ailment length cap; mirrors iOS `prefix(47)`. */
export const AILMENT_NAME_MAX = 47;

function clipAilment(name: string): string {
  return name.trim().slice(0, AILMENT_NAME_MAX);
}

/**
 * Normalize a list of ailments the same way iOS does: trim, dedupe
 * case-insensitively, drop empties, cap at AILMENTS_MAX.
 */
export function normalizeAilments(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const name = clipAilment(raw);
    if (name === "") continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length >= AILMENTS_MAX) break;
  }
  return out;
}

/**
 * Subscribe to the signed-in user's saved ailments. Returns an
 * `Unsubscribe` so callers can tear down the listener on unmount, or
 * `undefined` if Firebase isn't configured.
 */
export function listenToSavedAilments(
  uid: string,
  cb: (list: string[]) => void,
): Unsubscribe | undefined {
  if (!db) return undefined;
  return onSnapshot(
    doc(db, "users", uid),
    (snap) => {
      const data = snap.data() as { ailments?: unknown } | undefined;
      const raw = Array.isArray(data?.ailments) ? (data!.ailments as unknown[]) : [];
      const list = raw.filter((x): x is string => typeof x === "string");
      cb(normalizeAilments(list));
    },
    () => {
      // Offline / rules not ready — keep the existing list visible.
    },
  );
}
