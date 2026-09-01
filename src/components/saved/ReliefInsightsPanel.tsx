import { useMemo } from "react";
import { Activity, CheckCircle2, Gauge, TrendingDown, TrendingUp } from "lucide-react";
import type { ReliefLog } from "@/lib/relief-log";
import { analyzeReliefLogs } from "@/lib/relief-insights";
import { cn } from "@/lib/utils";

export function ReliefInsightsPanel({ logs }: { logs: ReliefLog[] }) {
  const analysis = useMemo(() => analyzeReliefLogs(logs), [logs]);
  const TrendIcon = analysis.trend === "declining" ? TrendingDown : analysis.trend === "improving" ? TrendingUp : Activity;

  if (analysis.totalEntries === 0) return null;

  return (
    <section className="rounded-2xl border border-border/70 bg-card px-5 py-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Insights & trends</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">Your relief patterns</h2>
          <p className="mt-1 text-sm text-muted-foreground">Deterministic patterns from your existing logs — no AI interpretation.</p>
        </div>
        <TrendIcon className={cn("size-5", analysis.trend === "declining" ? "text-amber-600" : "text-primary")} />
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <Metric icon={<Gauge className="size-3.5" />} label="Average relief" value={analysis.averageRelief ? `${analysis.averageRelief}/5` : "—"} />
        <Metric icon={<Activity className="size-3.5" />} label="Logged experiences" value={String(analysis.totalEntries)} />
        <Metric icon={<TrendIcon className="size-3.5" />} label="Recent trend" value={analysis.trend.replace("-", " ")} />
      </div>

      {analysis.insights.length > 0 && (
        <ul className="mt-5 space-y-2.5">
          {analysis.insights.map((insight) => (
            <li key={insight.title} className="flex items-start gap-2.5 text-sm leading-6">
              <CheckCircle2 className={cn("mt-1 size-3.5 shrink-0", insight.tone === "caution" ? "text-amber-600" : "text-primary")} />
              <span><strong>{insight.title}.</strong> {insight.detail}</span>
            </li>
          ))}
        </ul>
      )}

      {analysis.bestStrains.length > 0 && (
        <div className="mt-5 border-t border-border/60 pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Most consistent strains</p>
          <div className="mt-2 space-y-2">
            {analysis.bestStrains.slice(0, 3).map((strain) => (
              <div key={strain.strainName} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-medium">{strain.strainName}</span>
                <span className="shrink-0 text-muted-foreground">{strain.averageRelief}/5 · {Math.round(strain.justRightRate * 100)}% just right</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background px-3 py-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div>
      <p className="mt-1 text-base font-semibold capitalize tracking-tight">{value}</p>
    </div>
  );
}
