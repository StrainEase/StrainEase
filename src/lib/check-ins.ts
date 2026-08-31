// Daily symptom check-ins. One document per day per user, keyed by
// `YYYY-MM-DD`. Tracks four 1-5 scales (mood, sleep, pain, anxiety) plus an
// optional free-text note. The shape mirrors the relief-log data so future
// "join my check-ins with my logs" views can compose them cheaply.
//
// Firestore rules live in `firestore.rules` under
// `users/{uid}/checkIns/{dateId}`.

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

export type CheckInMetrics = {
  /** 1 = low / awful, 5 = great. */
  mood: number;
  /** 1 = no sleep, 5 = fully rested. */
  sleep: number;
  /** 1 = no pain, 5 = severe pain. */
  pain: number;
  /** 1 = calm, 5 = severe anxiety. */
  anxiety: number;
};

export type CheckIn = {
  id: string;
  /** "YYYY-MM-DD" — the day this check-in represents (local time of the user). */
  date: string;
  metrics: CheckInMetrics;
  note: string;
  createdAt: number;
  updatedAt: number;
};

export type CheckInInput = {
  metrics: CheckInMetrics;
  note?: string;
};

/** Firestore rule caps note.size() <= 1000. */
export const CHECKIN_NOTE_MAX = 1000;

export function clipCheckInNote(text: string): string {
  return text.slice(0, CHECKIN_NOTE_MAX);
}

function clampMetric(n: number): number {
  if (!Number.isFinite(n)) return 3;
  return Math.max(1, Math.min(5, Math.round(n)));
}

export function normalizeMetrics(input: CheckInMetrics): CheckInMetrics {
  return {
    mood: clampMetric(input.mood),
    sleep: clampMetric(input.sleep),
    pain: clampMetric(input.pain),
    anxiety: clampMetric(input.anxiety),
  };
}

/**
 * Build the "YYYY-MM-DD" id for a given timestamp. Uses the local
 * timezone (not UTC) so a check-in submitted at 11pm lands on the
 * patient's day, not the next one in UTC.
 */
