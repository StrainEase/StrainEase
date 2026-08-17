import { useAgeVerification } from "@/hooks/use-age-verification";
import { cn } from "@/lib/utils";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { Link } from "react-router";

/**
 * Site-wide footer with the regulatory disclosures the app needs to keep
 * visible on every page: 21+ reminder, "keep out of reach of children",
 * research-information disclaimer, and links to the legal pages.
 */
export function ComplianceFooter({ className }: { className?: string }) {
  const { state, reset } = useAgeVerification();
  const region = state.status === "verified" ? state.region : null;

  return (
    <footer
      className={cn(
        "border-t border-border/70 bg-background/40 py-8",
        className,
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 text-xs text-muted-foreground sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-2">
            {region ? (
              <ShieldCheck className="size-3.5 text-primary" />
            ) : (
              <ShieldOff className="size-3.5 text-muted-foreground" />
            )}
            <span>
              {region
                ? `Age verified · ${region.label} (${region.minimumAge}+)`
                : "21+ only · Know your local laws"}
            </span>
          </p>
          <p className="max-w-xl">
            StrainEase is a research tool. It does not sell, ship, or dispense
            cannabis products. Information is aggregated from public sources
            and patient reports; it is not medical advice. Always consult a
            qualified clinician and follow your local laws.
          </p>
          <p className="max-w-xl">
            Keep all cannabis products out of the reach of children and pets.
            If accidentally consumed, contact Poison Control (1-800-222-1222
            in the US) or your local emergency line.
          </p>
        </div>

        <nav
          aria-label="Compliance"
          className="flex flex-col gap-2 sm:items-end"
        >
          <FooterLink to="/legal">Age & legal policy</FooterLink>
          <FooterLink to="/legal/terms">Terms of Service</FooterLink>
          <FooterLink to="/legal/privacy">Privacy Policy</FooterLink>
          <FooterLink to="/legal/medical">Medical disclaimer</FooterLink>
          {region ? (
            <button
              type="button"
              onClick={reset}
              className="text-left text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Reset age verification
            </button>
          ) : null}
        </nav>
      </div>
    </footer>
  );
}

function FooterLink({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
    >
      {children}
    </Link>
  );
}