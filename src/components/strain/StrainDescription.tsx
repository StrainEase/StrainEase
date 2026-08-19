import { Sparkles } from "lucide-react";
import type {
  StrainDescription,
  StrainDescriptionSection,
} from "@/lib/strain-api";
import { AskMayaButton } from "@/components/strain/AskMayaButton";

/**
 * Three-section, patient-tailored strain description. Each section is
 * its own card with a bolded header (matching the iOS layout — no
 * "Tailored to your symptoms" outer wrapper, no nested-card-in-card).
 * A ✨ Ask Maya button sits to the right of every section header and
 * asks the AI to elaborate on that specific focus for this strain.
 *
 * Renders nothing if `description` is missing or empty — callers should
 * keep the legacy single-paragraph fallback in that case.
 */
export function StrainDescriptionView({
  description,
  strain,
  ailments,
  medications,
  reliefHistory,
  isAuthenticated,
}: {
  description: StrainDescription;
  strain: import("@/lib/strain-profile").StrainProfile;
  ailments?: string[];
  medications?: string[];
  reliefHistory?: string;
  isAuthenticated?: boolean;
}) {
  return (
    <div className="space-y-3" data-testid="strain-tailored-description">
      {description.sections.map((section) => (
        <DescriptionSection
          key={section.heading}
          section={section}
          strain={strain}
          ailments={ailments}
          medications={medications}
          reliefHistory={reliefHistory}
          isAuthenticated={isAuthenticated}
        />
      ))}
    </div>
  );
}

function DescriptionSection({
  section,
  strain,
  ailments,
  medications,
  reliefHistory,
  isAuthenticated,
}: {
  section: StrainDescriptionSection;
  strain: import("@/lib/strain-profile").StrainProfile;
  ailments?: string[];
  medications?: string[];
  reliefHistory?: string;
  isAuthenticated?: boolean;
}) {
  // Each section body is 2-4 short paragraphs separated by blank lines
  // ("\n\n"). Render them as their own <p> so the description breathes
  // on a phone instead of running together as one wall of text. If the
  // model skipped the breaks, fall back to a single paragraph so we
  // never silently drop content.
  const paragraphs = section.body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return (
    <article className="rounded-2xl border border-border/70 bg-card p-5">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-base font-semibold tracking-tight text-foreground">
          {section.heading}
        </h3>
        <AskMayaButton
          strain={strain}
          sectionHeading={section.heading}
          sectionBody={section.body}
          ailments={ailments}
          medications={medications}
          reliefHistory={reliefHistory}
          isAuthenticated={isAuthenticated}
        />
      </header>
      <div className="mt-3 space-y-3 text-sm leading-6 text-foreground/85">
        {paragraphs.length === 0 ? (
          <p>{section.body}</p>
        ) : (
          paragraphs.map((paragraph, idx) => <p key={idx}>{paragraph}</p>)
        )}
      </div>
    </article>
  );
}

// Re-export the sparkles icon so existing call sites that imported it
// from this module keep working.
export { Sparkles };
