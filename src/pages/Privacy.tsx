import { ComplianceFooter } from "@/components/compliance/ComplianceFooter";
import { Seo } from "@/components/Seo";
import { VerificationBadge } from "@/components/compliance/VerificationBadge";
import { Card } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";
import { Link } from "react-router";

const LAST_UPDATED = "August 17, 2026";

export default function Privacy() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Seo
        title="Privacy Policy — StrainEase"
        description="StrainEase's privacy policy: what we collect, what we don't, third-party services, and your rights."
        path="/legal/privacy"
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
          <span className="text-foreground">Privacy Policy</span>
        </nav>
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated {LAST_UPDATED}.
          </p>
        </header>

        <Card className="mb-6 p-6">
          <h2 className="text-base font-semibold tracking-tight">At a glance</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm leading-relaxed text-foreground/80">
            <li>
              <strong>Account data.</strong> Email and display name from
              Firebase Authentication. Google and Apple may share a verified
              email when you use those sign-in methods.
            </li>
            <li>
              <strong>Strain data.</strong> Saved strains, ailment lists, notes,
              and the research query that triggered an AI synthesis. Stored in
              Cloud Firestore, scoped to your UID.
            </li>
            <li>
              <strong>Age verification.</strong> Region code, date of birth,
              and attestation timestamps. Stored locally on your device and
              mirrored to Firestore for server-side enforcement.
            </li>
            <li>
              <strong>AI synthesis.</strong> MiniMax processes your ailment
              list and selected strains to generate rankings. We send only the
              data needed for the synthesis; we don't share your saved notes
              or account profile with the model.
            </li>
            <li>
              <strong>Analytics.</strong> We don't run third-party analytics
              or advertising trackers. Server logs are kept for 30 days for
              abuse detection.
            </li>
            <li>
              <strong>We don't sell your data.</strong> Ever.
            </li>
          </ul>
        </Card>

        <div className="flex flex-col gap-6">
          <Section title="1. Data we collect">
            <p>StrainEase collects only what it needs to work:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Authentication data:</strong> your UID, email, and
                display name from Firebase Authentication (when you sign in
                with email/password, Google, or Apple).
              </li>
              <li>
                <strong>User content:</strong> ailments you save, strains you
                bookmark, and notes you write. Stored under your UID in
                Cloud Firestore.
              </li>
              <li>
                <strong>Age verification record:</strong> region code, date of
                birth, and attestation timestamps. Used to enforce the
                18+/19+/21+ gate on the server.
              </li>
              <li>
                <strong>Search inputs:</strong> the ailments you submit and
                the strain names you look up. Used to generate AI
                rankings.
              </li>
            </ul>
          </Section>

          <Section title="2. What we do not collect">
            <p>
              StrainEase does not collect your full name, physical address,
              phone number, payment information, or government ID. We do not
              track you across other sites, and we do not place advertising
              cookies.
            </p>
          </Section>

          <Section title="3. Third-party services">
            <p>
              StrainEase relies on a small set of vendors, each of which
              processes only the data needed to perform the service:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Firebase Authentication & Cloud Functions</strong> —
                sign-in, hosting of server logic, and storage of your
                Firestore records.
              </li>
              <li>
                <strong>MiniMax</strong> — used only for AI synthesis of
                strain rankings from your submitted ailments. The model
                receives the ailment list and selected strains; it does not
                receive your UID, email, or notes.
              </li>
              <li>
                <strong>Leafly / Weedmaps / Reddit / Google</strong> — public
                sources that StrainEase scrapes on the server side. They
                receive no information from you.
              </li>
            </ul>
          </Section>

          <Section title="4. Children">
            <p>
              StrainEase is not directed at children. We do not knowingly
              collect personal information from anyone under the legal age
              for their jurisdiction. The age-verification step is designed
              to prevent that from happening in the first place. If you
              believe a child has provided data to StrainEase, please
              contact us so we can delete the record.
            </p>
          </Section>

          <Section title="5. Your rights">
            <p>
              Depending on where you live, you have some or all of the
              following rights over your data:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Access a copy of the data we hold about you.</li>
              <li>Correct inaccurate data.</li>
              <li>Delete your data ("right to be forgotten").</li>
              <li>Object to or restrict processing.</li>
              <li>Data portability.</li>
            </ul>
            <p>
              To exercise any of these rights, sign in and visit{" "}
              <strong>Account → Delete my data</strong>, or email{" "}
              <a
                href="mailto:privacy@strainease.ai"
                className="text-primary underline-offset-4 hover:underline"
              >
                privacy@strainease.ai
              </a>
              . We respond within 30 days.
            </p>
          </Section>

          <Section title="6. Region-specific rights">
            <p>
              <strong>GDPR (EEA / UK):</strong> StrainEase's data controller
              is the operator listed in the app store entry. The lawful bases
              we rely on are your consent (for the AI synthesis and age
              attestation) and our legitimate interest in keeping the
              service safe and accurate.
            </p>
            <p>
              <strong>CCPA / CPRA (California):</strong> StrainEase does not
              sell or share your personal information for cross-context
              behavioral advertising. You can request access to or deletion
              of your data via the methods above.
            </p>
            <p>
              <strong>COPPA (US under-13):</strong> StrainEase does not
              target children under 13 and does not knowingly collect
              personal information from them.
            </p>
          </Section>

          <Section title="7. Retention">
            <p>
              We keep your account data for as long as your account is
              active. If you delete your account, we remove your Firestore
              records within 30 days and your authentication record from
              Firebase. Server logs are retained for 30 days for abuse
              detection.
            </p>
          </Section>

          <Section title="8. Security">
            <p>
              All traffic is encrypted in transit (HTTPS). Firestore access
              is gated by security rules — see{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                firestore.rules
              </code>{" "}
              in the public repository. Age enforcement happens on the
              server: AI callables require a verified-age custom claim
              before responding.
            </p>
          </Section>

          <Section title="9. Changes to this policy">
            <p>
              We may update this policy. Material changes will be announced
              through the app and reflected in the "Last updated" date
              above. Continued use of StrainEase after a change means you
              accept the updated policy.
            </p>
          </Section>

          <Section title="10. Contact">
            <p>
              Questions about this policy can be sent to{" "}
              <a
                href="mailto:privacy@strainease.ai"
                className="text-primary underline-offset-4 hover:underline"
              >
                privacy@strainease.ai
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
      <div className="mt-3 flex flex-col gap-3 text-sm leading-relaxed text-foreground/80 [&_a]:text-primary [&_a]:underline-offset-4 [&_a]:hover:underline [&_ul]:mt-1 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-xs">
        {children}
      </div>
    </Card>
  );
}