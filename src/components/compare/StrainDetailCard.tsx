import { CommunityVoices } from "@/components/compare/CommunityVoices";
import { StrainImage } from "@/components/strain/StrainImage";
import { StrainDescriptionView } from "@/components/strain/StrainDescription";
import { StrainSectionHydrating } from "@/components/strain/StrainSectionHydrating";
import { TailoredDescriptionLoading } from "@/components/strain/TailoredDescriptionLoading";
import { useTailoredDescription } from "@/hooks/use-tailored-description";
import { useSavedAilments } from "@/hooks/use-saved-ailments";
import type { StrainProfile } from "@/lib/strain-profile";
import { Badge } from "@/components/ui/badge";
import { ReliefLogButton } from "@/components/saved/ReliefLogButton";
import { SaveStrainButton } from "@/components/saved/SaveStrainButton";
import { StrainNoteIndicator } from "@/components/saved/StrainNoteIndicator";
import { typeBadgeClass, TYPE_LABEL } from "@/lib/strain-ui";
import {
  listenToPublicNotes,
  slugify,
  type PublicNote,
} from "@/lib/saved-strains";
import { db } from "@/lib/firebase";
import {
  Activity,
  Award,
  Crown,
  Droplets,
  HeartPulse,
  Loader2,
  MessageCircle,
  Search,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Link } from "react-router";

function IntensityBar({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-[3px]" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 w-2.5 rounded-full",
            i < value ? "bg-primary/80" : "bg-border",
          )}
        />
      ))}
    </span>
  );
}

/**
 * Strain detail card with iOS-parity loading states. Mirrors the iOS
 * `StrainDetailView` flow:
 *
 *  1. The card renders immediately with whatever data is on the
 *     `strain` prop (typically a catalog stub with name + image only).
 *  2. Sections that the stub doesn't have yet — description, lineage,
 *     terpenes, effects, common uses, side effects, community quotes —
 *     each render an `StrainSectionHydrating` card with the same caption
 *     the iOS app shows while it hydrates that section.
 *  3. When the live profile arrives, the empty sections swap in real
 *     content and the loading cards disappear.
 *  4. If the user has saved ailments, the description section then
 *     swaps to `TailoredDescriptionLoading` (rotating messages) while
 *     the patient-tailored write-up is in flight, then to
 *     `StrainDescriptionView` once it lands.
 *
 * `isHydrating` is the parent page's signal that the live profile is
 * still on the wire. The card treats the absence of a field as
 * "pending" only while hydrating, so a strain that simply lacks a
 * field (e.g. no documented lineage) doesn't render a loading card
 * forever after the live profile arrives.
 */
