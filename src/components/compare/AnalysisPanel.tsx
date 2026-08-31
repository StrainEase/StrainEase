import type { QuoteNote } from "@/lib/quotes";
import type { RedditSource } from "@/lib/strain-profile";
import { RedditThreads } from "@/components/compare/RedditThreads";
import { SWCard } from "@/components/ui/sw-card";
import {
  Award,
  Brain,
  CheckCircle2,
  GitCompareArrows,
  Quote,
  ShieldAlert,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import type { ReactNode } from "react";

export type StrainAnalysis = {
  headline: string;
  summary: string;
  forCondition: {
    best: string;
    why: string;
    runnerUp: string;
  } | null;
  keyDifferences: string[];
  commonGround: string[];
  cautions: string[];
  redditSources?: RedditSource[];
};

function BulletList({
  title,
  items,
  icon,
  tone = "default",
}: {
  title: string;
  items: string[];
  icon: ReactNode;
  tone?: "default" | "warn";
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
      </div>
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li
            key={i}
            className={`flex items-start gap-2.5 text-sm leading-6 ${
              tone === "warn" ? "text-amber-900 dark:text-amber-100/90" : ""
            }`}
          >
            {tone === "warn" ? (
              <TriangleAlert className="mt-1 size-3.5 shrink-0 text-amber-500" />
            ) : (
              <CheckCircle2 className="mt-1 size-3.5 shrink-0 text-primary" />
            )}
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RedditThreadsBlock({ sources }: { sources: RedditSource[] }) {
  if (sources.length === 0) return null;
  return (
    <div className="-mx-[5px] mt-[5px] rounded-b-[22px] border-t border-border/70 bg-muted/45 px-[5px] pb-[5px]">
      <div className="rounded-[22px] border border-border bg-card px-4 py-4 sm:px-5">
        <RedditThreads
          sources={sources}
          title="Reddit threads for these strains"
          description="Pointed to from public discussion — surfaced from a curated list, not live-scraped."
        />
      </div>
    </div>
  );
}

export function AnalysisPanel({
  analysis,
  quotes = [],
}: {
  analysis: StrainAnalysis;
  quotes?: { strain: string; note: QuoteNote }[];
}) {
  const { headline, summary, forCondition } = analysis;

  return (
    <SWCard>
      {/* Verdict header */}
      <div className="border-b border-border/60 bg-gradient-to-br from-primary/8 to-transparent px-4 pb-5 pt-4 sm:px-5 sm:pb-6 sm:pt-5">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="size-3.5" />
          AI comparison · Dr. Kaya
        </div>
        <h2 className="mt-3 text-xl font-semibold tracking-tight text-balance sm:text-2xl">
          {headline}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
          {summary}
        </p>
        {quotes.length > 0 && (
          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {quotes.map(({ strain, note }) => (
              <SWCard key={`${strain}-${note.source}`} innerClassName="px-3 py-3 sm:px-4">
                <Quote className="mb-2 size-3.5 text-primary/60" />
                <p className="text-sm leading-6 text-foreground/90">
                  “{note.text}”
                </p>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-primary">
                  {strain} · {note.source}
                </p>
              </SWCard>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-5 px-4 py-5 sm:gap-6 sm:px-5 sm:py-6 lg:grid-cols-[1.15fr_1fr]">
        <div className="space-y-5 sm:space-y-6">
          {forCondition && (
            <SWCard innerClassName="px-4 py-4 sm:px-5">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-primary">
                <Brain className="size-3.5" />
                Best for your condition
              </div>
              <p className="mt-2 text-base font-semibold tracking-tight">
                {forCondition.best}
              </p>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                {forCondition.why}
              </p>
              {forCondition.runnerUp && (
                <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Award className="size-3.5 text-primary" />
                  Runner-up: <span className="font-medium text-foreground">{forCondition.runnerUp}</span>
                </p>
              )}
            </SWCard>
          )}

          <BulletList
            title="Key differences"
            items={analysis.keyDifferences}
            icon={<GitCompareArrows className="size-3.5 text-primary" />}
          />
          <BulletList
            title="Where they agree"
            items={analysis.commonGround}
            icon={<CheckCircle2 className="size-3.5 text-primary" />}
          />
        </div>

        <div>
          <SWCard innerClassName="px-4 py-4 sm:px-5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-amber-600">
              <ShieldAlert className="size-3.5" />
              Cautions
            </div>
            <ul className="mt-3 space-y-2.5">
              {analysis.cautions.map((caution, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-sm leading-6 text-amber-900 dark:text-amber-100/90"
                >
                  <TriangleAlert className="mt-1 size-3.5 shrink-0 text-amber-500" />
                  <span>{caution}</span>
                </li>
              ))}
            </ul>
          </SWCard>
        </div>
      </div>

      <RedditThreadsBlock sources={analysis.redditSources ?? []} />
    </SWCard>
  );
}
