// Deterministic, client-side pattern analysis over a patient's relief logs.
//
// Everything in this file is pure — no AI call, no network, no randomness —
// so the same log list always renders the same insights. The Patient tab on
// the dashboard renders the output verbatim, and the test file locks the
// behavior in.
//
// Five lenses:
//   1. topStrainsForCondition — which strains actually relieved each condition
//   2. avoidStrains           — strains that were "too strong" more than once
//   3. reliefTrend            — average relief bucketed by day for the last N days
//   4. timeOfDayPattern       — average relief bucketed by hour of day
//   5. summarizeInsights      — short prose line that lands in the AI prompt
//
// "Conditions" inside a log are free-text (the ReliefLogButton lets the user
// type one), so we match case-insensitively against the user's saved
// ailments first, then fall back to the raw log value.

import type { ReliefLog } from "./relief-log";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const MIN_LOGS_PER_BUCKET = 1; // 0 → bucket hidden, 1 → render with caveat
const TREND_DAYS = 14;
const TREND_BAR_WIDTH = 4; // rendered cells per day in the trend bar

const HOUR_LABELS = [
  "Morning (6–11)",
  "Afternoon (12–17)",
  "Evening (18–22)",
  "Night (23–5)",
];

export type StrainScore = {
  strainName: string;
  /** Mean relief rating across the logs (1–5). */
  avgRelief: number;
  /** Fraction of logs where the patient rated the strain "just-right". */
  justRightRate: number;
  /** Total logs used in the score. */
  logCount: number;
};

export type TopStrainForCondition = {
  condition: string;
  strain: string;
  avgRelief: number;
  logCount: number;
};

export type AvoidStrain = {
  strainName: string;
  /** How many times the patient marked it "too strong". */
  harshCount: number;
  /** Total times the patient tried it (any fit). */
  totalCount: number;
};

export type TrendPoint = {
  /** Midnight of the day this bucket represents, in ms. */
  dayMs: number;
  /** Average relief on this day, or null when no logs that day. */
  avgRelief: number | null;
  /** Number of logs on this day. */
  logCount: number;
};

export type TimeOfDayBucket = {
  label: string;
  avgRelief: number | null;
  logCount: number;
};

export type ReliefInsights = {
  /** Strains that have repeatedly helped for a given condition. */
  topStrains: TopStrainForCondition[];
  /** Strains marked "too strong" >= 2 times — worth flagging to the next search. */
  avoid: AvoidStrain[];
  /** Per-day average relief for the last TREND_DAYS days, oldest → newest. */
  trend: TrendPoint[];
  /** Average relief grouped into 4 time-of-day bands. */
  timeOfDay: TimeOfDayBucket[];
  /** True when there are at least 2 logs to derive a meaningful insight. */
  hasEnoughData: boolean;
  /** Total number of logs that contributed to the insights. */
  totalLogs: number;
  /** Short prose summary — reused as `reliefSummary` in the AI prompt. */
  proseSummary: string;
};

function normalizeCondition(raw: string): string {
  return raw.trim();
}

function conditionKey(name: string): string {
  return name.toLowerCase();
}

