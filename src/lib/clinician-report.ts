// Deterministic composer for the clinician report. Pulls the data the
// /report page renders (patient profile, conditions, medications, recent
// check-ins, recent relief logs, and pattern-analysis highlights) and
// hands it to the page as a single typed object. The AI only writes the
// `clinicalSummary` prose — everything else is computed locally so the
// report is reproducible from a snapshot of the patient's data.
//
// Privacy: the composer is pure (no I/O). The page that calls it is
// auth-gated; nothing is uploaded. The only AI call is the prose
// summary, and the user triggers it from a button.

import { buildReliefInsights } from "@/lib/relief-insights";
import { buildCheckInTrend, type CheckIn } from "@/lib/check-ins";
import { AILMENT_NAME_MAX, normalizeAilments } from "@/lib/ailments";
import type { ReliefLog } from "@/lib/relief-log";
import type { MedicationDoc } from "@/lib/medications";
import type { SavedStrain } from "@/lib/saved-strains";
import type { AuthUser } from "@/hooks/use-auth";
import { readAgeVerification } from "@/lib/age-storage";

const RELIEF_LOG_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const CHECKIN_WINDOW_DAYS = 14;
const TOP_STRAINS_LIMIT = 5;
const RELIEF_LOGS_LIMIT = 30;

export type ClinicianReportPatient = {
  displayName: string;
  email: string | null;
  /** "21+ (US-CO)" or "not on file" — pulled from the local age gate. */
  ageContext: string;
  generatedAt: number;
  /** "YYYY-MM-DD" — when this snapshot was composed. */
  generatedOn: string;
};

export type ClinicianReport = {
  patient: ClinicianReportPatient;
  conditions: string[];
  medications: MedicationDoc[];
  checkIns: {
    window: number;
    trend: ReturnType<typeof buildCheckInTrend>;
    recent: CheckIn[];
  };
  reliefLogs: {
    windowDays: number;
    totalInWindow: number;
    recent: ReliefLog[];
    /** Top performing strains (mirrors Relief Insights). */
    topStrains: ReturnType<typeof buildReliefInsights>["topStrains"];
    /** Strains marked "too strong" >= 2 times. */
    avoid: ReturnType<typeof buildReliefInsights>["avoid"];
    /** Free-form prose mirror of buildReliefInsights.summarizeInsights. */
    insightsProse: string;
  };
  savedStrains: SavedStrain[];
};

/**
 * Build a full clinician report. Caller supplies the live data it has
 * already loaded (Firestore listeners in the page); the composer just
 * normalizes and shapes it.
 */
export function buildClinicianReport(input: {
  user: AuthUser;
  ailments: string[];
  medications: MedicationDoc[];
  checkIns: CheckIn[];
  reliefLogs: ReliefLog[];
  savedStrains: SavedStrain[];
  now?: number;
}): ClinicianReport {
  const now = input.now ?? Date.now();
  const cutoff = now - RELIEF_LOG_WINDOW_MS;
  const inWindow = input.reliefLogs.filter((l) => l.createdAt >= cutoff);
  const sortedWindow = [...inWindow].sort((a, b) => b.createdAt - a.createdAt);
  const insights = buildReliefInsights(inWindow, now);
  const trend = buildCheckInTrend(input.checkIns, now, CHECKIN_WINDOW_DAYS);
  const recentCheckIns = [...input.checkIns]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 7);

  return {
    patient: {
      displayName: input.user.name || "Patient",
      email: input.user.email,
      ageContext: ageContextString(),
      generatedAt: now,
      generatedOn: formatDate(now),
    },
    conditions: normalizeAilments(input.ailments).map(
      (s) => s.slice(0, AILMENT_NAME_MAX),
    ),
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
      topStrains: insights.topStrains.slice(0, TOP_STRAINS_LIMIT),
      avoid: insights.avoid,
      insightsProse: insights.proseSummary,
    },
    savedStrains: input.savedStrains,
  };
}

function ageContextString(): string {
  const record = readAgeVerification();
  if (!record) return "not on file";
  const { region, birthDate } = record;
  const year = Number(birthDate.slice(0, 4));
  if (!Number.isFinite(year)) return `${region} (age unknown)`;
  const age = new Date().getFullYear() - year;
  return `${region} · age ${age}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Short, human-readable headline for the report. Not a clinical
 * summary — just the patient's name + the date the report was
 * generated. The full `clinicalSummary` is produced by the AI
 * callable so the page can show a stub while it loads.
 */
export function reportHeadline(report: ClinicianReport): string {
  const trimmed = report.patient.displayName.trim();
  const name = trimmed === "" ? "Patient" : trimmed;
  return `Patient summary — ${name} · ${report.patient.generatedOn}`;
}
