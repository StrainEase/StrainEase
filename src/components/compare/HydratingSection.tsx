import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Strain-detail blocks that come from the Leafly / Weedmaps / research
 * lookup. Mirrors the iOS `StrainHydrationSection` enum so the two
 * surfaces stay in step. User notes and relief logs are not included —
 * those don't need a network round trip.
 */
export type StrainHydrationSection =
  | "lineage"
  | "description"
  | "dayNight"
  | "uses"
  | "effects"
  | "terpenes"
  | "sideEffects"
  | "community";

type HydratingSectionConfig = {
  /** Uppercase section label shown above the card (matches iOS `SectionLabel`). */
  label: string;
  /** Status line rendered next to the spinner inside the card. */
  caption: string;
  /** Number of placeholder bars to render after the caption. */
  lines: number;
  /**
   * When true, the section is rendered as a small inline row (no card,
   * no placeholder bars) — used for lineage where iOS only shows a
   * one-liner under the subtitle. Defaults to false (full card).
   */
  inline?: boolean;
};

const SECTION_CONFIG: Record<StrainHydrationSection, HydratingSectionConfig> = {
  lineage: {
    label: "Lineage",
    caption: "Looking up parent strains…",
    lines: 1,
    inline: true,
  },
  description: {
    label: "Overview",
    caption: "Researching this strain…",
    lines: 3,
  },
  dayNight: {
    label: "Day to night",
    caption: "Scoring day vs night from reported effects…",
    lines: 2,
  },
  uses: {
    label: "Reported uses",
    caption: "Collecting commonly reported uses…",
    lines: 2,
  },
  effects: {
    label: "Effects",
    caption: "Pulling reported effects…",
    lines: 4,
  },
  terpenes: {
    label: "Terpenes",
    caption: "Reading the terpene profile…",
    lines: 2,
  },
  sideEffects: {
    label: "Watch for",
    caption: "Checking commonly reported side effects…",
    lines: 2,
  },
  community: {
    label: "Community voices",
    caption: "Pulling Leafly reviews and Reddit comments…",
    lines: 3,
  },
};

/**
 * Inline status line — used for sections where iOS shows a one-liner
 * under the subtitle instead of a full loading card (currently just
 * `lineage`).
 */
export function HydratingLine({
  section,
  className,
}: {
  section: StrainHydrationSection;
  className?: string;
}) {
  const config = SECTION_CONFIG[section];
  return (
    <div
      role="status"
      aria-live="polite"
      data-hydrating={section}
      className={cn(
        "flex items-center gap-2 text-xs text-muted-foreground",
        className,
      )}
    >
      <Loader2
        className="size-3.5 shrink-0 animate-spin text-primary"
        aria-hidden
      />
      <span>{config.caption}</span>
    </div>
  );
}

/**
 * iOS-style loading card: spinner + status message, then a stack of
 * shimmer placeholder bars. Used as a stand-in for a content section
 * that hasn't finished hydrating yet so the user sees the full page
 * layout right away.
 */
export function HydratingSection({
  section,
  className,
}: {
  section: StrainHydrationSection;
  className?: string;
}) {
  const config = SECTION_CONFIG[section];

  if (config.inline) {
    return <HydratingLine section={section} className={className} />;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      data-hydrating={section}
      className={cn("flex flex-col gap-2.5", className)}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {config.label}
      </p>
      <div className="flex flex-col gap-2.5 rounded-2xl border border-border/70 bg-card p-5">
        <div className="flex items-center gap-2">
          <Loader2
            className="size-4 shrink-0 animate-spin text-primary"
            aria-hidden
          />
          <span className="text-sm text-muted-foreground">{config.caption}</span>
        </div>
        {Array.from({ length: config.lines }).map((_, index) => (
          <span
            key={index}
            aria-hidden
            className="skeleton-line h-3 rounded-full"
            style={{
              // Last bar in each section is narrower on iOS — match that
              // so the placeholder reads as "content being written" rather
              // than a uniform striped block.
              maxWidth:
                index === config.lines - 1 ? "55%" : "100%",
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** Section labels, exposed for callers that want to show the heading
 *  without the loading card (e.g. when a section has its own custom
 *  skeleton). */
export const HYDRATING_SECTION_LABEL: Record<StrainHydrationSection, string> =
  Object.fromEntries(
    Object.entries(SECTION_CONFIG).map(([key, value]) => [key, value.label]),
  ) as Record<StrainHydrationSection, string>;
