// Deterministic pattern analysis over the patient's relief logs. Renders
// the four lenses in `buildReliefInsights` and degrades gracefully when
// the patient has no logs or fewer than two.
//
// The panel lives in `components/saved/` because it shows up at the top
// of the Saved tab in the dashboard; it has no Firebase of its own and
// just consumes the `logs` array the parent already holds.

import { useMemo } from "react";
import {
  buildReliefInsights,
  type ReliefInsights,
  type TrendPoint,
} from "@/lib/relief-insights";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  Clock,
  Moon,
  Sparkles,
  ThumbsUp,
} from "lucide-react";
import type { ReliefLog } from "@/lib/relief-log";

export function ReliefInsightsPanel({ logs }: { logs: ReliefLog[] }) {
  // Rebuild only when the log set or its sort changes; SavedStrainsPanel
  // already keeps the array in newest-first order from Firestore.
  const insights = useMemo(() => buildReliefInsights(logs), [logs]);

  if (logs.length === 0) return null;

  if (logs.length === 1) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card px-6 py-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight">
              One log so far — keep going
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Trends, top strains, and avoid-lists unlock after you have logged
              two or more sessions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <Activity className="size-3.5 text-primary" />
        Insights from {insights.totalLogs} {insights.totalLogs === 1 ? "log" : "logs"}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <TopStrainsCard insights={insights} />
        <AvoidStrainsCard insights={insights} />
        <TrendCard insights={insights} />
        <TimeOfDayCard insights={insights} />
      </div>
    </div>
  );
}

function TopStrainsCard({ insights }: { insights: ReliefInsights }) {
  if (insights.topStrains.length === 0) {
    return (
      <InsightCard
        icon={<ThumbsUp className="size-4" />}
        title="Top strains for your symptoms"
        empty="No strains have earned a 2-log pattern yet — try a few more sessions."
      />
    );
  }
  return (
    <InsightCard
      icon={<ThumbsUp className="size-4" />}
      title="Top strains for your symptoms"
    >
      <ul className="space-y-2.5">
        {insights.topStrains.map((row) => (
          <li
            key={`${row.condition}-${row.strain}`}
            className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-background px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-tight">
                {row.strain}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                for {row.condition} · {row.logCount}× logged
              </p>
            </div>
            <ReliefPill value={row.avgRelief} />
          </li>
        ))}
      </ul>
    </InsightCard>
  );
}

function AvoidStrainsCard({ insights }: { insights: ReliefInsights }) {
  if (insights.avoid.length === 0) {
    return (
      <InsightCard
        icon={<AlertTriangle className="size-4" />}
        title="Strains to be careful with"
        empty="Nothing has been marked 'too strong' twice yet."
      />
    );
  }
  return (
    <InsightCard
      icon={<AlertTriangle className="size-4" />}
      title="Strains to be careful with"
    >
      <ul className="space-y-2.5">
        {insights.avoid.map((row) => (
          <li
            key={row.strainName}
            className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3"
          >
            <p className="text-sm font-semibold tracking-tight text-amber-900 dark:text-amber-300">
              {row.strainName}
            </p>
            <p className="mt-0.5 text-[11px] text-amber-800 dark:text-amber-400">
              {row.harshCount}× too strong out of {row.totalCount} sessions
            </p>
          </li>
        ))}
      </ul>
    </InsightCard>
  );
}

function TrendCard({ insights }: { insights: ReliefInsights }) {
  return (
    <InsightCard
      icon={<Sparkles className="size-4" />}
      title="Last 14 days"
    >
      <TrendBars trend={insights.trend} />
    </InsightCard>
  );
}

function TimeOfDayCard({ insights }: { insights: ReliefInsights }) {
  const filled = insights.timeOfDay.some((b) => b.avgRelief !== null);
  if (!filled) {
    return (
      <InsightCard
        icon={<Clock className="size-4" />}
        title="Best time of day"
        empty="Not enough logs to see a time pattern yet."
      />
    );
  }
  return (
    <InsightCard
      icon={<Clock className="size-4" />}
      title="Best time of day"
    >
      <ul className="space-y-2.5">
        {insights.timeOfDay.map((band) => {
          const muted = band.avgRelief === null;
          return (
            <li
              key={band.label}
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background px-4 py-3",
                muted && "opacity-50",
              )}
            >
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
                  <Moon
                    className={cn(
                      "size-3.5",
                      muted ? "text-muted-foreground" : "text-primary",
                    )}
                  />
                  {band.label}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {band.logCount === 0
                    ? "no logs"
                    : `${band.logCount} ${band.logCount === 1 ? "log" : "logs"}`}
                </p>
              </div>
              {band.avgRelief !== null && <ReliefPill value={band.avgRelief} />}
            </li>
          );
        })}
      </ul>
    </InsightCard>
  );
}

function TrendBars({ trend }: { trend: TrendPoint[] }) {
  if (trend.every((t) => t.avgRelief === null)) {
    return (
      <p className="text-sm text-muted-foreground">
        No logs in the last 14 days.
      </p>
    );
  }
  // Bar height uses 1–5 mapped to 0–100% so 1 sits at the floor and 5 at the top.
  return (
    <div className="flex items-end gap-1">
      {trend.map((point) => {
        if (point.avgRelief === null) {
          return (
            <div
              key={point.dayMs}
              className="h-12 flex-1 rounded-md border border-dashed border-border/60"
              title={formatDay(point.dayMs)}
            />
          );
        }
        const heightPct = Math.max(8, (point.avgRelief / 5) * 100);
        return (
          <div
            key={point.dayMs}
            className="group flex h-12 flex-1 items-end"
            title={`${formatDay(point.dayMs)} · ${point.avgRelief.toFixed(1)}/5`}
          >
            <div
              className="w-full rounded-md bg-primary/80 transition-colors group-hover:bg-primary"
              style={{ height: `${heightPct}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

function formatDay(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function ReliefPill({ value }: { value: number }) {
  const label = `${value.toFixed(1)}/5`;
  const tone =
    value >= 4
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      : value >= 3
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
        : "bg-rose-500/10 text-rose-700 dark:text-rose-400";
  return <Badge className={cn("shrink-0 rounded-full", tone)}>{label}</Badge>;
}

function InsightCard({
  icon,
  title,
  empty,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  empty?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card px-5 py-4">
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </span>
        {title}
      </p>
      <div className="mt-3">
        {children ?? (
          <p className="text-sm leading-6 text-muted-foreground">{empty}</p>
        )}
      </div>
    </div>
  );
}
