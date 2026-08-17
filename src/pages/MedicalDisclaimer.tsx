import { ComplianceFooter } from "@/components/compliance/ComplianceFooter";
import { Seo } from "@/components/Seo";
import { VerificationBadge } from "@/components/compliance/VerificationBadge";
import { Card } from "@/components/ui/card";
import { ShieldCheck, Stethoscope } from "lucide-react";
import { Link } from "react-router";

const LAST_UPDATED = "August 17, 2026";

export default function MedicalDisclaimer() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Seo
        title="Medical Disclaimer — StrainEase"
        description="StrainEase is a research tool. Information on the app is not medical advice and is not a substitute for consultation with a licensed clinician."
        path="/legal/medical"
      />
      <header className="border-b border-border/70 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link
            to="/"
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <ShieldCheck className="size-4 text-primary" />
            StrainEase
          </Link>
          <VerificationBadge />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12 sm:py-16">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-muted-foreground">
          <Link to="/legal" className="hover:text-foreground hover:underline">
            Legal
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">Medical disclaimer</span>
        </nav>
        <header className="mb-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium tracking-widest text-primary uppercase">
            <Stethoscope className="size-3.5" />
            Medical disclaimer
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
            Information on StrainEase is not medical advice
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated {LAST_UPDATED}.
          </p>
        </header>

        <Card className="mb-6 p-6">
          <h2 className="text-base font-semibold tracking-tight">
            What StrainEase is
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground/80">
            StrainEase is a research and information tool. It aggregates
            publicly available strain descriptions, patient reports, and
            effect notes from sources including Leafly, Weedmaps, Reddit,
            Google, and dispensary menus. It uses an AI model to rank the
            strains that patients most frequently associate with a given
            symptom.
          </p>
        </Card>

        <Card className="mb-6 p-6">
          <h2 className="text-base font-semibold tracking-tight">
            What StrainEase is not
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground/80">
            StrainEase is not a medical device, not a healthcare provider,
            and not a substitute for medical advice. StrainEase does not
            diagnose, treat, cure, or prevent any disease. StrainEase does
            not write prescriptions or dispense cannabis products.
          </p>
        </Card>

        <Card className="mb-6 p-6">
          <h2 className="text-base font-semibold tracking-tight">
            How to use this information
          </h2>
          <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-foreground/80">
            <li>
              Treat StrainEase output as one input to a conversation with a
              qualified clinician, not as a recommendation.
            </li>
            <li>
              Don't start, stop, or adjust any medication or treatment
              based solely on what StrainEase shows.
            </li>
            <li>
              If you experience severe or unexpected symptoms, contact your
              clinician or local emergency services.
            </li>
            <li>
              If you are pregnant, breastfeeding, taking other medications,
              or have a known medical condition, consult your clinician
              before using cannabis in any capacity.
            </li>
            <li>
              Verify product legality and lab-tested cannabinoid content
              with your licensed dispensary before purchasing anything.
            </li>
          </ul>
        </Card>

        <Card className="p-6">
          <h2 className="text-base font-semibold tracking-tight">
            Emergency
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground/80">
            If a child or pet accidentally ingests cannabis, contact Poison
            Control (1-800-222-1222 in the US) or your local emergency
            line. If you or someone you know is in crisis, contact the 988
            Suicide & Crisis Lifeline (call or text 988 in the US).
          </p>
        </Card>
      </main>
      <ComplianceFooter />
    </div>
  );
}