export function StrainDetailCard({
  strain,
  badge,
  conditions = [],
  headingLevel = "h3",
  isHydrating = false,
}: {
  strain: StrainProfile;
  badge?: "best" | "runnerUp" | null;
  conditions?: string[];
  headingLevel?: "h1" | "h3";
  isHydrating?: boolean;
}) {
  const Heading = headingLevel;
  const [patientNotes, setPatientNotes] = useState<PublicNote[]>([]);
  const ailments = useSavedAilments();
  const { description: tailored, isLoading: isLoadingTailored } =
    useTailoredDescription(strain);

  useEffect(() => {
    if (!db) {
      setPatientNotes([]);
      return;
    }
    return listenToPublicNotes(slugify(strain.name), setPatientNotes);
  }, [strain.name]);

  const subtitle = [
    strain.type ? (TYPE_LABEL[strain.type] ?? strain.type) : null,
    strain.thcRange ? `THC ${strain.thcRange}` : null,
    strain.thcRange && strain.cbdRange && strain.cbdRange !== "<1%"
      ? `CBD ${strain.cbdRange}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // Tailored description only fires when the user has saved ailments,
  // matching the iOS `shouldFetchTailored` gate. Without ailments, the
  // static `strain.description` is the better surface and we skip the
  // loading affordance entirely.
  const canTailor = ailments.length > 0;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-5 rounded-2xl border p-6",
        strain.imageUrl ? "bg-white" : "bg-card",
        badge === "best"
          ? "border-primary/50 ring-1 ring-primary/20"
          : "border-border/70",
      )}
    >
      {/* Header */}
      <div>
        {strain.imageUrl && (
          <StrainImage
            src={strain.imageUrl}
            alt={`${strain.name} flower`}
            className="mb-4 h-72 w-full rounded-xl border border-border/70"
          />
        )}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Heading className="flex items-center gap-1.5 text-lg font-semibold tracking-tight">
                <Link
                  to={`/strain/${slugify(strain.name)}`}
                  className="hover:text-primary"
                >
                  {strain.name}
                </Link>
                <StrainNoteIndicator strainName={strain.name} />
              </Heading>
              {!strain.inKnowledgeBase && (
                <Badge
                  variant="outline"
                  className="gap-1 border-primary/30 text-primary"
                >
                  <Sparkles className="size-3" />
                  AI researched
                </Badge>
              )}
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
            {subtitle && (
              <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <SaveStrainButton profile={strain} />
            <ReliefLogButton strainName={strain.name} conditions={conditions} />
            {strain.type && (
              <Badge className={typeBadgeClass(strain.type)}>
                {TYPE_LABEL[strain.type] ?? strain.type}
              </Badge>
            )}
          </div>
        </div>

        {!strain.inKnowledgeBase && (
          <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3">
            <Search className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="text-xs leading-5 text-muted-foreground">
              Not listed on Leafly or Weedmaps — this profile is researched by
              the AI from public sources. Reddit quotes appear below when
              patients mention your symptoms.
            </p>
          </div>
        )}

        {tailored ? (
          <StrainDescriptionView description={tailored} />
        ) : isLoadingTailored && canTailor ? (
          <TailoredDescriptionLoading />
        ) : strain.description ? (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {strain.description}
          </p>
        ) : isHydrating ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2
              className="size-3.5 shrink-0 animate-spin text-primary"
              aria-hidden
            />
            <span className="shimmer-text">Researching this strain…</span>
          </p>
        ) : null}
      </div>

      {/* Lineage */}
      {strain.lineage ? (
        <div className="rounded-xl border border-border/60 bg-background px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Lineage
          </p>
          <p className="mt-1 text-sm">{strain.lineage}</p>
        </div>
      ) : isHydrating ? (
        <StrainSectionHydrating section="lineage" />
      ) : null}

      {/* Terpenes */}
      {strain.terpenes && strain.terpenes.length > 0 ? (
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
      ) : isHydrating ? (
        <StrainSectionHydrating section="terpenes" />
      ) : null}

      {/* Medical uses */}
      {strain.medicalUses && strain.medicalUses.length > 0 ? (
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
      ) : isHydrating ? (
        <StrainSectionHydrating section="uses" />
      ) : null}

      {/* Effects */}
      {strain.effects && strain.effects.length > 0 ? (
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Activity className="size-3.5 text-primary" />
            Reported effects
          </div>
          <div className="space-y-2">
            {strain.effects.map((effect) => (
              <div
                key={effect.name}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-sm">{effect.name}</span>
                <IntensityBar value={effect.intensity} />
              </div>
            ))}
          </div>
        </div>
      ) : isHydrating ? (
        <StrainSectionHydrating section="effects" />
      ) : null}

      {/* Side effects */}
      {strain.sideEffects && strain.sideEffects.length > 0 ? (
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            Possible side effects
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            {strain.sideEffects.join(" · ")}
          </p>
        </div>
      ) : isHydrating ? (
        <StrainSectionHydrating section="sideEffects" />
      ) : null}

      {/* Patient community notes (public notes saved by other users) */}
      {patientNotes.length > 0 ? (
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <MessageCircle className="size-3.5 text-primary" />
            Patient community notes
          </div>
          <div className="space-y-2.5">
            {patientNotes.map((note) => (
              <blockquote
                key={note.id}
                className="rounded-xl bg-background px-4 py-3"
              >
                <p className="text-xs leading-5 text-muted-foreground">
                  {note.note}
                </p>
                <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                  {note.authorName}
                </p>
              </blockquote>
            ))}
          </div>
        </div>
      ) : isHydrating ? (
        <StrainSectionHydrating section="community" />
      ) : null}

      <CommunityVoices
        notes={strain.communityNotes}
        strainName={strain.name}
        conditions={conditions}
        leaflyRating={strain.leaflyRating}
        leaflyReviewCount={strain.leaflyReviewCount}
      />
    </div>
  );
}
