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

/**
 * Consumption form a session was logged for. Closed enum so a malformed
 * value can't sneak into the prompt. Mirrors the iOS `ConsumeForm`
 * union and the closed list in `getDrugInteractions`.
 */
export type SessionForm = "flower" | "cart" | "edible" | "tincture";

/**
 * Time-of-day bucket for a session. Used for filtering the history
 * view and for surfacing "X works for you at night" insights.
 */
export type SessionTimeOfDay = "morning" | "afternoon" | "evening" | "night";

/** Known side effects the patient can tag. Free-text side notes go in
 * the `note` field; these are the structured chips used to compute
 * "watch out for anxiety on this strain" warnings. */
export const SIDE_EFFECT_OPTIONS = [
  "anxiety",
  "paranoia",
  "dry-mouth",
  "drowsiness",
  "racing-heart",
  "nausea",
  "headache",
] as const;

export type SideEffect = (typeof SIDE_EFFECT_OPTIONS)[number];

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
  // ── Session-journal fields (PR-W1) ─────────────────────────────
  /** Consumption form (flower / cart / edible / tincture). */
  form?: SessionForm;
  /** THC dose in milligrams. Free-form integer the patient types in;
   * the Insights panel rounds to one decimal in display. */
  doseMg?: number;
  /** Bucketed time-of-day the session was logged for. */
  timeOfDay?: SessionTimeOfDay;
  /** Minutes from consumption to first noticeable effect. Optional. */
  onsetMinutes?: number;
  /** Structured side-effect tags. */
  sideEffects?: SideEffect[];
  /** Patient's "would I reach for this again?" verdict. */
  wouldRepeat?: boolean;
};

/** Firestore create rule is strainName.size() < 80. */
export const RELIEF_STRAIN_NAME_MAX = 79;

/** Maximum note length to keep the Firestore rules + LLM prompt small. */
export const RELIEF_NOTE_MAX = 400;

/** Maximum dose in mg we'll accept — caps accidental typos at 9999. */
export const RELIEF_DOSE_MAX = 500;

export function clipReliefStrainName(name: string): string {
  return name.slice(0, RELIEF_STRAIN_NAME_MAX);
}

/** Coerce an unknown value into a closed `SessionForm`, or null. */
export function normalizeSessionForm(value: unknown): SessionForm | null {
  if (
    value === "flower" ||
    value === "cart" ||
    value === "edible" ||
    value === "tincture"
  ) {
    return value;
  }
  return null;
}

/** Coerce an unknown value into a closed `SessionTimeOfDay`, or null. */
export function normalizeSessionTimeOfDay(
  value: unknown,
): SessionTimeOfDay | null {
  if (
    value === "morning" ||
    value === "afternoon" ||
    value === "evening" ||
    value === "night"
  ) {
    return value;
  }
  return null;
}

/** Coerce an unknown array into the closed SideEffect set, dropping unknowns. */
export function normalizeSideEffects(value: unknown): SideEffect[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set<string>(SIDE_EFFECT_OPTIONS);
  const out: SideEffect[] = [];
  for (const item of value) {
    if (typeof item === "string" && allowed.has(item)) {
      out.push(item as SideEffect);
    }
  }
  return out.slice(0, 6);
}

