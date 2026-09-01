// Server-side snapshot builder for the Clinician Report.
//
// Reads the patient's ailments, medications, check-ins, relief logs,
// and saved strains + notes directly from Firestore via the Admin SDK
// and produces a `ClinicianReport` shape that mirrors the one the web
// `/report` page builds client-side. Keeping the server side self-
// contained (no imports from `src/`) means the functions bundle stays
// under the Cloud Functions size limit even after we add Puppeteer.

import { getFirestore, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { isRegionCode, calculateAge, type RegionCode } from "./age";

const RELIEF_LOG_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const CHECKIN_WINDOW_DAYS = 14;
const TOP_STRAINS_LIMIT = 5;
const RELIEF_LOGS_LIMIT = 30;

export type CheckInMetrics = {
  mood: number;
  sleep: number;
  pain: number;
  anxiety: number;
};

export type CheckIn = {
  id: string;
  date: string;
  metrics: CheckInMetrics;
  note: string;
  createdAt: number;
  updatedAt: number;
};

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

export type SavedNote = {
  id: string;
  text: string;
  isPublic: boolean;
  createdAt: number;
  publicId?: string;
};

export type SavedStrain = {
  slug: string;
  name: string;
  type?: string;
  thcRange?: string;
  imageUrl?: string;
  savedAt: number;
  notes: SavedNote[];
};

export type Medication = {
  id: string;
  name: string;
  addedAt: number;
};

export type CheckInTrendPoint = {
  date: string;
  mood: number | null;
  sleep: number | null;
  pain: number | null;
  anxiety: number | null;
};

export type CheckInTrend = {
  days: CheckInTrendPoint[];
  loggedDays: number;
  averages: CheckInMetrics | null;
};

export type TopStrainForCondition = {
  strain: string;
  condition: string;
  avgRelief: number;
  logCount: number;
};

export type AvoidStrain = {
  strainName: string;
  harshCount: number;
  totalCount: number;
};

export type ClinicianReportPatient = {
  displayName: string;
  email: string | null;
  ageContext: string;
  generatedAt: number;
  generatedOn: string;
};

export type ClinicianReport = {
  patient: ClinicianReportPatient;
  conditions: string[];
  medications: Medication[];
  checkIns: {
    window: number;
    trend: CheckInTrend;
    recent: CheckIn[];
  };
  reliefLogs: {
    windowDays: number;
    totalInWindow: number;
    recent: ReliefLog[];
    topStrains: TopStrainForCondition[];
    avoid: AvoidStrain[];
    insightsProse: string;
  };
  savedStrains: SavedStrain[];
};

/**
 * Read the full patient snapshot from Firestore using the Admin SDK.
 * Called by the `generateClinicianReportPdf` callable after we've
 * confirmed `request.auth.uid` matches the requested `uid` (we
 * only ever call this with the caller's own uid).
 */
export async function loadClinicianReport(
  uid: string,
  now: number = Date.now(),
): Promise<ClinicianReport> {
  const db = getFirestore();
  const auth = getAuth();

  const [userRecord, profileDoc, medsSnap, checkInsSnap, reliefLogsSnap, savedStrainsSnap] =
    await Promise.all([
      auth.getUser(uid).catch(() => null),
      db.collection("users").doc(uid).get(),
      db.collection("users").doc(uid).collection("medications").get(),
      db.collection("users").doc(uid).collection("checkIns").get(),
      db.collection("users").doc(uid).collection("reliefLogs").get(),
      db.collection("users").doc(uid).collection("savedStrains").get(),
    ]);

  const ailments = extractAilments(profileDoc);
  const medications = medsSnap.docs.map((d) =>
    parseMedication(d as QueryDocumentSnapshot),
  );
  const checkIns = checkInsSnap.docs
    .map((d) => parseCheckIn(d as QueryDocumentSnapshot))
    .filter((c): c is CheckIn => c !== null);
  const reliefLogs = reliefLogsSnap.docs
    .map((d) => parseReliefLog(d as QueryDocumentSnapshot))
    .filter((l): l is ReliefLog => l !== null);
  const savedStrains = savedStrainsSnap.docs.map((d) =>
    parseSavedStrain(d as QueryDocumentSnapshot),
  );

  const ageContext = await readAgeContext(db, uid, now);

  const displayName =
    (typeof userRecord?.displayName === "string" && userRecord.displayName.trim() !== ""
      ? userRecord.displayName
      : (profileDoc.data() as { displayName?: string } | undefined)?.displayName) ||
    "Patient";

  return buildClinicianReport({
    displayName,
    email: userRecord?.email ?? null,
    ageContext,
    ailments,
    medications,
    checkIns,
    reliefLogs,
    savedStrains,
    now,
  });
}

function extractAilments(snap: FirebaseFirestore.DocumentSnapshot): string[] {
  const data = snap.data() as { ailments?: unknown } | undefined;
  if (!data || !Array.isArray(data.ailments)) return [];
  return data.ailments
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter((x) => x !== "")
    .slice(0, 16);
}

async function readAgeContext(
  db: FirebaseFirestore.Firestore,
  uid: string,
  now: number,
): Promise<string> {
  try {
    const snap = await db
      .collection("users")
      .doc(uid)
      .collection("ageVerification")
      .limit(1)
      .get();
    if (snap.empty) return "not on file";
    const doc = snap.docs[0];
    const data = doc.data() as { region?: unknown; birthDate?: unknown };
    if (!isRegionCode(data.region) || typeof data.birthDate !== "string") {
      return "not on file";
    }
    return formatAgeContext(data.region, data.birthDate, now);
  } catch {
    return "not on file";
  }
}

function formatAgeContext(region: RegionCode, birthDate: string, now: number): string {
  const age = calculateAge(birthDate, new Date(now));
  if (!Number.isFinite(age) || age <= 0) return `${region} (age unknown)`;
  return `${region} · age ${age}`;
}

function parseMedication(d: QueryDocumentSnapshot): Medication {
  const data = d.data() as { name?: unknown; addedAt?: unknown };
  return {
    id: d.id,
    name: typeof data.name === "string" ? data.name : d.id,
    addedAt: typeof data.addedAt === "number" ? data.addedAt : 0,
  };
}

function parseCheckIn(d: QueryDocumentSnapshot): CheckIn | null {
  const data = d.data() as {
    date?: unknown;
    mood?: unknown;
    sleep?: unknown;
    pain?: unknown;
    anxiety?: unknown;
    note?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
  };
  if (
    typeof data.date !== "string" ||
    typeof data.mood !== "number" ||
    typeof data.sleep !== "number" ||
    typeof data.pain !== "number" ||
    typeof data.anxiety !== "number"
  ) {
    return null;
  }
  return {
    id: d.id,
    date: data.date,
    metrics: {
      mood: data.mood,
      sleep: data.sleep,
      pain: data.pain,
      anxiety: data.anxiety,
    },
    note: typeof data.note === "string" ? data.note : "",
    createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
    updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : 0,
  };
}

function parseReliefLog(d: QueryDocumentSnapshot): ReliefLog | null {
  const data = d.data() as {
    strainName?: unknown;
    conditions?: unknown;
    fit?: unknown;
    relief?: unknown;
    note?: unknown;
    createdAt?: unknown;
  };
  if (
    typeof data.strainName !== "string" ||
    typeof data.fit !== "string" ||
    typeof data.relief !== "number"
  ) {
    return null;
  }
  if (data.fit !== "too-strong" && data.fit !== "just-right" && data.fit !== "too-weak") {
    return null;
  }
  return {
    id: d.id,
    strainName: data.strainName,
    conditions: Array.isArray(data.conditions)
      ? (data.conditions as unknown[])
          .filter((x): x is string => typeof x === "string")
          .slice(0, 6)
      : [],
    fit: data.fit,
    relief: data.relief,
    note: typeof data.note === "string" ? data.note : undefined,
    createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
  };
}

function parseSavedStrain(d: QueryDocumentSnapshot): SavedStrain {
  const data = d.data() as {
    name?: unknown;
    type?: unknown;
    thcRange?: unknown;
    imageUrl?: unknown;
    savedAt?: unknown;
    notes?: unknown;
  };
  const notes: SavedNote[] = Array.isArray(data.notes)
    ? (data.notes as unknown[])
        .map((n): SavedNote | null => {
          if (!n || typeof n !== "object") return null;
          const o = n as { id?: unknown; text?: unknown; isPublic?: unknown; createdAt?: unknown; publicId?: unknown };
          if (typeof o.id !== "string" || typeof o.text !== "string") return null;
          return {
            id: o.id,
            text: o.text,
            isPublic: o.isPublic === true,
            createdAt: typeof o.createdAt === "number" ? o.createdAt : 0,
            publicId: typeof o.publicId === "string" ? o.publicId : undefined,
          };
        })
        .filter((n): n is SavedNote => n !== null)
    : [];
  return {
    slug: d.id,
    name: typeof data.name === "string" ? data.name : d.id,
    type: typeof data.type === "string" ? data.type : undefined,
    thcRange: typeof data.thcRange === "string" ? data.thcRange : undefined,
    imageUrl: typeof data.imageUrl === "string" ? data.imageUrl : undefined,
    savedAt: typeof data.savedAt === "number" ? data.savedAt : 0,
    notes,
  };
}

/**
 * Pure snapshot composer. Mirrors the web's `buildClinicianReport`
 * semantics so the rendered PDF matches what the user sees on the
 * `/report` page.
 */
export function buildClinicianReport(input: {
  displayName: string;
  email: string | null;
  ageContext: string;
  ailments: string[];
  medications: Medication[];
  checkIns: CheckIn[];
  reliefLogs: ReliefLog[];
  savedStrains: SavedStrain[];
  now: number;
}): ClinicianReport {
  const now = input.now;
  const cutoff = now - RELIEF_LOG_WINDOW_MS;
  const inWindow = input.reliefLogs.filter((l) => l.createdAt >= cutoff);
  const sortedWindow = [...inWindow].sort((a, b) => b.createdAt - a.createdAt);
  const trend = buildCheckInTrend(input.checkIns, now, CHECKIN_WINDOW_DAYS);
  const recentCheckIns = [...input.checkIns]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 7);

  const topStrains = computeTopStrains(inWindow).slice(0, TOP_STRAINS_LIMIT);
  const avoid = computeAvoidStrains(inWindow);
  const insightsProse = composeReliefInsightsProse(inWindow, topStrains, avoid);

  return {
    patient: {
      displayName: input.displayName,
      email: input.email,
      ageContext: input.ageContext,
      generatedAt: now,
      generatedOn: formatDate(now),
    },
    conditions: input.ailments
      .map((s) => s.trim())
      .filter((s) => s !== "")
      .slice(0, 16),
    medications: input.medications,
    checkIns: {
      window: CHECKIN_WINDOW_DAYS,
      trend,
      recent: recentCheckIns,
    },
    reliefLogs: {
      windowDays: 30,
      totalInWindow: inWindow.length,
      recent: sortedWindow.slice(0, RELIEF_LOGS_LIMIT),
      topStrains,
      avoid,
      insightsProse,
    },
    savedStrains: input.savedStrains,
  };
}

