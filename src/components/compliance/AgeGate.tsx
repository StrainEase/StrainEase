import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MeshBackground } from "@/components/theme/MeshBackground";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAgeVerification } from "@/hooks/use-age-verification";
import { REGIONS, type RegionCode as RegionCodeType } from "@/lib/age-policy";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { CalendarDays, Globe2, Leaf, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";

const REJECTION_COPY: Record<string, { title: string; body: string }> = {
  missing: {
    title: "We need your date of birth",
    body: "Please enter your full date of birth so we can confirm you're of legal age in your jurisdiction.",
  },
  invalid: {
    title: "Let's try that again",
    body: "Please re-enter a valid date in the YYYY-MM-DD format, or use the date picker.",
  },
  future: {
    title: "That date is in the future",
    body: "Please re-enter your date of birth — we can't accept a date that's still ahead of us.",
  },
  tooOld: {
    title: "That date is too far back",
    body: "Please re-enter a realistic date of birth.",
  },
  underage: {
    title: "Sorry — StrainEase is for adults only",
    body: "StrainEase provides cannabis information intended for adults of legal age in their jurisdiction. If you are under the legal age for your region, please don't continue.",
  },
  storage: {
    title: "Your browser is blocking storage",
    body: "We can't save your verification without browser storage. Enable cookies / localStorage and try again.",
  },
};

// Rejections that should re-prompt the user by clearing the date field and
// refocusing it, so they can re-enter instead of editing the bad value in
// place. Lockouts (underage) and browser-side issues (storage) are excluded.
const REPROMPT_REASONS = new Set<import("@/lib/age-policy").AgeCheckFailure>([
  "missing-birth-date",
  "invalid-birth-date",
  "birth-date-in-future",
  "birth-date-too-old",
]);

export function AgeGate({ children }: { children: ReactNode }) {
  const { state, verify, reset } = useAgeVerification();

  if (state.status === "loading") {
    return <LoadingScreen />;
  }

  if (state.status === "verified") {
    return <>{children}</>;
  }

  return (
    <Gate
      initialReason={state.status === "unverified" ? state.reason : undefined}
      onVerify={async (input) => {
        return await verify(input);
      }}
      onReset={reset}
    />
  );
}

function LoadingScreen() {
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center bg-background">
      <MeshBackground />
      <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
      <span className="sr-only">Checking age verification…</span>
    </main>
  );
}

