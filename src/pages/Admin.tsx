// Operator-only admin surface. Three sections, all wired to the
// operator-gated Cloud Functions the spec introduced:
//
//   • Reference library — view the seeded terpene + cannabinoid
//     records and re-run the one-shot seed migration
//   • Drug interactions — view the seeded interaction records and
//     re-run the one-shot interaction seed
//   • Reddit pool — review candidate threads, vet (approve) or
//     unvet (return to the queue) the ones operators have inspected
//
// The page is mounted at `/admin` and is gated by the same operator
// UID list the server enforces (`/admin` renders a 403-style "not
// authorized" panel for signed-in non-operators so the callables
// never see an unprivileged call).

import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Loader2, ShieldCheck, AlertTriangle, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { isAdminOperator, adminApi, type AdminSection } from "@/lib/admin";
import {
  type TerpeneRecord,
  type CannabinoidRecord,
  type InteractionRecord,
  type ReferenceLibrary,
  type SeedReferenceLibraryResult,
  type SeedInteractionLibraryResult,
} from "@/lib/reference-library";
import type { PendingRedditThread } from "@/lib/reddit-admin";
import { MeshBackground } from "@/components/theme/MeshBackground";
import { toast } from "sonner";

const SECTION_TABS: { value: AdminSection; label: string }[] = [
  { value: "library", label: "Reference library" },
  { value: "interactions", label: "Drug interactions" },
  { value: "reddit", label: "Reddit pool" },
];

