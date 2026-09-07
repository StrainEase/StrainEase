// "Why this strain" — auditable evidence ledger for a single AI
// recommendation. Renders the `reasoning` block the model emits with
// every pick from `recommendStrainsForConditions`. The patient can
// collapse the rest of the card and still see this; if a number or
// claim later feels off, they can audit exactly which input it came
// from without re-running a search.
//
// The component renders nothing when `reasoning` is undefined so it
// is safe to mount on every card without DOM noise for older model
// responses.

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  History,
  ListChecks,
  Sparkles,
  Target,
} from "lucide-react";
import type { ReasoningEvidence, ReasoningSource } from "@/lib/strain-api";

const SOURCE_TONE: Record<
  ReasoningSource,
  { dot: string; pill: string }
> = {
  Leafly: {
    dot: "bg-emerald-500",
    pill: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  Weedmaps: {
    dot: "bg-sky-500",
    pill: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
  Allbud: {
    dot: "bg-purple-500",
    pill: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  },
  Reddit: {
    dot: "bg-orange-500",
    pill: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  },
  Aggregated: {
    dot: "bg-slate-500",
    pill: "bg-slate-500/10 text-slate-700 dark:text-slate-400",
  },
  "Patient history": {
    dot: "bg-primary",
    pill: "bg-primary/10 text-primary",
  },
};

export function ReasoningTrace({
  reasoning,
}: {
  reasoning: ReasoningEvidence | undefined;
}) {
  const [open, setOpen] = useState(false);
  if (!reasoning) return null;
  const totalBullets =
    reasoning.matchedConditions.length +
    reasoning.preferencesApplied.length +
    reasoning.evidence.length +
    reasoning.considerations.length;
  if (totalBullets === 0) return null;

  return (
    <div className="mt-3 rounded-xl border border-border/60 bg-background">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2 text-left"
        aria-expanded={open}
        aria-label="Why this strain — show evidence"
      >
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" />
          Why this strain
        </span>
        <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {reasoning.evidence.length} {reasoning.evidence.length === 1 ? "source" : "sources"}
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform",
              open && "rotate-180",
            )}
          />
        </span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-border/60 px-3 py-3">
          {reasoning.matchedConditions.length > 0 && (
            <Section
              icon={<Target className="size-3.5" />}
              title="Matched your conditions"
            >
              <ul className="flex flex-wrap gap-1.5">
                {reasoning.matchedConditions.map((c) => (
                  <li key={c}>
                    <Badge variant="secondary" className="rounded-full">
                      {c}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {reasoning.preferencesApplied.length > 0 && (
            <Section
              icon={<ListChecks className="size-3.5" />}
              title="Honored your preferences"
            >
              <ul className="list-disc space-y-1 pl-5 text-xs leading-5 text-foreground/90">
                {reasoning.preferencesApplied.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </Section>
          )}

          {reasoning.evidence.length > 0 && (
            <Section
              icon={<ClipboardList className="size-3.5" />}
              title="Source-anchored evidence"
            >
              <ul className="space-y-2">
                {reasoning.evidence.map((item, i) => {
                  const tone = SOURCE_TONE[item.source];
                  return (
                    <li
                      key={`${item.source}-${i}`}
                      className="flex items-start gap-2.5"
                    >
                      <span
                        className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", tone.dot)}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "mr-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                            tone.pill,
                          )}
                        >
                          {item.source}
                        </span>
                        <span className="text-xs leading-5 text-foreground/90">
                          {item.quote}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}

          {reasoning.considerations.length > 0 && (
            <Section
              icon={<AlertTriangle className="size-3.5" />}
              title="Weigh before trying"
            >
              <ul className="space-y-1.5">
                {reasoning.considerations.map((c) => (
                  <li
                    key={c}
                    className="flex items-start gap-2 text-xs leading-5 text-amber-900 dark:text-amber-300"
                  >
                    <AlertTriangle className="mt-0.5 size-3 shrink-0 text-amber-700 dark:text-amber-400" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <p className="flex items-center gap-1.5 text-[11px] leading-4 text-muted-foreground">
            <History className="size-3" />
            Evidence was drawn from the same inputs the model was given
            (Leafly/Weedmaps/Allbud profiles, community notes, the curated
            Reddit seed, and your own relief log). No facts are invented.
            {reasoning.evidence.length > 0 && (
              <CheckCircle2 className="ml-1 size-3 text-emerald-600" />
            )}
          </p>
        </div>
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
      </p>
      {children}
    </div>
  );
}
