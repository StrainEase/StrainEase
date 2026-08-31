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
