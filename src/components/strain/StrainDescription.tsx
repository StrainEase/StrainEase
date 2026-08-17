import { Sparkles } from "lucide-react";
import type {
  StrainDescription,
  StrainDescriptionSection,
} from "@/lib/strain-api";

/**
 * Three-section, patient-tailored strain description. Renders nothing
 * if `description` is missing or empty — callers should keep the
 * legacy single-paragraph fallback in that case.
 *
 * Each section gets a small uppercase eyebrow label and a prose body.
 * Spacing is tight on purpose: three short blocks read faster than one
 * wall of text and the patient can scan only the section they care
 * about.
 */
export function StrainDescriptionView({
  description,
}: {
  description: StrainDescription;
}) {
  return (
    <div className="mt-4 space-y-4" data-testid="strain-tailored-description">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
        <Sparkles className="size-3.5" />
        Tailored to your symptoms
      </div>
      {description.sections.map((section) => (
        <DescriptionSection key={section.heading} section={section} />
      ))}
    </div>
  );
}

function DescriptionSection({ section }: { section: StrainDescriptionSection }) {
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
    <div className="rounded-xl border border-border/60 bg-background px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {section.heading}
      </p>
      {paragraphs.length === 0 ? (
        <p className="mt-1.5 text-sm leading-6 text-foreground/85">
          {section.body}
        </p>
      ) : (
        paragraphs.map((paragraph, idx) => (
          <p
            key={idx}
            className={`text-sm leading-6 text-foreground/85 ${idx === 0 ? "mt-1.5" : "mt-3"}`}
          >
            {paragraph}
          </p>
        ))
      )}
    </div>
  );
}
