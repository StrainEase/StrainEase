import { ComplianceFooter } from "@/components/compliance/ComplianceFooter";
import { Seo } from "@/components/Seo";
import { VerificationBadge } from "@/components/compliance/VerificationBadge";
import { Card } from "@/components/ui/card";
import { REGIONS } from "@/lib/age-policy";
import { ArrowRight, Scale, ScrollText, ShieldCheck, Stethoscope } from "lucide-react";
import { Link } from "react-router";

const LAST_UPDATED = "August 17, 2026";

export default function Legal() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Seo
        title="Legal & Age Policy — StrainEase"
        description="StrainEase's age-verification policy, medical disclaimer, terms of service, and privacy policy."
        path="/legal"
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
        <section className="mb-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium tracking-widest text-muted-foreground uppercase">
            <Scale className="size-3.5" />
            Legal & age policy
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
            How StrainEase stays compliant with age-restriction laws
          </h1>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Last updated {LAST_UPDATED}. This page is the entry point for our
            age-verification policy, medical disclaimer, terms of service,
            and privacy policy.
          </p>
        </section>

        <Card className="mb-8 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <ShieldCheck className="size-4 text-primary" />
            Age verification
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground/80">
            StrainEase is for adults only. We require every visitor to confirm
            their date of birth and jurisdiction before loading strain
            information. The minimum age we accept depends on the region the
            visitor selects:
          </p>
          <ul className="mt-4 flex flex-col gap-2 text-sm text-foreground/80">
            {REGIONS.map((r) => (
              <li
                key={r.code}
                className="flex items-start gap-3 rounded-lg border border-border/70 bg-background px-3 py-2"
              >
                <span className="mt-0.5 inline-flex h-5 w-12 items-center justify-center rounded-full border border-primary/30 bg-primary/5 text-[11px] font-semibold text-primary">
                  {r.minimumAge}+
                </span>
                <span>
                  <span className="font-medium">{r.label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {r.legalNote}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-foreground/80">
            We don't capture identity documents. The age-gate is a
            self-attestation backed by your device's local storage. If
            cannabis is illegal where you live, please don't continue.
            Verification expires after 30 days so shared devices don't stay
            signed in indefinitely.
          </p>
        </Card>

        <div className="flex flex-col gap-4">
          <DocLink
            to="/legal/terms"
            icon={ScrollText}
            title="Terms of Service"
            body="Acceptable use, account rules, no medical-advice clause, and limitation of liability."
          />
          <DocLink
            to="/legal/privacy"
            icon={ShieldCheck}
            title="Privacy Policy"
            body="What we collect, what we don't, third-party services, and your rights under GDPR / CCPA / COPPA."
          />
          <DocLink
            to="/legal/medical"
            icon={Stethoscope}
            title="Medical disclaimer"
            body="Why StrainEase information is not medical advice and how to use it as part of a clinician conversation."
          />
        </div>

        <section className="mt-10 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 text-sm">
          <h3 className="font-semibold text-amber-700 dark:text-amber-300">
            Keep cannabis out of the reach of children and pets
          </h3>
          <p className="mt-2 text-foreground/80">
            If a child accidentally ingests cannabis, contact Poison Control
            immediately at 1-800-222-1222 (US) or your local emergency line.
            Symptoms in children can include drowsiness, loss of balance, and
            breathing difficulty.
          </p>
        </section>
      </main>
      <ComplianceFooter />
    </div>
  );
}

function DocLink({
  to,
  icon: Icon,
  title,
  body,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex size-9 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <div>
          <p className="font-semibold tracking-tight">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{body}</p>
        </div>
      </div>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}