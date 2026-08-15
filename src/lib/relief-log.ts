import {
  addDoc,
  collection,
  onSnapshot,
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
  return {
    strainName: clipReliefStrainName(input.strainName),
    conditions: input.conditions.slice(0, 6),
    fit: input.fit,
    relief: Math.max(1, Math.min(5, Math.round(input.relief))),
    note: input.note?.slice(0, 400) ?? "",
    createdAt,
  };
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
    query(collection(db!, "users", uid, "reliefLogs")),
    (snap) => {
      const list: ReliefLog[] = [];
      snap.forEach((d) => {
        const data = d.data() as Omit<ReliefLog, "id">;
        list.push({ id: d.id, ...data });
      });
      cb(list.sort((a, b) => b.createdAt - a.createdAt));
    },
    () => cb([]),
  );
}

export function summarizeLogs(logs: ReliefLog[]): string {
  return logs
    .slice(0, 8)
    .map((l) => {
      const cond = l.conditions[0] ?? "general";
      return `${l.strainName} for ${cond}: ${l.fit}, relief ${l.relief}/5`;
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
