import { useAuth } from "@/hooks/use-auth";
import { useReliefSummary } from "@/hooks/use-relief-summary";
import { ReliefInsightsPanel } from "@/components/saved/ReliefInsightsPanel";
import { NotebookText } from "lucide-react";

/**
 * Insights + session-journal dialog content. Lives in the
 * header between the Favorites button and the Library link
 * (PR-W1 follow-up) so patients can read their own patterns
 * without opening the favorites modal first. Cross-platform
 * parity: iOS adds the same entry to its top toolbar and
 * Android mirrors it in the action bar (PR-i1 / PR-A1).
 *
 * `ReliefInsightsPanel` already wires its own "View all N
 * sessions" button, which opens `SessionHistoryDialog`. The
 * journal dialog is intentionally just a container — all of
 * the analysis + history lives in the existing components.
 */
export function JournalPanel() {
  const { isAuthenticated } = useAuth();
  const { logs } = useReliefSummary();

  if (!isAuthenticated) return null;

  if (logs.length === 0) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card px-8 py-12 text-center">
        <NotebookText className="mx-auto size-8 text-primary" />
        <h2 className="mt-4 text-lg font-semibold tracking-tight">
          No sessions logged yet
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Open any strain and tap "How did this go?" to record a session. Once
          you have a few, your patterns show up here.
        </p>
      </div>
    );
  }

  return <ReliefInsightsPanel logs={logs} />;
}
