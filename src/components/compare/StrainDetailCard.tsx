import type { Doc } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { typeBadgeClass, TYPE_LABEL } from "@/lib/strain-ui";
import {
  Activity,
  Award,
  Crown,
  Droplets,
  HeartPulse,
  MessageCircle,
  Quote,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

type StrainDoc = Doc<"strains">;

function IntensityBar({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-[3px]" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 w-2.5 rounded-full",
            i < value
              ? "bg-primary/80"
              : "bg-border",
          )}
        />
      ))}
    </span>
  );
}

export function StrainDetailCard({
  strain,
  badge,
}: {
  strain: StrainDoc;
  badge?: "best" | "runnerUp" | null;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5 rounded-2xl border bg-card p-6 shadow-sm",
        badge === "best"
          ? "border-primary/50 ring-1 ring-primary/20"
          : "border-border/70",
      )}
    >
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold tracking-tight">
                {strain.name}
              </h3>
              {badge === "best" && (
                <Badge className="gap-1 bg-primary text-primary-foreground">
                  <Crown className="size-3" />
                  Best fit
                </Badge>
              )}
              {badge === "runnerUp" && (
                <Badge variant="secondary" className="gap-1">
                  <Award className="size-3" />
                  Runner-up
                </Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {TYPE_LABEL[strain.type] ?? strain.type} · THC {strain.thcRange}
              {strain.cbdRange !== "<1%" ? ` · CBD ${strain.cbdRange}` : ""}
            </p>
          </div>
          <Badge className={typeBadgeClass(strain.type)}>
            {TYPE_LABEL[strain.type] ?? strain.type}
          </Badge>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {strain.description}
        </p>
      </div>

      {/* Lineage */}
      <div className="rounded-xl border border-border/60 bg-background px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Lineage
        </p>
        <p className="mt-1 text-sm">{strain.lineage}</p>
      </div>

      {/* Terpenes */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Droplets className="size-3.5 text-primary" />
          Terpenes
        </div>
        <div className="flex flex-wrap gap-1.5">
          {strain.terpenes.map((t) => (
            <span
              key={t.name}
              className="rounded-full border border-border/70 bg-secondary px-2.5 py-1 text-xs"
            >
              <span className="font-medium">{t.name}</span>
              <span className="text-muted-foreground"> · {t.profile}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Medical uses */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <HeartPulse className="size-3.5 text-primary" />
          Commonly used for
        </div>
        <div className="flex flex-wrap gap-1.5">
          {strain.medicalUses.map((use) => (
            <span
              key={use}
              className="rounded-full bg-primary/8 px-2.5 py-1 text-xs font-medium text-primary"
            >
              {use}
            </span>
          ))}
        </div>
      </div>

      {/* Effects */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Activity className="size-3.5 text-primary" />
          Reported effects
        </div>
        <div className="space-y-2">
          {strain.effects.map((effect) => (
            <div key={effect.name} className="flex items-center justify-between gap-3">
              <span className="text-sm">{effect.name}</span>
              <IntensityBar value={effect.intensity} />
            </div>
          ))}
        </div>
      </div>

      {/* Side effects */}
      {strain.sideEffects.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            Possible side effects
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            {strain.sideEffects.join(" · ")}
          </p>
        </div>
      )}

      {/* Community notes */}
      <div className="mt-auto space-y-3 border-t border-border/60 pt-4">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <MessageCircle className="size-3.5 text-primary" />
          What patients & sources say
        </div>
        {strain.communityNotes.map((note, i) => (
          <blockquote key={i} className="relative rounded-xl bg-background px-4 py-3">
            <Quote className="absolute right-3 top-3 size-3.5 text-border" />
            <p className="pr-5 text-xs leading-5 text-muted-foreground">
              {note.text}
            </p>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-primary">
              {note.source}
            </p>
          </blockquote>
        ))}
      </div>
    </div>
  );
}
