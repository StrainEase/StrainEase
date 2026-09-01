// Print-friendly clinician report.
//
// The page assembles a full snapshot of the patient's account locally
// (saved ailments, medications, daily check-ins, relief logs, saved
// strains, and the deterministic pattern analysis from
// `relief-insights.ts`), renders it as a structured document, and
// optionally calls the `clinicianReportSummary` AI callable to add a
// 2-3 paragraph prose section in Dr. Kaya's voice.
//
// Privacy: nothing leaves the device unless the user clicks "Generate
// Dr. Kaya summary". Even then, only the locally-built snapshot is
// sent to the AI; the report itself is rendered client-side and
// printed via `window.print()`. We never upload the PDF.

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCheckIns } from "@/hooks/use-check-ins";
import { useAilments } from "@/hooks/use-ailments";
import { useMedications } from "@/hooks/use-medications";
import { useReliefSummary } from "@/hooks/use-relief-summary";
import {
  listenToSavedStrains,
  type SavedStrain,
} from "@/lib/saved-strains";
import {
  buildClinicianReport,
  reportHeadline,
  type ClinicianReport,
} from "@/lib/clinician-report";
import {
  clinicianReportSummary,
  type ClinicianReportSummary,
} from "@/lib/strain-api";
import { StrainImage } from "@/components/strain/StrainImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AppHeader } from "@/components/home/AppHeader";
import { MeshBackground } from "@/components/theme/MeshBackground";
import { Seo } from "@/components/Seo";
import { MedicalDisclaimer } from "@/components/compliance/MedicalDisclaimer";
import { Sparkline, type SparklineSeries } from "@/components/check-ins/Sparkline";
import { documentTitle } from "@/lib/site";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { CONDITIONS } from "@/lib/strain-ui";
import {
  Activity,
  AlertTriangle,
  CalendarRange,
  ClipboardList,
  FileText,
  Loader2,
  Pill,
  Printer,
  Sparkles,
  Stethoscope,
  ThumbsUp,
  TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router";

const METRIC_LEGEND = [
  { key: "mood", label: "Mood", color: "stroke-emerald-500" },
  { key: "sleep", label: "Sleep", color: "stroke-sky-500" },
  { key: "pain", label: "Pain", color: "stroke-rose-500" },
  { key: "anxiety", label: "Anxiety", color: "stroke-amber-500" },
] as const;
type MetricKey = (typeof METRIC_LEGEND)[number]["key"];

export default function ClinicianReportPage() {
  const { user } = useAuth();
  const { names: ailments, isLoading: ailmentsLoading } = useAilments();
  const { list: medications, isLoading: medsLoading } = useMedications();
  const { checkIns, isLoading: checkInsLoading } = useCheckIns();
  const { logs: reliefLogs } = useReliefSummary();
  const [savedStrains, setSavedStrains] = useState<SavedStrain[]>([]);
  const [savedLoading, setSavedLoading] = useState(true);
  const navigate = useNavigate();

  // Live-listener for saved strains so the report reflects the latest
  // bookmarks the patient added today.
  useEffect(() => {
    if (!db || !user) {
      setSavedStrains([]);
      setSavedLoading(false);
      return;
    }
    setSavedLoading(true);
    return listenToSavedStrains(user.uid, (list) => {
      setSavedStrains(list);
      setSavedLoading(false);
    });
  }, [user?.uid]);

  const report = useMemo<ClinicianReport | null>(() => {
    if (!user) return null;
    return buildClinicianReport({
      user,
      ailments,
      medications,
      checkIns,
      reliefLogs,
      savedStrains,
    });
    // Rebuild whenever any of the upstream collections change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, user?.name, ailments, medications, checkIns, reliefLogs, savedStrains]);

  const [aiSummary, setAiSummary] = useState<ClinicianReportSummary | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  if (!user) {
    return (
      <main className="relative isolate min-h-screen overflow-x-clip bg-background pb-24 text-foreground sm:pb-0">
        <Seo title={documentTitle("Clinician report")} description="Print-friendly summary of your saved conditions, medications, check-ins, and relief logs for your clinician." path="/report" noindex />
        <MeshBackground />
        <AppHeader favorites={false} />
        <div className="mx-auto w-full max-w-3xl px-6 py-16 text-center">
          <FileText className="mx-auto size-10 text-primary" />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">
            Sign in to generate a clinician report
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The report pulls from your saved conditions, medications, and
            logged outcomes. It's never uploaded — it renders on this page
            and prints to PDF.
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
        <Seo title={documentTitle("Clinician report")} description="Print-friendly summary of your saved conditions, medications, check-ins, and relief logs for your clinician." path="/report" noindex />
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

  const isLoading =
    ailmentsLoading || medsLoading || checkInsLoading || savedLoading;
  if (isLoading || !report) {
    return (
      <main className="relative isolate min-h-screen overflow-x-clip bg-background pb-24 text-foreground sm:pb-0">
        <Seo title={documentTitle("Clinician report")} description="Print-friendly summary of your saved conditions, medications, check-ins, and relief logs for your clinician." path="/report" noindex />
        <MeshBackground />
        <AppHeader favorites={false} />
        <div className="flex justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </main>
    );
  }

  const generateSummary = async () => {
    if (aiBusy) return;
    setAiBusy(true);
    setAiError(null);
    try {
      const snapshot = serializeReportForModel(report);
      const result = await clinicianReportSummary({ snapshot });
      setAiSummary(result);
    } catch (err) {
      setAiError(
        err instanceof Error
          ? err.message
          : "We couldn't generate the Dr. Kaya summary. Print the rest of the report — it stands on its own.",
      );
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <main className="relative isolate min-h-screen overflow-x-clip bg-background pb-24 text-foreground sm:pb-0">
      <Seo title={documentTitle("Clinician report")} description="Print-friendly summary of your saved conditions, medications, check-ins, and relief logs for your clinician." path="/report" noindex />
      <MeshBackground />
      <AppHeader favorites={false} />

      {/* On-screen control bar — hidden in print via .print-root. */}
      <div className="no-print mx-auto w-full max-w-3xl px-6 py-8">
        <MedicalDisclaimer className="mb-6" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Clinician report
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              {reportHeadline(report)}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Generated on {report.patient.generatedOn}. Print or save as PDF
              from your browser — nothing is uploaded.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer rounded-full"
              onClick={() => void generateSummary()}
              disabled={aiBusy}
            >
              {aiBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {aiSummary ? "Regenerate Kaya summary" : "Generate Kaya summary"}
            </Button>
            <Button
              type="button"
              className="cursor-pointer rounded-full"
              onClick={() => window.print()}
            >
              <Printer className="size-4" />
              Print / Save as PDF
            </Button>
          </div>
        </div>

        {aiError && (
          <Alert variant="destructive" className="mt-4">
            <AlertTitle>Couldn't reach Dr. Kaya</AlertTitle>
            <AlertDescription>{aiError}</AlertDescription>
          </Alert>
        )}
        {aiSummary && (
          <Alert className="mt-4">
            <Sparkles className="size-4 text-primary" />
            <AlertTitle>Dr. Kaya summary added</AlertTitle>
            <AlertDescription>
              Added to the report. Re-print to capture the prose section.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* The actual report — print only this block. */}
      <article className="print-root mx-auto w-full max-w-3xl px-6 pb-16">
        <ReportHeader report={report} />
        <PatientFacts report={report} />
        <ConditionsSection conditions={report.conditions} />
        <MedicationsSection medications={report.medications} />
        <CheckInsSection report={report} />
        <ReliefLogsSection report={report} />
        <InsightsSection report={report} />
        <SavedStrainsSection savedStrains={report.savedStrains} />
        <KayaSummary summary={aiSummary} />

        <footer className="mt-12 border-t border-border/60 pt-4 text-[11px] leading-5 text-muted-foreground">
          This summary was generated by StrainEase from the patient's own
          account data. The Dr. Kaya section (if present) is produced by an
          AI assistant and is not a diagnosis or prescription. Always defer
          to the patient's licensed healthcare provider for treatment
          decisions.
        </footer>
      </article>
    </main>
  );
}

function ReportHeader({ report }: { report: ClinicianReport }) {
  return (
    <header className="border-b border-border/60 pb-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
        StrainEase patient summary
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">
        {reportHeadline(report)}
      </h1>
      <p className="mt-1 text-xs text-muted-foreground">
        Generated {report.patient.generatedOn} · age context:{" "}
        {report.patient.ageContext}
      </p>
    </header>
  );
}

function PatientFacts({ report }: { report: ClinicianReport }) {
  const rows: { label: string; value: string }[] = [
    { label: "Display name", value: report.patient.displayName },
    { label: "Email", value: report.patient.email ?? "— not on file —" },
    { label: "Age context", value: report.patient.ageContext },
    { label: "Report window", value: "Last 30 days (relief), last 14 days (check-ins)" },
  ];
  return (
    <Section
      title="Patient facts"
      icon={<Stethoscope className="size-4" />}
    >
      <dl className="grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="rounded-xl border border-border/60 px-4 py-3">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {row.label}
            </dt>
            <dd className="mt-1 text-sm leading-6">{row.value}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

function ConditionsSection({ conditions }: { conditions: string[] }) {
  return (
    <Section
      title="Active conditions"
      icon={<ClipboardList className="size-4" />}
    >
      {conditions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No saved conditions on file. Consider asking which symptoms the
          patient is actively treating.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {conditions.map((c) => {
            const canonical = CONDITIONS.find(
              (k) => k.toLowerCase() === c.toLowerCase(),
            );
            return (
              <li key={c}>
                <Badge variant="secondary" className="rounded-full">
                  {canonical ?? c}
                </Badge>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

function MedicationsSection({
  medications,
}: {
  medications: ClinicianReport["medications"];
}) {
  return (
    <Section title="Current medications" icon={<Pill className="size-4" />}>
      {medications.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No medications logged. Confirm any current prescriptions directly
          with the patient.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {medications.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-4 py-2.5"
            >
              <span className="text-sm font-medium">{m.name}</span>
              <span className="text-[11px] text-muted-foreground">
                added {new Date(m.addedAt).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function CheckInsSection({ report }: { report: ClinicianReport }) {
  const trend = report.checkIns.trend;
  const series: SparklineSeries[] = METRIC_LEGEND.map((m) => ({
    id: m.key,
    label: m.label,
    color: m.color,
    values: trend.days.map((d) => d[m.key as MetricKey]),
  }));
  return (
    <Section
      title={`Daily check-ins · last ${report.checkIns.window} days`}
      icon={<CalendarRange className="size-4" />}
    >
      {trend.loggedDays === 0 ? (
        <p className="text-sm text-muted-foreground">
          No check-ins logged in this window. Consider asking the patient to
          start a daily log on the dashboard.
        </p>
      ) : (
        <>
          <div className="rounded-xl border border-border/60 bg-background p-3">
            <Sparkline series={series} />
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {METRIC_LEGEND.map((m) => (
              <li
                key={m.key}
                className="rounded-xl border border-border/60 px-4 py-3"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {m.label}
                </p>
                <p className="mt-1 text-xl font-semibold tracking-tight">
                  {trend.averages
                    ? `${trend.averages[m.key as MetricKey].toFixed(1)}/5`
                    : "—"}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {trend.loggedDays} of {trend.days.length} days logged.
          </p>
          {report.checkIns.recent.length > 0 && (
            <RecentCheckIns checkIns={report.checkIns.recent} />
          )}
        </>
      )}
    </Section>
  );
}

function RecentCheckIns({ checkIns }: { checkIns: ClinicianReport["checkIns"]["recent"] }) {
  return (
    <details className="mt-3 rounded-xl border border-border/60 bg-background px-4 py-3">
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Recent check-in notes ({checkIns.length})
      </summary>
      <ul className="mt-3 space-y-2">
        {checkIns
          .filter((c) => c.note.trim() !== "")
          .map((c) => (
            <li key={c.id} className="text-sm leading-6">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {c.date}
              </p>
              <p>{c.note}</p>
            </li>
          ))}
        {checkIns.every((c) => c.note.trim() === "") && (
          <li className="text-sm text-muted-foreground">
            No notes on the recent check-ins.
          </li>
        )}
      </ul>
    </details>
  );
}

function ReliefLogsSection({ report }: { report: ClinicianReport }) {
  const { reliefLogs } = report;
  return (
    <Section
      title={`Relief logs · last ${reliefLogs.windowDays} days`}
      icon={<Activity className="size-4" />}
    >
      <p className="text-sm text-muted-foreground">
        {reliefLogs.totalInWindow === 0
          ? "No relief logs in the last 30 days."
          : `${reliefLogs.totalInWindow} ${reliefLogs.totalInWindow === 1 ? "log" : "logs"} in the last 30 days.`}
      </p>
      {reliefLogs.recent.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-xl border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">Date</th>
                <th className="px-3 py-2 font-semibold">Strain</th>
                <th className="px-3 py-2 font-semibold">Conditions</th>
                <th className="px-3 py-2 font-semibold">Fit</th>
                <th className="px-3 py-2 font-semibold">Relief</th>
              </tr>
            </thead>
            <tbody>
              {reliefLogs.recent.map((log) => (
                <tr key={log.id} className="border-t border-border/60 align-top">
                  <td className="px-3 py-2 text-[11px] text-muted-foreground">
                    {new Date(log.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 font-medium">{log.strainName}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {log.conditions.length === 0
                      ? "—"
                      : log.conditions.join(", ")}
                  </td>
                  <td className="px-3 py-2 capitalize">
                    {log.fit.replace("-", " ")}
                  </td>
                  <td className="px-3 py-2">{log.relief}/5</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

function InsightsSection({ report }: { report: ClinicianReport }) {
  const { reliefLogs } = report;
  return (
    <Section
      title="Pattern analysis (deterministic)"
      icon={<TrendingUp className="size-4" />}
    >
      {reliefLogs.topStrains.length === 0 && reliefLogs.avoid.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Not enough relief logs in the last 30 days to derive patterns
          (needs ≥ 2 logs for the same strain).
        </p>
      ) : (
        <>
          {reliefLogs.topStrains.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <ThumbsUp className="mr-1 inline size-3.5 text-emerald-600" />
                Top strains for the patient
              </p>
              <ul className="space-y-1.5">
                {reliefLogs.topStrains.map((row) => (
                  <li
                    key={`${row.condition}-${row.strain}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-4 py-2.5"
                  >
                    <span className="text-sm">
                      <span className="font-semibold">{row.strain}</span>{" "}
                      <span className="text-muted-foreground">
                        for {row.condition} · {row.logCount}× logged
                      </span>
                    </span>
                    <Badge
                      variant="secondary"
                      className="rounded-full bg-emerald-500/10 text-emerald-700"
                    >
                      {row.avgRelief.toFixed(1)}/5
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {reliefLogs.avoid.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <AlertTriangle className="mr-1 inline size-3.5 text-amber-600" />
                Marked "too strong" repeatedly
              </p>
              <ul className="space-y-1.5">
                {reliefLogs.avoid.map((row) => (
                  <li
                    key={row.strainName}
                    className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-2.5"
                  >
                    <span className="text-sm font-medium text-amber-900 dark:text-amber-300">
                      {row.strainName}
                    </span>
                    <span className="text-[11px] text-amber-800 dark:text-amber-400">
                      {row.harshCount}× of {row.totalCount} sessions
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {reliefLogs.insightsProse && (
            <p className="mt-3 rounded-xl border border-border/60 bg-background px-4 py-3 text-sm leading-6 text-muted-foreground">
              {reliefLogs.insightsProse}
            </p>
          )}
        </>
      )}
    </Section>
  );
}

function SavedStrainsSection({ savedStrains }: { savedStrains: SavedStrain[] }) {
  if (savedStrains.length === 0) return null;
  return (
    <Section
      title={`Saved strains (${savedStrains.length})`}
      icon={<ClipboardList className="size-4" />}
    >
      <ul className="space-y-1.5">
        {savedStrains.map((s) => (
          <li
            key={s.slug}
            className="flex items-center gap-3 rounded-xl border border-border/60 px-3 py-2.5"
          >
            <StrainImage
              src={s.imageUrl}
              alt=""
              className="size-8 shrink-0 rounded-lg border border-border/60"
              iconClassName="size-3"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{s.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {[s.type, s.thcRange ? `THC ${s.thcRange}` : null, `${s.notes.length} notes`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function KayaSummary({ summary }: { summary: ClinicianReportSummary | null }) {
  return (
    <Section
      title="Dr. Kaya clinical summary"
      icon={<Sparkles className="size-4" />}
    >
      {summary === null ? (
        <p className="text-sm text-muted-foreground">
          Click "Generate Kaya summary" above to add a 2-3 paragraph
          AI-written section in Dr. Kaya's voice, grounded in the
          snapshot above. The rest of the report stands on its own.
        </p>
      ) : (
        <>
          <div className="whitespace-pre-line text-sm leading-7 text-foreground">
            {summary.summary}
          </div>
          {summary.considerations.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {summary.considerations.map((c) => (
                <li
                  key={c}
                  className="flex items-start gap-2 text-sm leading-6"
                >
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Section>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </span>
        {title}
      </h2>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}

/**
 * Trim the report down to the facts Dr. Kaya needs. We don't ship the
 * per-log tables, the saved-strain list, or the check-in sparkline —
 * just the totals and rollups so the prompt stays within budget.
 */
function serializeReportForModel(report: ClinicianReport) {
  return {
    patient: {
      displayName: report.patient.displayName,
      ageContext: report.patient.ageContext,
    },
    conditions: report.conditions,
    medications: report.medications.map((m) => m.name),
    checkIns: {
      windowDays: report.checkIns.window,
      loggedDays: report.checkIns.trend.loggedDays,
      averages: report.checkIns.trend.averages,
    },
    reliefLogs: {
      windowDays: report.reliefLogs.windowDays,
      totalInWindow: report.reliefLogs.totalInWindow,
      topStrains: report.reliefLogs.topStrains,
      avoid: report.reliefLogs.avoid,
      insightsProse: report.reliefLogs.insightsProse,
    },
  };
}
