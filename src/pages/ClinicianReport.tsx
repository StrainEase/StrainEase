// Print-friendly clinician report.
//
// The page is now a thin shell around the server-side PDF generator
// (`generateClinicianReportPdf` in functions/src/index.ts). Everything
// the clinician actually reads — the snapshot, the Kaya prose, the
// layout, the brand logo — is built on the server and downloaded as
// a single PDF. This is the same path iOS and Android use, so the
// output is identical across all three clients.
//
// The on-screen UI here is just: a "generate" button, a loading
// state, and a friendly error message if the LLM call fails.

import { useCallback, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router";
import { generateClinicianReportPdf } from "@/lib/strain-api";
import { documentTitle } from "@/lib/site";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AppHeader } from "@/components/home/AppHeader";
import { MeshBackground } from "@/components/theme/MeshBackground";
import { Seo } from "@/components/Seo";
import { MedicalDisclaimer } from "@/components/compliance/MedicalDisclaimer";
import { FileText, Loader2, Sparkles, Stethoscope } from "lucide-react";
import { useCheckIns } from "@/hooks/use-check-ins";
import { useAilments } from "@/hooks/use-ailments";
import { useMedications } from "@/hooks/use-medications";
import { useReliefSummary } from "@/hooks/use-relief-summary";
import { listenToSavedStrains, type SavedStrain } from "@/lib/saved-strains";
import { useEffect } from "react";
import { toast } from "sonner";

