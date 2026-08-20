import { Loader2 } from "lucide-react";
import {
  STRAIN_HYDRATION_CAPTIONS,
  STRAIN_HYDRATION_TITLES,
  type StrainHydrationSection,
} from "@/lib/strain-profile";

/**
 * Per-section "analyzing your data" placeholder for the strain detail
 * page. Mirrors the iOS `hydratingSection(_:)` view: a small uppercase
 * eyebrow with the section title, a spinner + status caption, and the
 * shimmer text so the message reads as actively loading instead of a
 * static label. No skeleton lines — AGENTS.md bans skeleton placeholders
 * for loading states on web, so we use a spinner + caption only.
 *
 * Used by the strain page while the underlying search/profile is still
 * being hydrated, and by StrainDetailCard for any individual section
 * that is still empty when the rest of the profile is ready.
 */
export function StrainSectionHydrating({
  section,
}: {
  section: StrainHydrationSection;
}) {
  const title = STRAIN_HYDRATION_TITLES[section];
  const caption = STRAIN_HYDRATION_CAPTIONS[section];
  return (
    <section
      data-testid={`strain-hydrating-${section}`}
      aria-label={`Loading ${title}`}
      className="rounded-2xl border border-border/70 bg-card p-6"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2
          className="size-4 shrink-0 animate-spin text-primary"
          aria-hidden
        />
        <span className="shimmer-text">{caption}</span>
      </p>
    </section>
  );
}
