// Inline-SVG sparkline. No charting library — the AGENTS.md says
// "no shadows, no nested cards, no skeletons" and the chart primitive
// in shadcn pulls in recharts. A 60-line SVG is plenty for a 14-point
// series and keeps the bundle small.
//
// Use `series` for one or more overlaid lines (each 1-5 scale, 0 = unset).
// The component auto-sizes to the parent width via viewBox.

import { useMemo } from "react";
import { cn } from "@/lib/utils";

export type SparklineSeries = {
  /** Used in the legend dot + line color. */
  id: string;
  label: string;
  color: string; // tailwind token, e.g. "stroke-primary"
  values: (number | null)[]; // oldest → newest, null = no data point
};

const WIDTH = 240;
const HEIGHT = 64;
const PAD_X = 4;
const PAD_Y = 8;
const MIN_VALUE = 1;
const MAX_VALUE = 5;

export function Sparkline({
  series,
  className,
}: {
  series: SparklineSeries[];
  className?: string;
}) {
  const { points, ticks } = useMemo(() => buildPoints(series), [series]);
  if (points.every((s) => s.segments.length === 0)) {
    return (
      <p className="text-xs text-muted-foreground">
        No data yet for this metric.
      </p>
    );
  }
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={cn("h-16 w-full", className)}
      role="img"
      aria-label={`${series.length}-metric trend`}
      preserveAspectRatio="none"
    >
      {/* Horizontal guides at values 1, 3, 5 */}
      {ticks.map((y) => (
        <line
          key={y}
          x1={PAD_X}
          x2={WIDTH - PAD_X}
          y1={y}
          y2={y}
          className="stroke-border/60"
          strokeWidth={0.5}
        />
      ))}
      {points.map((s) =>
        s.segments.map((seg, i) => (
          <polyline
            key={`${s.id}-${i}`}
            points={seg}
            fill="none"
            className={s.color}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )),
      )}
    </svg>
  );
}

function buildPoints(series: SparklineSeries[]) {
  const xFor = (idx: number, count: number) => {
    if (count <= 1) return PAD_X;
    const inner = WIDTH - PAD_X * 2;
    return PAD_X + (inner * idx) / (count - 1);
  };
  const yFor = (value: number) => {
    const ratio = (value - MIN_VALUE) / (MAX_VALUE - MIN_VALUE);
    const inner = HEIGHT - PAD_Y * 2;
    return HEIGHT - PAD_Y - ratio * inner;
  };
  const points = series.map((s) => {
    const segments: string[] = [];
    let current: string[] = [];
    s.values.forEach((value, idx) => {
      if (value === null) {
        if (current.length > 1) segments.push(current.join(" "));
        current = [];
        return;
      }
      const x = xFor(idx, s.values.length);
      const y = yFor(value);
      current.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    });
    if (current.length > 1) segments.push(current.join(" "));
    return { id: s.id, color: s.color, segments };
  });
  const ticks = [
    yFor(MIN_VALUE),
    yFor((MIN_VALUE + MAX_VALUE) / 2),
    yFor(MAX_VALUE),
  ];
  return { points, ticks };
}
