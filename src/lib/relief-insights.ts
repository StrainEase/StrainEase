import type { ReliefFit, ReliefLog } from "./relief-log";

export type ReliefTrend = "improving" | "steady" | "declining" | "insufficient-data";

export type ReliefInsight = {
  title: string;
  detail: string;
  tone: "positive" | "neutral" | "caution";
};

export type StrainReliefSummary = {
  strainName: string;
  entries: number;
  averageRelief: number;
  justRightRate: number;
};

export type ReliefInsights = {
  totalEntries: number;
  averageRelief: number | null;
  trend: ReliefTrend;
  bestStrains: StrainReliefSummary[];
  fitCounts: Record<ReliefFit, number>;
  insights: ReliefInsight[];
};

const emptyFitCounts = (): Record<ReliefFit, number> => ({
  "too-strong": 0,
  "just-right": 0,
  "too-weak": 0,
});

const round = (value: number, digits = 1) =>
  Number(value.toFixed(digits));

function average(values: number[]): number {
  return values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalizedName(name: string): string {
  return name.trim().toLowerCase();
}

export function analyzeReliefLogs(logs: ReliefLog[]): ReliefInsights {
  const ordered = [...logs].sort((a, b) => a.createdAt - b.createdAt);
  const fitCounts = emptyFitCounts();
  ordered.forEach((log) => {
    fitCounts[log.fit] += 1;
  });

  const averageRelief = ordered.length > 0
    ? round(average(ordered.map((log) => log.relief)))
    : null;

  let trend: ReliefTrend = "insufficient-data";
  if (ordered.length >= 4) {
    const midpoint = Math.floor(ordered.length / 2);
    const first = average(ordered.slice(0, midpoint).map((log) => log.relief));
    const recent = average(ordered.slice(midpoint).map((log) => log.relief));
    const delta = recent - first;
    trend = delta >= 0.5 ? "improving" : delta <= -0.5 ? "declining" : "steady";
  }

  const byStrain = new Map<string, ReliefLog[]>();
  ordered.forEach((log) => {
    const key = normalizedName(log.strainName);
    const current = byStrain.get(key) ?? [];
    current.push(log);
    byStrain.set(key, current);
  });

  const bestStrains = [...byStrain.values()]
    .filter((entries) => entries.length >= 2)
    .map((entries) => ({
      strainName: entries[entries.length - 1].strainName,
      entries: entries.length,
      averageRelief: round(average(entries.map((log) => log.relief))),
      justRightRate: round(
        entries.filter((log) => log.fit === "just-right").length / entries.length,
        2,
      ),
    }))
    .sort((a, b) => b.averageRelief - a.averageRelief || b.entries - a.entries)
    .slice(0, 5);

  const insights: ReliefInsight[] = [];
  if (bestStrains[0]) {
    insights.push({
      title: `${bestStrains[0].strainName} is your strongest pattern`,
      detail: `${bestStrains[0].averageRelief}/5 average relief across ${bestStrains[0].entries} logs.`,
      tone: "positive",
    });
  }
  if (fitCounts["too-strong"] > 0) {
    insights.push({
      title: "Watch for intensity",
      detail: `${fitCounts["too-strong"]} log${fitCounts["too-strong"] === 1 ? " is" : "s are"} marked too strong.`,
      tone: "caution",
    });
  }
  if (trend !== "insufficient-data") {
    insights.push({
      title: trend === "improving" ? "Recent relief is improving" : trend === "declining" ? "Recent relief is lower" : "Relief is holding steady",
      detail: "This compares the earlier half of your logs with the more recent half.",
      tone: trend === "declining" ? "caution" : trend === "improving" ? "positive" : "neutral",
    });
  }

  return {
    totalEntries: ordered.length,
    averageRelief,
    trend,
    bestStrains,
    fitCounts,
    insights,
  };
}

// ---------------------------------------------------------------------------
// Legacy adapter — exposes the broader shape that pre-#215 callers
// (`useReliefSummary`, `clinicianReport`) were built around. Built on top of
// the canonical `analyzeReliefLogs` so the two stay in sync and the panel
// rendered by the canonical analysis is the same data the report ships.
//
// Kept in this file so the import surface for the legacy callers doesn't
// change as we re-shape the canonical API. The adapter is intentionally
// a thin projection: every field is derived from `analyzeReliefLogs`.
// ---------------------------------------------------------------------------

const TREND_DAYS = 14;

export type TopStrainForCondition = {
  strain: string;
  condition: string;
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
  date: string;
  averageRelief: number | null;
  count: number;
};

export type TimeOfDayBucket = {
  band: "morning" | "afternoon" | "evening" | "night";
  averageRelief: number | null;
  count: number;
};

export type LegacyReliefInsights = {
  topStrains: TopStrainForCondition[];
  avoid: AvoidStrain[];
  trend: TrendPoint[];
  timeOfDay: TimeOfDayBucket[];
  hasEnoughData: boolean;
  totalLogs: number;
  proseSummary: string;
};

function todayKey(now: number): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(key: string, delta: number): string {
  const [y, m, d] = key.split("-").map((s) => Number(s));
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + delta);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function hourBand(date: Date): 0 | 1 | 2 | 3 {
  const h = date.getHours();
  if (h < 6) return 3; // night
  if (h < 12) return 0; // morning
  if (h < 18) return 1; // afternoon
  return 2; // evening
}

function startOfDayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function buildReliefInsights(
  logs: ReliefLog[],
  now: number = Date.now(),
): LegacyReliefInsights {
  const analysis = analyzeReliefLogs(logs);

  // Top strains, grouped by condition. A "win" requires the fit was
  // "just-right" and the relief was 4 or 5 — pure ratings don't tell
  // us how it sat with the patient.
  const buckets = new Map<
    string,
    { strain: string; condition: string; totalRelief: number; count: number }
  >();
  for (const log of logs) {
    if (log.fit !== "just-right" || log.relief < 4) continue;
    const condition = log.conditions[0]?.trim() || "general";
    const key = `${normalizedName(log.strainName)}|${condition.toLowerCase()}`;
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
  const topStrains: TopStrainForCondition[] = [...buckets.values()]
    .filter((b) => b.count >= 2)
    .map((b) => ({
      strain: b.strain,
      condition: b.condition,
      avgRelief: round(b.totalRelief / b.count),
      logCount: b.count,
    }))
    .sort((a, b) => b.avgRelief - a.avgRelief || b.logCount - a.logCount)
    .slice(0, 5);

  // Avoid list — strains marked "too strong" at least twice.
  const totalsByStrain = new Map<string, { strain: string; harsh: number; total: number }>();
  for (const log of logs) {
    const key = normalizedName(log.strainName);
    const existing = totalsByStrain.get(key) ?? {
      strain: log.strainName.trim(),
      harsh: 0,
      total: 0,
    };
    existing.total += 1;
    if (log.fit === "too-strong") existing.harsh += 1;
    totalsByStrain.set(key, existing);
  }
  const avoid: AvoidStrain[] = [...totalsByStrain.values()]
    .filter((s) => s.harsh >= 2)
    .sort((a, b) => b.harsh - a.harsh)
    .map((s) => ({
      strainName: s.strain,
      harshCount: s.harsh,
      totalCount: s.total,
    }));

  // Per-day average relief for the last TREND_DAYS days, oldest → newest.
  const today = todayKey(now);
  const start = addDays(today, -(TREND_DAYS - 1));
  const byDate = new Map<string, ReliefLog[]>();
  for (const log of logs) {
    const date = startOfDayKey(log.createdAt);
    const existing = byDate.get(date) ?? [];
    existing.push(log);
    byDate.set(date, existing);
  }
  const trend: TrendPoint[] = [];
  for (let i = 0; i < TREND_DAYS; i += 1) {
    const date = addDays(start, i);
    const dayLogs = byDate.get(date) ?? [];
    if (dayLogs.length > 0) {
      trend.push({
        date,
        averageRelief: round(average(dayLogs.map((l) => l.relief))),
        count: dayLogs.length,
      });
    } else {
      trend.push({ date, averageRelief: null, count: 0 });
    }
  }

  // 4-band time-of-day pattern.
  const bands: { sum: number; count: number }[] = [
    { sum: 0, count: 0 },
    { sum: 0, count: 0 },
    { sum: 0, count: 0 },
    { sum: 0, count: 0 },
  ];
  for (const log of logs) {
    const band = hourBand(new Date(log.createdAt));
    bands[band].sum += log.relief;
    bands[band].count += 1;
  }
  const labels: TimeOfDayBucket["band"][] = ["morning", "afternoon", "evening", "night"];
  const timeOfDay: TimeOfDayBucket[] = labels.map((band, i) => ({
    band,
    averageRelief: bands[i].count > 0 ? round(bands[i].sum / bands[i].count) : null,
    count: bands[i].count,
  }));

  // Prose summary. Empty when there are no logs (callers fall back to a
  // one-liner). When there are logs but only 1, the patient hasn't
  // generated a real pattern yet — leave proseSummary empty and let the
  // caller's fallback take over.
  const proseSummary = analysis.totalEntries >= 2 ? summarizeAnalysis(analysis, topStrains, avoid) : "";

  return {
    topStrains,
    avoid,
    trend,
    timeOfDay,
    hasEnoughData: analysis.totalEntries >= 2,
    totalLogs: analysis.totalEntries,
    proseSummary,
  };
}

function summarizeAnalysis(
  analysis: ReliefInsights,
  topStrains: TopStrainForCondition[],
  avoid: AvoidStrain[],
): string {
  const parts: string[] = [];
  if (analysis.totalEntries > 0 && analysis.averageRelief !== null) {
    parts.push(`${analysis.totalEntries} log${analysis.totalEntries === 1 ? "" : "s"}, avg relief ${analysis.averageRelief}/5`);
  }
  if (topStrains[0]) {
    const top = topStrains[0];
    parts.push(
      `top strain ${top.strain} for ${top.condition} (${top.avgRelief}/5 across ${top.logCount})`,
    );
  }
  if (avoid[0]) {
    parts.push(`avoid ${avoid.map((a) => a.strainName).join(", ")} (too strong)`);
  }
  if (analysis.trend === "improving") parts.push("recent relief is improving");
  if (analysis.trend === "declining") parts.push("recent relief is lower");
  return parts.join("; ");
}

