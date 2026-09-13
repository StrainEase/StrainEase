import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

export type ReliefFit = "too-strong" | "just-right" | "too-weak";

export type ReliefLog = {
  id: string;
  strainName: string;
  conditions: string[];
  fit: ReliefFit;
  /** 1–5 star rating left with the log (mirrors Android ReliefLogForm). */
  rating?: number;
  /** 1–5 intensity scale — how strong it felt. */
  relief: number;
  note?: string;
  createdAt: number;
};

/** Firestore create rule is strainName.size() < 80. */
export const RELIEF_STRAIN_NAME_MAX = 79;

export function clipReliefStrainName(name: string): string {
  return name.slice(0, RELIEF_STRAIN_NAME_MAX);
}

export function reliefLogCreateData(
  input: Omit<ReliefLog, "id" | "createdAt">,
  createdAt = Date.now(),
) {
  const doc: {
    strainName: string;
    conditions: string[];
    fit: ReliefFit;
    relief: number;
    note: string;
    rating?: number;
    createdAt: number;
  } = {
    strainName: clipReliefStrainName(input.strainName),
    conditions: input.conditions.slice(0, 6),
    fit: input.fit,
    relief: Math.max(1, Math.min(5, Math.round(input.relief))),
    note: input.note?.slice(0, 400) ?? "",
    createdAt,
  };
  // Only write rating when it was actually chosen so old Firestore
  // rules / clients don't see an unexpected key on older logs.
  if (input.rating && input.rating > 0) {
    doc.rating = Math.max(1, Math.min(5, Math.round(input.rating)));
  }
  return doc;
}

export async function addReliefLog(
  uid: string,
  input: Omit<ReliefLog, "id" | "createdAt">,
): Promise<void> {
  if (!db) throw new Error("Firebase isn't configured.");
  await addDoc(
    collection(db, "users", uid, "reliefLogs"),
    reliefLogCreateData(input),
  );
}

export function listenToReliefLogs(
  uid: string,
  cb: (list: ReliefLog[]) => void,
): Unsubscribe {
  return onSnapshot(
    query(
      collection(db!, "users", uid, "reliefLogs"),
      orderBy("createdAt", "desc"),
      limit(100),
    ),
    (snap) => {
      const list: ReliefLog[] = [];
      snap.forEach((d) => {
        const data = d.data() as Omit<ReliefLog, "id">;
        list.push({ id: d.id, ...data });
      });
      cb(list);
    },
    () => cb([]),
  );
}

export function summarizeLogs(logs: ReliefLog[]): string {
  return logs
    .slice(0, 8)
    .map((l) => {
      const cond = l.conditions[0] ?? "general";
      const rated = l.rating && l.rating > 0 ? `, rating ${l.rating}/5` : "";
      return `${l.strainName} for ${cond}: ${l.fit}, intensity ${l.relief}/5${rated}`;
    })
    .join("; ");
}

export function tonightHint(logs: ReliefLog[]): string | null {
  const nights = logs.filter((l) =>
    l.conditions.some((c) => /insomnia|sleep/i.test(c)),
  );
  const good = nights.find((l) => l.fit === "just-right" && l.relief >= 4);
  if (good) {
    return `Last time ${good.strainName} helped your sleep. Consider it again tonight.`;
  }
  const harsh = nights.find((l) => l.fit === "too-strong");
  if (harsh) {
    return `${harsh.strainName} was too strong at night — look for a gentler option.`;
  }
  return null;
}
