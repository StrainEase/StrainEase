import { ComplianceFooter } from "@/components/compliance/ComplianceFooter";
import { Seo } from "@/components/Seo";
import { VerificationBadge } from "@/components/compliance/VerificationBadge";
import { Card } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";
import { Link } from "react-router";

const LAST_UPDATED = "August 17, 2026";

export default function Terms() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Seo
        title="Terms of Service — StrainEase"
        description="StrainEase's terms of service, including the age policy, medical disclaimer, and limitation of liability."
        path="/legal/terms"
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
          <span className="text-foreground">Terms of Service</span>
        </nav>
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated {LAST_UPDATED}.
          </p>
        </header>

        <div className="flex flex-col gap-6">
          <Section title="1. Acceptance">
            <p>
              By accessing StrainEase you agree to these terms. If you do not
              agree, please don't use StrainEase. StrainEase is operated as
              a research and information tool and is not a dispensary,
              pharmacy, telehealth provider, or retailer of cannabis products.
            </p>
          </Section>

          <Section title="2. Age and jurisdiction">
            <p>
              StrainEase is for adults only. The minimum age you must meet
              depends on the region you select during verification, but in no
              case is StrainEase intended for anyone under 18. We require a
              self-attestation of date of birth and jurisdiction before
              letting you view strain information. If cannabis is illegal in
              your jurisdiction, you must not use StrainEase for any
              purpose related to that jurisdiction.
            </p>
            <p>
              Verification expires after 30 days. If you share a device,
              please use the "Reset age verification" option in the footer
              between users.
            </p>
          </Section>

          <Section title="3. Not medical advice">
            <p>
              StrainEase aggregates strain descriptions, patient reports,
              and rankings from public sources including Leafly, Weedmaps,
              Reddit, Google, and dispensary menus. This information is for
              research and education only. It is not medical advice and is
              not a substitute for consultation with a licensed clinician.
              Always seek the advice of a qualified healthcare provider with
              any questions you may have regarding a medical condition,
              treatment, or medication — including medical cannabis.
            </p>
            <p>
              Do not disregard professional medical advice or delay seeking
              it because of something you have read on StrainEase.
            </p>
          </Section>

          <Section title="4. Acceptable use">
            <p>You agree not to use StrainEase to:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Provide cannabis information to anyone under the legal age
                in their jurisdiction.
              </li>
              <li>
                Facilitate the purchase, sale, or distribution of cannabis
                in any jurisdiction where that activity is illegal.
              </li>
              <li>
                Scrape, mirror, or resell StrainEase data without written
                permission.
              </li>
              <li>
                Reverse-engineer AI synthesis outputs to evade usage limits
                or impersonate other users.
              </li>
              <li>
                Submit false or misleading ailment information that could
                distort ranking output.
              </li>
            </ul>
          </Section>

          <Section title="5. Account and data">
            <p>
              StrainEase accounts are backed by Firebase Authentication
              (email/password, Google, or Apple). Your saved strains, notes,
              and ailment lists are scoped to your account and stored in
              Firestore under your UID. We don't sell your data. See our{" "}
              <Link
                to="/legal/privacy"
                className="text-primary underline-offset-4 hover:underline"
              >
                Privacy Policy
              </Link>{" "}
              for the full picture.
            </p>
          </Section>

          <Section title="6. No warranty">
            <p>
              Strain information, terpene profiles, and AI rankings on
              StrainEase are provided "as is" without warranty of any kind.
              Strain names, lineages, and effect reports are aggregated from
              third-party sources that may be incomplete or inaccurate. We
              don't guarantee that any specific strain will produce a
              specific effect for any specific person.
            </p>
          </Section>

          <Section title="7. Limitation of liability">
            <p>
              To the maximum extent permitted by law, StrainEase, its
              operators, and its contributors are not liable for any
              indirect, incidental, special, consequential, or punitive
              damages arising from your use of StrainEase, including any
              decisions you make based on information displayed in the app.
            </p>
          </Section>

          <Section title="8. Changes">
            <p>
              We may update these terms from time to time. Material changes
              will be announced through the app and reflected in the "Last
              updated" date at the top of this page. Continued use of
              StrainEase after a change means you accept the updated terms.
            </p>
          </Section>

          <Section title="9. Contact">
            <p>
              Questions about these terms can be sent to{" "}
              <a
                href="mailto:legal@strainease.ai"
                className="text-primary underline-offset-4 hover:underline"
              >
                legal@strainease.ai
              </a>
              .
            </p>
          </Section>
        </div>
      </main>
      <ComplianceFooter />
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 flex flex-col gap-3 text-sm leading-relaxed text-foreground/80 [&_a]:text-primary [&_a]:underline-offset-4 [&_a]:hover:underline [&_ul]:mt-1">
        {children}
      </div>
    </Card>
  );
}