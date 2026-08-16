import {
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

/** Matches iOS `SavedAilmentsStore` — `users/{uid}.ailments`. */
export const AILMENT_NAME_MAX = 47;
export const AILMENTS_MAX = 16;

export function clipAilmentName(name: string): string {
  return name.trim().slice(0, AILMENT_NAME_MAX);
}

export function normalizeAilments(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    if (typeof raw !== "string") continue;
    const name = clipAilmentName(raw);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length >= AILMENTS_MAX) break;
  }
  return out;
}

export function ailmentsCloudData(list: string[], updatedAt = Date.now()) {
  return {
    ailments: normalizeAilments(list),
    ailmentsUpdatedAt: updatedAt,
  };
}

export async function saveAilments(uid: string, list: string[]): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, "users", uid), ailmentsCloudData(list), { merge: true });
}

export function listenToAilments(
  uid: string,
  cb: (list: string[]) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db!, "users", uid),
    (snap) => {
      cb(normalizeAilments(snap.data()?.ailments));
    },
    () => cb([]),
  );
}

export function ailmentsEqual(a: string[], b: string[]): boolean {
  const left = a.map((name) => name.toLowerCase()).sort();
  const right = b.map((name) => name.toLowerCase()).sort();
  return left.length === right.length && left.every((name, i) => name === right[i]);
}