/** Coerce a raw `wouldRepeat` into a boolean (null when missing). */
export function normalizeWouldRepeat(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  return null;
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
    form?: SessionForm;
    doseMg?: number;
    timeOfDay?: SessionTimeOfDay;
    onsetMinutes?: number;
    sideEffects?: SideEffect[];
    wouldRepeat?: boolean;
  } = {
    strainName: clipReliefStrainName(input.strainName),
    conditions: input.conditions.slice(0, 6),
    fit: input.fit,
    relief: Math.max(1, Math.min(5, Math.round(input.relief))),
    note: input.note?.slice(0, RELIEF_NOTE_MAX) ?? "",
    createdAt,
  };
  // Only write rating when it was actually chosen so old Firestore
  // rules / clients don't see an unexpected key on older logs.
  if (input.rating && input.rating > 0) {
    doc.rating = Math.max(1, Math.min(5, Math.round(input.rating)));
  }
  // Session-journal fields — only written when present so older
  // clients that don't know about them don't see stray keys.
  const form = normalizeSessionForm(input.form);
  if (form) doc.form = form;
  if (typeof input.doseMg === "number" && input.doseMg > 0) {
    doc.doseMg = Math.min(RELIEF_DOSE_MAX, Math.round(input.doseMg));
  }
  const timeOfDay = normalizeSessionTimeOfDay(input.timeOfDay);
  if (timeOfDay) doc.timeOfDay = timeOfDay;
  if (typeof input.onsetMinutes === "number" && input.onsetMinutes > 0) {
    doc.onsetMinutes = Math.min(240, Math.round(input.onsetMinutes));
  }
  const sideEffects = normalizeSideEffects(input.sideEffects);
  if (sideEffects.length > 0) doc.sideEffects = sideEffects;
  const wouldRepeat = normalizeWouldRepeat(input.wouldRepeat);
  if (wouldRepeat !== null) doc.wouldRepeat = wouldRepeat;
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

/** Delete a single relief log. Rules allow the user to delete their own. */
export async function deleteReliefLog(
  uid: string,
  logId: string,
): Promise<void> {
  if (!db) throw new Error("Firebase isn't configured.");
  const { deleteDoc, doc } = await import("firebase/firestore");
  await deleteDoc(doc(db, "users", uid, "reliefLogs", logId));
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

/**
 * A "hit" is a log where the patient reported the dose landed close
 * to right (not too strong, not too weak) AND they rated the relief
 * at 4 or 5. This is the signal we surface on the strain detail page
 * ("rated helpful for insomnia 4 of 5 times").
 */
export function isHelpfulLog(log: ReliefLog): boolean {
  return log.fit === "just-right" && log.relief >= 4;
}

/**
 * Compute the personal hit rate for one strain, optionally narrowed
 * to a specific condition. Returns null when there isn't enough
 * history to make a useful statement (need at least 3 logs).
 *
 * The result is intentionally simple — it's a chip, not a chart.
 */
export type PersonalHitRate = {
  strainName: string;
  condition: string | null;
  total: number;
  hits: number;
  /** 0–1, rounded to 2 decimals. */
  rate: number;
  /** True when the patient has at least 3 logs for this slice. */
  sufficient: boolean;
};

export function personalHitRate(
  logs: ReliefLog[],
  strainName: string,
  condition?: string,
): PersonalHitRate | null {
  const target = strainName.trim().toLowerCase();
  if (!target) return null;
  const matching = logs.filter(
    (l) => l.strainName.trim().toLowerCase() === target,
  );
  const scoped =
    condition && condition.trim().length > 0
      ? matching.filter((l) =>
          l.conditions.some(
            (c) => c.trim().toLowerCase() === condition.trim().toLowerCase(),
          ),
        )
      : matching;
  if (scoped.length === 0) return null;
  const hits = scoped.filter(isHelpfulLog).length;
  return {
    strainName,
    condition: condition ?? null,
    total: scoped.length,
    hits,
    rate: Math.round((hits / scoped.length) * 100) / 100,
    sufficient: scoped.length >= 3,
  };
}

export function summarizeLogs(logs: ReliefLog[]): string {
  return logs
    .slice(0, 8)
    .map((l) => {
      const cond = l.conditions[0] ?? "general";
      const rated = l.rating && l.rating > 0 ? `, rating ${l.rating}/5` : "";
      const form = l.form ? `, ${l.form}` : "";
      return `${l.strainName} for ${cond}: ${l.fit}, intensity ${l.relief}/5${rated}${form}`;
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