export default function ClinicianReportPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{
    filename: string;
    byteLength: number;
    kayaIncluded: boolean;
  } | null>(null);

  // Lightweight "do we have anything to put in the report?" check so
  // the user gets a useful empty-state message instead of just a
  // generic "no data yet" PDF. We read the same collections the
  // server reads, but only count.
  const { names: ailments, isLoading: ailmentsLoading } = useAilments();
  const { list: medications, isLoading: medsLoading } = useMedications();
  const { checkIns, isLoading: checkInsLoading } = useCheckIns();
  const { logs: reliefLogs } = useReliefSummary();
  const [savedCount, setSavedCount] = useState<number | null>(null);
  useEffect(() => {
    if (!db || !user) {
      setSavedCount(0);
      return;
    }
    return listenToSavedStrains(user.uid, (list: SavedStrain[]) => {
      setSavedCount(list.length);
    });
  }, [user?.uid]);

  const isLoading =
    ailmentsLoading || medsLoading || checkInsLoading || savedCount === null;
  const totalDataPoints =
    ailments.length +
    medications.length +
    checkIns.length +
    reliefLogs.length +
    (savedCount ?? 0);

  const handleGenerate = useCallback(async () => {
    if (busy || !user) return;
    setBusy(true);
    setError(null);
    try {
      const result = await generateClinicianReportPdf();
      setLastResult({
        filename: result.filename,
        byteLength: result.byteLength,
        kayaIncluded: result.kayaIncluded,
      });
      // Trigger the download. Browsers download data: URLs reliably;
      // the object-URL form would also work but needs a revoke pass.
      const byteChars = atob(result.pdfBase64);
      const bytes = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i += 1) {
        bytes[i] = byteChars.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Give the browser a moment to start the download before
      // revoking — otherwise some browsers cancel the navigation.
      setTimeout(() => URL.revokeObjectURL(url), 5_000);
      toast.success("Clinician report downloaded");
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      const looksUndeployed =
        /Failed to load resource|404|couldn't reach|networkerror|not a valid/i.test(
          detail,
        );
      setError(
        looksUndeployed
          ? `${detail} — the generateClinicianReportPdf Cloud Function isn't deployed yet. Run \`cd functions && npm install && npm run build && firebase deploy --only functions --force\` from the repo root, then retry.`
          : detail ||
            "We couldn't generate the report. Please try again in a moment.",
      );
    } finally {
      setBusy(false);
    }
  }, [busy, user]);

  if (!user) {
    return (
      <main className="relative isolate min-h-screen overflow-x-clip bg-background pb-24 text-foreground sm:pb-0">
        <Seo
          title={documentTitle("Clinician report")}
          description="Print-friendly PDF summary of your saved conditions, medications, check-ins, and relief logs for your clinician."
          path="/report"
          noindex
        />
        <MeshBackground />
        <AppHeader favorites={false} />
        <div className="mx-auto w-full max-w-3xl px-6 py-16 text-center">
          <FileText className="mx-auto size-10 text-primary" />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">
            Sign in to generate a clinician report
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The report pulls from your saved conditions, medications, and
            logged outcomes. It's never uploaded — it renders on our
            servers and downloads as a PDF to your device.
          </p>
          <Button
            type="button"
            className="mt-6 cursor-pointer rounded-full"
            onClick={() => navigate("/auth")}
          >
            Sign in
          </Button>
        </div>
      </main>
    );
  }

  if (!isFirebaseConfigured) {
    return (
      <main className="relative isolate min-h-screen overflow-x-clip bg-background pb-24 text-foreground sm:pb-0">
        <Seo
          title={documentTitle("Clinician report")}
          description="Print-friendly PDF summary of your saved conditions, medications, check-ins, and relief logs for your clinician."
          path="/report"
          noindex
        />
        <MeshBackground />
        <AppHeader favorites={false} />
        <div className="mx-auto w-full max-w-3xl px-6 py-16 text-center">
          <FileText className="mx-auto size-10 text-primary" />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">
            Clinician report needs Firebase
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Add your VITE_FIREBASE_* keys to load saved conditions,
            medications, and relief logs.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative isolate min-h-screen overflow-x-clip bg-background pb-24 text-foreground sm:pb-0">
      <Seo
        title={documentTitle("Clinician report")}
        description="Print-friendly PDF summary of your saved conditions, medications, check-ins, and relief logs for your clinician."
        path="/report"
        noindex
      />
      <MeshBackground />
      <AppHeader favorites={false} />

      <div className="mx-auto w-full max-w-3xl px-6 py-8">
        <MedicalDisclaimer className="mb-6" />

        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Clinician report
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              {user.name?.trim() ? `${user.name.trim()}'s report` : "Your report"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              One-tap PDF — built on our servers, identical to what your
              clinician would get on iOS or Android.
            </p>
          </div>
          <Button
            type="button"
            className="cursor-pointer rounded-full"
            onClick={() => void handleGenerate()}
            disabled={busy || isLoading}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileText className="size-4" />
            )}
            {busy ? "Generating…" : "Generate PDF"}
          </Button>
        </header>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DataTile label="Conditions" value={ailments.length} loading={ailmentsLoading} />
          <DataTile label="Medications" value={medications.length} loading={medsLoading} />
          <DataTile label="Check-ins" value={checkIns.length} loading={checkInsLoading} />
          <DataTile label="Relief logs" value={reliefLogs.length} loading={false} />
        </div>

        {!isLoading && totalDataPoints === 0 && (
          <Alert className="mt-6">
            <Stethoscope className="size-4 text-primary" />
            <AlertTitle>Nothing to report yet</AlertTitle>
            <AlertDescription>
              Add some conditions, medications, or relief logs first — the
              report is only useful once there's a snapshot to summarize.
            </AlertDescription>
          </Alert>
        )}

        {busy && (
          <Alert className="mt-6">
            <Loader2 className="size-4 animate-spin text-primary" />
            <AlertTitle>Asking Dr. Kaya for a clinical summary…</AlertTitle>
            <AlertDescription>
              This usually takes 5–10 seconds — we're fetching your
              snapshot, calling the model, and rendering the PDF.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertTitle>Couldn't reach Dr. Kaya</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {lastResult && !busy && !error && (
          <Alert className="mt-6">
            <Sparkles className="size-4 text-primary" />
            <AlertTitle>Report ready</AlertTitle>
            <AlertDescription>
              Downloaded {lastResult.filename} (
              {(lastResult.byteLength / 1024).toFixed(0)} KB
              {lastResult.kayaIncluded ? ", includes Dr. Kaya's summary" : ", structured snapshot only"}
              ). Open it in Preview, Acrobat, or your browser's PDF viewer.
            </AlertDescription>
          </Alert>
        )}

        <section className="mt-10 rounded-2xl border border-border/60 p-5">
          <h2 className="text-sm font-semibold tracking-tight">
            What your clinician will see
          </h2>
          <ul className="mt-3 space-y-1.5 text-sm leading-6 text-muted-foreground">
            <li>• A branded header (StrainEase logo + your name + generated date).</li>
            <li>• Patient facts: display name, email, age context, report window.</li>
            <li>• Active conditions and current medications.</li>
            <li>• 14-day check-in trend (sparkline) + 4 metric averages.</li>
            <li>• 30-day relief log table + pattern analysis (top strains + too-strong list).</li>
            <li>• Saved strains with the actual note text you wrote.</li>
            <li>• Dr. Kaya's 2-3 paragraph clinical summary + 3-5 considerations.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}

function DataTile({
  label,
  value,
  loading,
}: {
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/60 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">
        {loading ? <Loader2 className="size-5 animate-spin text-muted-foreground" /> : value}
      </p>
    </div>
  );
}