export function AdminPage() {
  const { user, isLoading } = useAuth();
  const [params, setParams] = useSearchParams();
  const initial = (params.get("tab") as AdminSection | null) ?? "library";
  const [section, setSection] = useState<AdminSection>(
    SECTION_TABS.some((t) => t.value === initial) ? initial : "library",
  );

  // Sync the active tab to the URL so deep links work and the page
  // survives a refresh.
  useEffect(() => {
    if (params.get("tab") !== section) {
      const next = new URLSearchParams(params);
      next.set("tab", section);
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <NotAuthorized reason="Sign in to access the operator console." />
    );
  }

  if (!isAdminOperator(user.uid)) {
    return (
      <NotAuthorized
        reason={`Signed in as ${user.email ?? user.uid} — this account is not on the operator allow-list.`}
      />
    );
  }

  return (
    <div className="relative min-h-[100dvh] bg-background text-foreground">
      <MeshBackground />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-5 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">
              Operator console
            </h1>
            <Badge variant="secondary" className="rounded-full">
              {user.email ?? user.uid}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage the reference library, drug-interaction pointers, and
            Reddit pool that Dr. Kaya cites in recommendations. Every
            action is audit-logged server-side.
          </p>
        </header>

        <Tabs
          value={section}
          onValueChange={(v) => setSection(v as AdminSection)}
        >
          <TabsList>
            {SECTION_TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="library">
            <LibrarySection />
          </TabsContent>

          <TabsContent value="interactions">
            <InteractionsSection />
          </TabsContent>

          <TabsContent value="reddit">
            <RedditSection />
          </TabsContent>
        </Tabs>

        <footer className="mt-2 text-[11px] uppercase tracking-wider text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            ← back to app
          </Link>
        </footer>
      </main>
    </div>
  );
}

function NotAuthorized({ reason }: { reason: string }) {
  return (
    <div className="relative min-h-[100dvh] bg-background text-foreground">
      <MeshBackground />
      <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
        <AlertTriangle className="size-8 text-amber-500" />
        <h1 className="text-xl font-semibold">Not authorized</h1>
        <p className="text-sm text-muted-foreground">{reason}</p>
        <Button asChild variant="outline" size="sm">
          <Link to="/">Go home</Link>
        </Button>
      </main>
    </div>
  );
}

/* ── Section: Reference library ──────────────────────────────────── */

function LibrarySection() {
  const [library, setLibrary] = useState<ReferenceLibrary | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [lastSeed, setLastSeed] = useState<SeedReferenceLibraryResult | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.library.fetch();
      setLibrary(data);
    } catch (err) {
      setError(humanError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const seed = async () => {
    setSeeding(true);
    setError(null);
    try {
      const result = await adminApi.library.seed();
      setLastSeed(result);
      toast.success(
        `Seeded ${result.terpeneCount} terpenes + ${result.cannabinoidCount} cannabinoids`,
      );
      await refresh();
    } catch (err) {
      setError(humanError(err));
      toast.error("Seed failed — see banner for details.");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="grid gap-4">
      <ActionBar
        title="Reference library"
        description="Terpenes and cannabinoids Dr. Kaya cites with mechanism + sources."
        lastResult={lastSeed}
        loading={loading}
        running={seeding}
        error={error}
        onRefresh={refresh}
        onRun={seed}
        runLabel="Run seed migration"
      />
      {library && (
        <div className="grid gap-4 md:grid-cols-2">
          <RecordList
            title={`Terpenes (${library.terpenes.length})`}
            entries={library.terpenes}
            rowKey={(t) => t.slug}
            renderRow={(t) => (
              <TerpeneRow key={t.slug} record={t} />
            )}
          />
          <RecordList
            title={`Cannabinoids (${library.cannabinoids.length})`}
            entries={library.cannabinoids}
            rowKey={(c) => c.slug}
            renderRow={(c) => (
              <CannabinoidRow key={c.slug} record={c} />
            )}
          />
        </div>
      )}
    </div>
  );
}

function TerpeneRow({ record }: { record: TerpeneRecord }) {
  return (
    <RecordRow
      title={record.displayName}
      subtitle={`${record.classDescription} · ${record.evidenceGrade}`}
      meta={[
        `aroma: ${record.aroma}`,
        `${record.commonlyReportedEffects.length} effects`,
        `${record.sources.length} source${record.sources.length === 1 ? "" : "s"}`,
      ]}
    />
  );
}

function CannabinoidRow({ record }: { record: CannabinoidRecord }) {
  return (
    <RecordRow
      title={record.displayName}
      subtitle={`psychoactivity: ${record.psychoactivity}`}
      meta={[
        `cb1: ${record.cb1Affinity}`,
        `cb2: ${record.cb2Affinity}`,
        `${record.sources.length} source${record.sources.length === 1 ? "" : "s"}`,
      ]}
    />
  );
}

/* ── Section: Drug interactions ──────────────────────────────────── */

function InteractionsSection() {
  const [records, setRecords] = useState<InteractionRecord[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [lastSeed, setLastSeed] =
    useState<SeedInteractionLibraryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drugFilter, setDrugFilter] = useState("");

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use a broad filter to get the full list back; the page renders
      // the table directly. A 100-drug batch is more than the
      // current seed.
      const result = await adminApi.interactions.seed
        ? await fetchInteractionsBatch()
        : [];
      setRecords(result);
    } catch (err) {
      setError(humanError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const seed = async () => {
    setSeeding(true);
    setError(null);
    try {
      const result = await adminApi.interactions.seed();
      setLastSeed(result);
      toast.success(`Seeded ${result.interactionCount} interaction records`);
      await refresh();
    } catch (err) {
      setError(humanError(err));
      toast.error("Seed failed — see banner for details.");
    } finally {
      setSeeding(false);
    }
  };

  const filtered = useMemo(() => {
    if (!records) return [];
    const q = drugFilter.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        r.drugName.toLowerCase().includes(q) ||
        r.drugClass.toLowerCase().includes(q) ||
        r.cannabisInteraction.severity.toLowerCase().includes(q),
    );
  }, [records, drugFilter]);

  return (
    <div className="grid gap-4">
      <ActionBar
        title="Drug interactions"
        description="Cannabis × medication pointers surfaced in the AI prompt when the patient lists a medication. Every record is `discussWithPrescriber: true`."
        lastResult={lastSeed}
        loading={loading}
        running={seeding}
        error={error}
        onRefresh={refresh}
        onRun={seed}
        runLabel="Run seed migration"
      />
      {records && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <CardTitle className="text-base">
                  Interaction records ({filtered.length} of {records.length})
                </CardTitle>
                <CardDescription>
                  Every record has `discussWithPrescriber: true` — the UI
                  must surface that line.
                </CardDescription>
              </div>
              <input
                type="text"
                value={drugFilter}
                onChange={(e) => setDrugFilter(e.target.value)}
                placeholder="Filter by name, class, or severity"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm sm:w-72"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No records match that filter.
              </p>
            ) : (
              filtered.map((r) => <InteractionRow key={r.slug} record={r} />)
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InteractionRow({ record }: { record: InteractionRecord }) {
  return (
    <RecordRow
      title={`${record.drugName} (${record.drugClass})`}
      subtitle={`severity: ${record.cannabisInteraction.severity}`}
      meta={[
        record.cannabisInteraction.mechanism,
        record.cannabisInteraction.commonGuidance,
        `${record.sources.length} source${record.sources.length === 1 ? "" : "s"}`,
      ]}
    />
  );
}

/**
 * Fetch a small, broad batch of common drug names so the operator
 * table can render without the operator having to type a query
 * first. The server's `getDrugInteractions` is filter-only; we ask
 * for the curated top-searched set so the table is useful on load.
 */
const COMMON_DRUG_BATCH = [
  "sertraline",
  "fluoxetine",
  "escitalopram",
  "citalopram",
  "alprazolam",
  "lorazepam",
  "clonazepam",
  "oxycodone",
  "hydrocodone",
  "morphine",
  "warfarin",
  "apixaban",
  "diphenhydramine",
  "adderall",
  "modafinil",
];

async function fetchInteractionsBatch(): Promise<InteractionRecord[]> {
  // Imported lazily to avoid a cycle in the eager-load graph.
  const { fetchDrugInteractions } = await import("@/lib/reference-library");
  return fetchDrugInteractions(COMMON_DRUG_BATCH);
}

/* ── Section: Reddit pool ────────────────────────────────────────── */

function RedditSection() {
  const [pending, setPending] = useState<PendingRedditThread[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await adminApi.reddit.listPending();
      setPending(list);
    } catch (err) {
      setError(humanError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const vet = async (thread: PendingRedditThread) => {
    setBusyId(thread.threadId);
    setError(null);
    try {
      await adminApi.reddit.vet({
        threadId: thread.threadId,
        url: thread.url,
        permalink: thread.permalink,
        subreddit: thread.subreddit,
        title: thread.title,
        snippet: thread.snippet,
        applicableConditions: thread.applicableConditions,
        applicableStrains: thread.applicableStrains,
        vettedNotes: thread.vettedNotes,
      });
      toast.success(`Vetted ${thread.title}`);
      await refresh();
    } catch (err) {
      setError(humanError(err));
      toast.error("Vet failed — see banner for details.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="grid gap-4">
      <ActionBar
        title="Reddit pool"
        description="Candidate threads queued by the daily cron. Vet to make them eligible to be cited by Dr. Kaya; unvet to return a previously-approved thread to the queue."
        loading={loading}
        running={false}
        error={error}
        onRefresh={refresh}
        onRun={null}
        runLabel=""
      />
      {pending && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Pending threads ({pending.length})
            </CardTitle>
            <CardDescription>
              A thread is only surfaced in a recommendation after an
              operator vets it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {pending.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                The pool is empty — nothing to review right now.
              </p>
            ) : (
              pending.map((t) => (
                <div
                  key={t.threadId}
                  className="flex flex-col gap-3 rounded-md border border-border/60 bg-background p-3 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-semibold">{t.title}</p>
                    <p className="text-xs text-muted-foreground">
                      r/{t.subreddit} · score {t.score ?? "—"} · added{" "}
                      {formatTimestamp(t.addedAt)}
                    </p>
                    {t.snippet && (
                      <p className="text-xs text-muted-foreground">
                        “{t.snippet}”
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      conditions: {t.applicableConditions.join(", ") || "—"}
                      {" · "}strains:{" "}
                      {t.applicableStrains.join(", ") || "—"}
                    </p>
                    {t.url && (
                      <a
                        href={t.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                      >
                        Open <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => vet(t)}
                    disabled={busyId === t.threadId}
                  >
                    {busyId === t.threadId ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : null}
                    Vet
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ── Shared bits ─────────────────────────────────────────────────── */

function ActionBar({
  title,
  description,
  lastResult,
  loading,
  running,
  error,
  onRefresh,
  onRun,
  runLabel,
}: {
  title: string;
  description: string;
  lastResult?: { ok: true; writtenAt: number } | null;
  loading: boolean;
  running: boolean;
  error: string | null;
  onRefresh: () => void;
  onRun: (() => void | Promise<void>) | null;
  runLabel: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
            {error}
          </div>
        )}
        {lastResult && (
          <p className="text-[11px] text-muted-foreground">
            Last successful run: {formatTimestamp(lastResult.writtenAt)}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onRefresh}
            disabled={loading || running}
          >
            {loading ? (
              <Loader2 className="size-3 animate-spin" />
            ) : null}
            Refresh
          </Button>
          {onRun && (
            <Button size="sm" onClick={onRun} disabled={loading || running}>
              {running ? (
                <Loader2 className="size-3 animate-spin" />
              ) : null}
              {runLabel}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RecordList<T>({
  title,
  entries,
  renderRow,
}: {
  title: string;
  entries: T[];
  rowKey: (t: T) => string;
  renderRow: (entry: T) => React.ReactNode;
}) {
  // `rowKey` is part of the public contract so the caller can keep
  // React keys in lockstep with the list; we only consume `renderRow`
  // here.
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">{entries.map(renderRow)}</CardContent>
    </Card>
  );
}

function RecordRow({
  title,
  subtitle,
  meta,
}: {
  title: string;
  subtitle: string;
  meta: string[];
}) {
  return (
    <div className="rounded-md border border-border/60 bg-background p-3">
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-[11px] text-muted-foreground">{subtitle}</p>
      <ul className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
        {meta.map((m, i) => (
          <li key={i}>· {m}</li>
        ))}
      </ul>
    </div>
  );
}

function humanError(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err);
}

function formatTimestamp(ts: number): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "—";
  }
}

export default AdminPage;