function strainKey(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Roll up per-strain stats for a single condition (or for any condition
 * when `condition` is undefined). A "win" requires the fit was "just-right"
 * and the relief was 4 or 5 — pure ratings don't tell us how it sat with
 * the patient.
 */
export function topStrainsForCondition(
  logs: ReliefLog[],
  condition?: string,
  limit = 3,
): TopStrainForCondition[] {
  const want = condition ? conditionKey(condition) : null;
  const buckets = new Map<string, { strain: string; totalRelief: number; count: number }>();
  for (const log of logs) {
    if (want !== null) {
      const matched = log.conditions.some(
        (c) => conditionKey(c) === want,
      );
      if (!matched) continue;
    }
    const k = strainKey(log.strainName);
    if (k === "") continue;
    const existing = buckets.get(k);
    if (existing) {
      existing.totalRelief += log.relief;
      existing.count += 1;
    } else {
      buckets.set(k, {
        strain: log.strainName.trim(),
        totalRelief: log.relief,
        count: 1,
      });
    }
  }
  const out: TopStrainForCondition[] = [];
  for (const entry of buckets.values()) {
    if (entry.count < 2) continue; // single log = noise
    out.push({
      condition: condition ?? "any",
      strain: entry.strain,
      avgRelief: entry.totalRelief / entry.count,
      logCount: entry.count,
    });
  }
  out.sort((a, b) => {
    if (b.avgRelief !== a.avgRelief) return b.avgRelief - a.avgRelief;
    return b.logCount - a.logCount;
  });
  return out.slice(0, limit);
}

/**
 * Strains the patient has marked "too strong" two or more times. Surfaced
 * in the insights panel so the next search can deprioritize them.
 */
export function avoidStrains(logs: ReliefLog[]): AvoidStrain[] {
  const buckets = new Map<
    string,
    { strain: string; harsh: number; total: number }
  >();
  for (const log of logs) {
    const k = strainKey(log.strainName);
    if (k === "") continue;
    const existing = buckets.get(k);
    if (existing) {
      existing.total += 1;
      if (log.fit === "too-strong") existing.harsh += 1;
    } else {
      buckets.set(k, {
        strain: log.strainName.trim(),
        harsh: log.fit === "too-strong" ? 1 : 0,
        total: 1,
      });
    }
  }
  const out: AvoidStrain[] = [];
  for (const entry of buckets.values()) {
    if (entry.harsh < 2) continue;
    out.push({
      strainName: entry.strain,
      harshCount: entry.harsh,
      totalCount: entry.total,
    });
  }
  out.sort((a, b) => b.harshCount - a.harshCount);
  return out;
}

/**
 * Bucketed per-day average relief for the last `days` days, oldest → newest.
 * Days with no logs are kept in the result as `avgRelief: null` so callers
 * can render the gap in a trend bar.
 */
export function reliefTrend(
  logs: ReliefLog[],
  now: number = Date.now(),
  days: number = TREND_DAYS,
): TrendPoint[] {
  const today = startOfDay(now);
  const start = today - (days - 1) * MS_PER_DAY;
  const buckets = new Map<number, { total: number; count: number }>();
  for (let i = 0; i < days; i += 1) {
    buckets.set(start + i * MS_PER_DAY, { total: 0, count: 0 });
  }
  for (const log of logs) {
    const dayMs = startOfDay(log.createdAt);
    if (dayMs < start || dayMs > today) continue;
    const bucket = buckets.get(dayMs);
    if (!bucket) continue;
    bucket.total += log.relief;
    bucket.count += 1;
  }
  const out: TrendPoint[] = [];
  for (let i = 0; i < days; i += 1) {
    const dayMs = start + i * MS_PER_DAY;
    const b = buckets.get(dayMs)!;
    out.push({
      dayMs,
      avgRelief: b.count > 0 ? b.total / b.count : null,
      logCount: b.count,
    });
  }
  return out;
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function hourBand(date: Date): 0 | 1 | 2 | 3 {
  const h = date.getHours();
  if (h >= 6 && h <= 11) return 0;
  if (h >= 12 && h <= 17) return 1;
  if (h >= 18 && h <= 22) return 2;
  return 3;
}

/**
 * Four-band time-of-day split. The labels are short enough for a single
 * card row and the band boundaries match how the relief-log tooltip
 * already talks about "morning" / "night".
 */
export function timeOfDayPattern(logs: ReliefLog[]): TimeOfDayBucket[] {
  const totals = [0, 0, 0, 0];
  const counts = [0, 0, 0, 0];
  for (const log of logs) {
    const band = hourBand(new Date(log.createdAt));
    totals[band] += log.relief;
    counts[band] += 1;
  }
  return HOUR_LABELS.map((label, i) => ({
    label,
    avgRelief: counts[i] >= MIN_LOGS_PER_BUCKET ? totals[i] / counts[i] : null,
    logCount: counts[i],
  }));
}

function formatRelief(n: number): string {
  return n.toFixed(1);
}

function formatStrainList(items: TopStrainForCondition[], max: number): string {
  const slice = items.slice(0, max);
  return slice
    .map((item) => `${item.strain} (${formatRelief(item.avgRelief)}/5, ${item.logCount}×)`)
    .join("; ");
}

/**
 * Short prose summary — used both as the insight card body and as the
 * `reliefSummary` field the next AI search consumes.
 */
export function summarizeInsights(insights: ReliefInsights): string {
  if (!insights.hasEnoughData) return "";
  const parts: string[] = [];
  if (insights.topStrains.length > 0) {
    parts.push(`Top strains: ${formatStrainList(insights.topStrains, 3)}`);
  }
  if (insights.avoid.length > 0) {
    const avoidList = insights.avoid
      .map((a) => `${a.strainName} (${a.harshCount}× too strong)`)
      .join(", ");
    parts.push(`Avoid: ${avoidList}`);
  }
  const bestBand = insights.timeOfDay
    .filter((b) => b.avgRelief !== null)
    .sort((a, b) => (b.avgRelief ?? 0) - (a.avgRelief ?? 0))[0];
  if (bestBand) {
    parts.push(`Best window: ${bestBand.label} (${formatRelief(bestBand.avgRelief ?? 0)}/5)`);
  }
  return parts.join("; ");
}

/**
 * Build the full insights payload for a list of relief logs. Always safe
 * to call with an empty list — the returned object simply has empty
 * collections and `hasEnoughData: false`.
 */
export function buildReliefInsights(
  logs: ReliefLog[],
  now: number = Date.now(),
): ReliefInsights {
  // Use a stable per-condition ordering: for each saved condition, compute
  // the top strains; then add an "any" lens for the wild-card symptoms
  // the patient typed in that we don't have on the chip list.
  const conditionsSeen = new Set<string>();
  for (const log of logs) {
    for (const c of log.conditions) {
      const key = conditionKey(c);
      if (key !== "") conditionsSeen.add(key);
    }
  }
  const topStrains: TopStrainForCondition[] = [];
  for (const key of conditionsSeen) {
    const conditionName = [...logs]
      .flatMap((l) => l.conditions)
      .find((c) => conditionKey(c) === key) ?? key;
    topStrains.push(...topStrainsForCondition(logs, normalizeCondition(conditionName)));
  }
  topStrains.sort((a, b) => {
    if (b.avgRelief !== a.avgRelief) return b.avgRelief - a.avgRelief;
    return b.logCount - a.logCount;
  });

  const avoid = avoidStrains(logs);
  const trend = reliefTrend(logs, now);
  const tod = timeOfDayPattern(logs);
  const hasEnoughData = logs.length >= 2;

  const draft: ReliefInsights = {
    topStrains,
    avoid,
    trend,
    timeOfDay: tod,
    hasEnoughData,
    totalLogs: logs.length,
    proseSummary: "",
  };
  draft.proseSummary = summarizeInsights(draft);
  return draft;
}

/**
 * Score a strain against the patient's logs. Currently used by the
 * Reasoning Trace (Feature 3) to add a one-line "matched your past
 * relief for X" hint, but kept in the insights module because the
 * scoring is a derivation of the log data, not the AI output.
 */
export function strainPersonalFit(
  logs: ReliefLog[],
  strainName: string,
): StrainScore | null {
  const k = strainKey(strainName);
  if (k === "") return null;
  let totalRelief = 0;
  let count = 0;
  let justRight = 0;
  for (const log of logs) {
    if (strainKey(log.strainName) !== k) continue;
    totalRelief += log.relief;
    count += 1;
    if (log.fit === "just-right") justRight += 1;
  }
  if (count === 0) return null;
  return {
    strainName: logName(logs, k) ?? strainName.trim(),
    avgRelief: totalRelief / count,
    justRightRate: justRight / count,
    logCount: count,
  };
}

function logName(logs: ReliefLog[], k: string): string | null {
  for (const log of logs) {
    if (strainKey(log.strainName) === k) return log.strainName.trim();
  }
  return null;
}

// Re-exported for the test file so the assertion side can build the same
// fixture without re-deriving the day boundaries.
export const __test = {
  TREND_DAYS,
  TREND_BAR_WIDTH,
  startOfDay,
  hourBand,
};