function buildCheckInTrend(
  checkIns: CheckIn[],
  now: number,
  days: number,
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

function computeTopStrains(logs: ReliefLog[]): TopStrainForCondition[] {
  type Bucket = { strain: string; condition: string; totalRelief: number; count: number };
  const buckets = new Map<string, Bucket>();
  for (const log of logs) {
    if (log.fit !== "just-right" || log.relief < 4) continue;
    const condition = log.conditions[0]?.trim() || "general";
    const key = `${log.strainName.trim().toLowerCase()}|${condition.toLowerCase()}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.totalRelief += log.relief;
      existing.count += 1;
    } else {
      buckets.set(key, {
        strain: log.strainName.trim(),
        condition,
        totalRelief: log.relief,
        count: 1,
      });
    }
  }
  return [...buckets.values()]
    .filter((b) => b.count >= 2)
    .map((b) => ({
      strain: b.strain,
      condition: b.condition,
      avgRelief: round(b.totalRelief / b.count, 1),
      logCount: b.count,
    }))
    .sort((a, b) => b.avgRelief - a.avgRelief || b.logCount - a.logCount);
}

function computeAvoidStrains(logs: ReliefLog[]): AvoidStrain[] {
  type Totals = { strainName: string; harsh: number; total: number };
  const totalsByStrain = new Map<string, Totals>();
  for (const log of logs) {
    const key = log.strainName.trim().toLowerCase();
    const existing = totalsByStrain.get(key) ?? {
      strainName: log.strainName.trim(),
      harsh: 0,
      total: 0,
    };
    existing.total += 1;
    if (log.fit === "too-strong") existing.harsh += 1;
    totalsByStrain.set(key, existing);
  }
  return [...totalsByStrain.values()]
    .filter((s) => s.harsh >= 2)
    .sort((a, b) => b.harsh - a.harsh)
    .map((s) => ({ strainName: s.strainName, harshCount: s.harsh, totalCount: s.total }));
}

function composeReliefInsightsProse(
  logs: ReliefLog[],
  topStrains: TopStrainForCondition[],
  avoid: AvoidStrain[],
): string {
  if (logs.length === 0) return "";
  const parts: string[] = [];
  if (topStrains.length > 0) {
    const names = topStrains
      .slice(0, 2)
      .map((t) => `${t.strain} for ${t.condition} (${t.avgRelief.toFixed(1)}/5)`)
      .join(", ");
    parts.push(`Top performers: ${names}.`);
  }
  if (avoid.length > 0) {
    const names = avoid
      .slice(0, 2)
      .map((a) => `${a.strainName} (${a.harshCount}× too strong)`)
      .join(", ");
    parts.push(`Marked "too strong" repeatedly: ${names}.`);
  }
  if (parts.length === 0) {
    return `${logs.length} relief log${logs.length === 1 ? "" : "s"} in the last 30 days.`;
  }
  return parts.join(" ");
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function startOfDayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDaysKey(key: string, delta: number): string {
  const [y, m, d] = key.split("-").map((s) => parseInt(s, 10));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Trim the snapshot down to the facts Dr. Kaya needs. Mirrors the
 * web's `serializeReportForModel` so the prompt the model sees is
 * identical regardless of which side initiated the call.
 */
export function serializeReportForModel(report: ClinicianReport): Record<string, unknown> {
  return {
    patient: {
      displayName: report.patient.displayName,
      ageContext: report.patient.ageContext,
    },
    conditions: report.conditions,
    medications: report.medications.map((m) => m.name),
    checkIns: {
      windowDays: report.checkIns.window,
      loggedDays: report.checkIns.trend.loggedDays,
      averages: report.checkIns.trend.averages,
    },
    reliefLogs: {
      windowDays: report.reliefLogs.windowDays,
      totalInWindow: report.reliefLogs.totalInWindow,
      topStrains: report.reliefLogs.topStrains,
      avoid: report.reliefLogs.avoid,
      insightsProse: report.reliefLogs.insightsProse,
    },
  };
}