export function todayKey(timestamp: number = Date.now()): string {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isTodayKey(key: string, now: number = Date.now()): boolean {
  return key === todayKey(now);
}

function coll(uid: string) {
  return collection(db!, "users", uid, "checkIns");
}

function dataPayload(input: CheckInInput, date: string, now: number) {
  return {
    date,
    mood: normalizeMetrics(input.metrics).mood,
    sleep: normalizeMetrics(input.metrics).sleep,
    pain: normalizeMetrics(input.metrics).pain,
    anxiety: normalizeMetrics(input.metrics).anxiety,
    note: clipCheckInNote(input.note?.trim() ?? ""),
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create or replace today's check-in. We always upsert so a patient can
 * revise a number without remembering the doc id. The doc id is the
 * `YYYY-MM-DD` so the listener doesn't need an orderBy to render in
 * chronological order.
 */
export async function upsertTodayCheckIn(
  uid: string,
  input: CheckInInput,
  now: number = Date.now(),
): Promise<string> {
  const date = todayKey(now);
  const ref = doc(coll(uid), date);
  const existing = await readOne(uid, date);
  await setDoc(ref, {
    ...dataPayload(input, date, now),
    createdAt: existing?.createdAt ?? now,
  });
  return date;
}

async function readOne(uid: string, date: string): Promise<CheckIn | null> {
  if (!db) return null;
  const { getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(coll(uid), date));
  if (!snap.exists()) return null;
  return fromDoc(snap.id, snap.data());
}

function fromDoc(
  id: string,
  raw: unknown,
): CheckIn {
  const data = (raw ?? {}) as {
    date?: unknown;
    mood?: unknown;
    sleep?: unknown;
    pain?: unknown;
    anxiety?: unknown;
    note?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
  };
  return {
    id,
    date: typeof data.date === "string" ? data.date : id,
    metrics: {
      mood: typeof data.mood === "number" ? data.mood : 3,
      sleep: typeof data.sleep === "number" ? data.sleep : 3,
      pain: typeof data.pain === "number" ? data.pain : 3,
      anxiety: typeof data.anxiety === "number" ? data.anxiety : 3,
    },
    note: typeof data.note === "string" ? data.note : "",
    createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
    updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : 0,
  };
}

/**
 * Remove a check-in. Used by the panel's "Clear" affordance so a patient
 * can wipe a day they logged by mistake.
 */
export async function deleteCheckIn(uid: string, dateId: string): Promise<void> {
  await deleteDoc(doc(coll(uid), dateId));
}

/**
 * Subscribe to all of the user's check-ins. The hook unwraps this and
 * keeps only the last `days` in memory; the full listener is fine because
 * check-ins are bounded (a patient logs one per day).
 */
export function listenToCheckIns(
  uid: string,
  cb: (list: CheckIn[]) => void,
): Unsubscribe {
  return onSnapshot(
    query(coll(uid)),
    (snap) => {
      const list: CheckIn[] = [];
      snap.forEach((d) => list.push(fromDoc(d.id, d.data())));
      // Sort newest date first. The doc id is the date key so a string
      // sort matches chronological order for `YYYY-MM-DD`.
      list.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
      cb(list);
    },
    () => cb([]),
  );
}

const TREND_DAYS = 14;

function startOfDayKey(ts: number): string {
  return todayKey(ts);
}

function addDaysKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map((s) => Number(s));
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return todayKey(date.getTime());
}

export type CheckInTrendPoint = {
  date: string;
  /** Per-metric daily value, or null when no check-in that day. */
  mood: number | null;
  sleep: number | null;
  pain: number | null;
  anxiety: number | null;
};

export type CheckInTrend = {
  days: CheckInTrendPoint[];
  /** Number of days in the trend window where a check-in was logged. */
  loggedDays: number;
  /** Average of the 4 metrics across the trend window, or null when nothing was logged. */
  averages: CheckInMetrics | null;
};

/**
 * Build a 14-day trend (oldest → newest). Days with no check-in are
 * `null` so the sparkline can render a gap.
 */
export function buildCheckInTrend(
  checkIns: CheckIn[],
  now: number = Date.now(),
  days: number = TREND_DAYS,
): CheckInTrend {
  const today = startOfDayKey(now);
  const start = addDaysKey(today, -(days - 1));
  const byDate = new Map<string, CheckIn>();
  for (const ci of checkIns) byDate.set(ci.date, ci);
  const out: CheckInTrendPoint[] = [];
  let loggedDays = 0;
  let moodSum = 0;
  let sleepSum = 0;
  let painSum = 0;
  let anxietySum = 0;
  for (let i = 0; i < days; i += 1) {
    const date = addDaysKey(start, i);
    const ci = byDate.get(date);
    if (ci) {
      loggedDays += 1;
      moodSum += ci.metrics.mood;
      sleepSum += ci.metrics.sleep;
      painSum += ci.metrics.pain;
      anxietySum += ci.metrics.anxiety;
      out.push({ date, ...ci.metrics });
    } else {
      out.push({ date, mood: null, sleep: null, pain: null, anxiety: null });
    }
  }
  const averages =
    loggedDays > 0
      ? {
          mood: moodSum / loggedDays,
          sleep: sleepSum / loggedDays,
          pain: painSum / loggedDays,
          anxiety: anxietySum / loggedDays,
        }
      : null;
  return { days: out, loggedDays, averages };
}

/**
 * Short prose summary used as `checkInSummary` in the AI prompt and in
 * the clinician report. Empty when the patient has no check-ins.
 */
export function summarizeCheckIns(
  checkIns: CheckIn[],
  now: number = Date.now(),
): string {
  const trend = buildCheckInTrend(checkIns, now);
  if (!trend.averages) return "";
  const { mood, sleep, pain, anxiety } = trend.averages;
  return [
    `Check-in (${trend.loggedDays} of last ${trend.days.length} days)`,
    `mood ${mood.toFixed(1)}/5`,
    `sleep ${sleep.toFixed(1)}/5`,
    `pain ${pain.toFixed(1)}/5`,
    `anxiety ${anxiety.toFixed(1)}/5`,
  ].join(" · ");
}

// Re-export internals for tests; the production path uses upsertTodayCheckIn.
export const __test = {
  TREND_DAYS,
  coll,
  readOne,
  dataPayload,
};

export type { Unsubscribe };