function Gate({
  initialReason,
  onVerify,
  onReset,
}: {
  initialReason?: import("@/lib/age-policy").AgeCheckFailure;
  onVerify: (
    input: {
      region: RegionCodeType;
      birthDate: string;
      termsAccepted: boolean;
      privacyAccepted: boolean;
    },
  ) => Promise<
    | { ok: true; record: import("@/lib/age-policy").AgeVerificationRecord }
    | { ok: false; reason: import("@/lib/age-policy").AgeCheckFailure }
  >;
  onReset: () => void;
}) {
  const [region, setRegion] = useState<RegionCodeType>("US");
  const [birthDate, setBirthDate] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [rejected, setRejected] = useState<
    import("@/lib/age-policy").AgeCheckFailure | undefined
  >(initialReason);
  const [rejectedAt, setRejectedAt] = useState<number>(Date.now());
  const dateInputRef = useRef<HTMLInputElement>(null);
  // When true, the next "user edited an input" effect tick should NOT clear
  // the rejection banner — the edit was made by us to re-prompt the user.
  const suppressRejectClearRef = useRef(false);

  const minimumAge = useMemo(() => {
    const r = REGIONS.find((x) => x.code === region);
    return r?.minimumAge ?? 21;
  }, [region]);

  const regionNote = useMemo(() => {
    return REGIONS.find((x) => x.code === region)?.legalNote ?? "";
  }, [region]);

  useEffect(() => {
    if (suppressRejectClearRef.current) {
      suppressRejectClearRef.current = false;
      return;
    }
    setRejected(undefined);
  }, [region, birthDate]);

  // Re-prompt the user when a rejection was about the input value: clear the
  // date field and focus it so they can re-enter, rather than editing the
  // bad value in place.
  useEffect(() => {
    if (!rejected) return;
    if (!REPROMPT_REASONS.has(rejected)) return;
    suppressRejectClearRef.current = true;
    setBirthDate("");
    // Defer focus until React has applied the cleared value to the DOM.
    requestAnimationFrame(() => {
      dateInputRef.current?.focus();
    });
  }, [rejected, rejectedAt]);

  const canSubmit = Boolean(
    birthDate && agreedTerms && agreedPrivacy,
  );

  const [submittingForm, setSubmittingForm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingForm(true);
    try {
      const result = await onVerify({
        region,
        birthDate,
        termsAccepted: agreedTerms,
        privacyAccepted: agreedPrivacy,
      });
      if (!result.ok) {
        setRejected(result.reason);
        setRejectedAt(Date.now());
      }
    } finally {
      setSubmittingForm(false);
    }
  };

  return (
    <main className="relative isolate min-h-[100dvh] overflow-hidden bg-background">
      <MeshBackground />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
        className="relative mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col items-center justify-center px-5 py-12"
      >
        <header className="mb-8 flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium tracking-widest text-muted-foreground uppercase">
            <ShieldCheck className="size-3.5" />
            Age verification required
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Welcome to StrainEase
          </h1>
          <p className="mt-3 max-w-md text-sm text-muted-foreground sm:text-base">
            StrainEase provides cannabis research and information intended for
            adults of legal age in their jurisdiction. Please confirm your age
            before continuing.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="w-full rounded-2xl border border-border bg-card p-6 sm:p-8"
          noValidate
        >
          <fieldset className="flex flex-col gap-6">
            <Field
              icon={<Globe2 className="size-4 text-muted-foreground" />}
              label="Where are you located?"
              hint="We use this only to confirm you're of legal age in your jurisdiction."
            >
              <Select
                value={region}
                onValueChange={(v) => setRegion(v as RegionCodeType)}
              >
                <SelectTrigger
                  id="age-region"
                  aria-label="Region"
                  className="w-full"
                >
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {REGIONS.map((r) => (
                    <SelectItem key={r.code} value={r.code}>
                      <span className="flex w-full items-center justify-between gap-3">
                        <span>{r.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {r.minimumAge}+
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-2 text-xs text-muted-foreground">{regionNote}</p>
            </Field>

            <Field
              icon={<CalendarDays className="size-4 text-muted-foreground" />}
              label="What's your date of birth?"
              hint={`Must be at least ${minimumAge} for your region.`}
            >
              <Input
                id="age-birth"
                ref={dateInputRef}
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                min="1900-01-01"
                required
                className="w-auto max-w-[12.5rem] min-w-0 pr-1 text-base [&::-webkit-datetime-edit]:min-w-0 [&::-webkit-datetime-edit-fields-wrapper]:p-0 [&::-webkit-calendar-picker-indicator]:ml-1"
              />
            </Field>

            <div className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4">
              <CheckboxRow
                id="age-tos"
                checked={agreedTerms}
                onCheckedChange={(v) => setAgreedTerms(v === true)}
                label={
                  <>
                    I agree to the{" "}
                    <Link
                      to="/legal/terms"
                      target="_blank"
                      rel="noopener"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      Terms of Service
                    </Link>
                    .
                  </>
                }
              />
              <CheckboxRow
                id="age-privacy"
                checked={agreedPrivacy}
                onCheckedChange={(v) => setAgreedPrivacy(v === true)}
                label={
                  <>
                    I've read the{" "}
                    <Link
                      to="/legal/privacy"
                      target="_blank"
                      rel="noopener"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </>
                }
              />
            </div>

            {rejected && (
              <RejectionBanner reason={rejected} nonce={rejectedAt} />
            )}

            <Button
              type="submit"
              size="lg"
              className="h-12 w-full text-base font-semibold"
              disabled={!canSubmit || submittingForm}
            >
              {submittingForm ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  Verifying…
                </>
              ) : (
                <>
                  <Leaf className="size-4" />
                  I'm {minimumAge} or older — enter StrainEase
                </>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              StrainEase is a research tool. It does not sell or dispense
              cannabis. You may need to re-verify in 30 days.
            </p>
          </fieldset>
        </form>

        <p className="mt-6 max-w-md text-center text-xs text-muted-foreground">
          StrainEase is committed to keeping cannabis information out of the
          hands of minors. If you are under the legal age for your region, or
          if cannabis is illegal where you live, please don't continue. Keep
          all cannabis products out of the reach of children and pets.
        </p>
      </motion.div>
    </main>
  );
}

function Field({
  icon,
  label,
  hint,
  children,
}: {
  icon: ReactNode;
  label: string;
  hint: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <Label className="mb-2 flex items-center gap-2 text-sm font-medium">
        {icon}
        <span>{label}</span>
      </Label>
      <div className="min-w-0">{children}</div>
      <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function CheckboxRow({
  id,
  checked,
  onCheckedChange,
  label,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (v: boolean | "indeterminate") => void;
  label: ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 text-sm leading-snug"
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="mt-0.5"
      />
      <span className="text-foreground/90">{label}</span>
    </label>
  );
}

function RejectionBanner({
  reason,
  nonce,
}: {
  reason: import("@/lib/age-policy").AgeCheckFailure;
  nonce: number;
}) {
  const copy = REJECTION_COPY[mapReason(reason)] ?? REJECTION_COPY.invalid;
  return (
    <motion.div
      key={nonce}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        "border-destructive/30 bg-destructive/10 text-destructive-foreground",
      )}
      role="alert"
    >
      <p className="font-medium text-destructive">{copy?.title}</p>
      <p className="mt-1 text-xs text-destructive/90">{copy?.body}</p>
    </motion.div>
  );
}

function mapReason(
  reason: import("@/lib/age-policy").AgeCheckFailure,
): keyof typeof REJECTION_COPY {
  switch (reason) {
    case "missing-birth-date":
      return "missing";
    case "invalid-birth-date":
      return "invalid";
    case "birth-date-in-future":
      return "future";
    case "birth-date-too-old":
      return "tooOld";
    case "underage":
      return "underage";
    case "storage-unavailable":
      return "storage";
    default:
      return "storage";
  }
}
