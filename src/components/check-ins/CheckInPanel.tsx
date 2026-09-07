// Composes the daily check-in form with a 14-day sparkline for each of
// the four tracked metrics. Lives on the dashboard's `checkins` mode.
//
// The component is fully self-contained: it owns its own Firebase
// listener via the `useCheckIns` hook and the form handles the upsert.
// The parent (Dashboard) only decides whether to render it.

import { useMemo, useState } from "react";
import { useCheckIns } from "@/hooks/use-check-ins";
import {
  buildCheckInTrend,
  todayKey,
  type CheckIn,
} from "@/lib/check-ins";
import { CheckInForm } from "@/components/check-ins/CheckInForm";
import { Sparkline, type SparklineSeries } from "@/components/check-ins/Sparkline";
import { Calendar, Loader2 } from "lucide-react";

const METRIC_LEGEND: { key: keyof CheckIn["metrics"]; label: string; color: string }[] = [
  { key: "mood", label: "Mood", color: "stroke-emerald-500" },
  { key: "sleep", label: "Sleep", color: "stroke-sky-500" },
  { key: "pain", label: "Pain", color: "stroke-rose-500" },
  { key: "anxiety", label: "Anxiety", color: "stroke-amber-500" },
];

export function CheckInPanel() {
  const { checkIns, isLoading } = useCheckIns();
  const [pulse, setPulse] = useState(0);

  const trend = useMemo(
    () => buildCheckInTrend(checkIns),
    // Rebuild when the list shape changes; `pulse` is a counter the
    // form bumps after a save so the trend re-evaluates immediately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [checkIns.length, checkIns[0]?.id, checkIns[0]?.updatedAt, pulse],
  );

  const today = useMemo<CheckIn | null>(() => {
    return checkIns.find((c) => c.date === todayKey()) ?? null;
  }, [checkIns]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const series: SparklineSeries[] = METRIC_LEGEND.map((m) => ({
    id: m.key,
    label: m.label,
    color: m.color,
    values: trend.days.map((d) => d[m.key]),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <Calendar className="size-3.5 text-primary" />
        Daily check-in
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[420px_1fr]">
        <div className="rounded-2xl border border-border/70 bg-card p-5">
          <CheckInForm
            today={today}
            onSaved={() => setPulse((n) => n + 1)}
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-card p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                14-day trend
              </p>
              <p className="text-[11px] text-muted-foreground">
                {trend.loggedDays} of {trend.days.length} days logged
              </p>
            </div>
            <div className="mt-3">
              <Sparkline series={series} />
            </div>
            <ul className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              {METRIC_LEGEND.map((m) => (
                <li key={m.key} className="flex items-center gap-1.5">
                  <span
                    className={`inline-block size-2 rounded-full ${m.color.replace(
                      "stroke-",
                      "bg-",
                    )}`}
                  />
                  {m.label}
                </li>
              ))}
            </ul>
          </div>

          {trend.averages && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {METRIC_LEGEND.map((m) => {
                const v = trend.averages?.[m.key] ?? 0;
                return (
                  <div
                    key={m.key}
                    className="rounded-2xl border border-border/70 bg-card px-5 py-4"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {m.label}
                    </p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight">
                      {v.toFixed(1)}
                      <span className="ml-1 text-sm text-muted-foreground">
                        /5
                      </span>
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {checkIns.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border/70 px-5 py-6 text-sm text-muted-foreground">
              Log your first check-in to start the trend. The form on the left
              saves one per day; you can revise or clear it any time.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
