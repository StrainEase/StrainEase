import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  listenToReliefLogs,
  tonightHint,
  type ReliefLog,
} from "@/lib/relief-log";
import { buildReliefInsights } from "@/lib/relief-insights";

/**
 * Live summary of the signed-in user's relief logs.
 *
 * - `logs` is the raw, sorted log list (newest first).
 * - `summary` is the short prose line that gets piped into the AI prompt
 *   as `reliefSummary` so the next compare/recommend weights real outcomes.
 *   Falls back to the older `summarizeLogs` for one-off logs so a brand-new
 *   user still gets a useful sentence in the prompt.
 * - `hint` is a UI one-liner ("Last time X helped your sleep…") shown
 *   above the next search form. Null when there's nothing useful to say.
 *
 * If Firebase isn't configured or the user is signed out, everything
 * stays empty and the hook is a no-op.
 */
export function useReliefSummary() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ReliefLog[]>([]);

  useEffect(() => {
    if (!user) {
      setLogs([]);
      return;
    }
    return listenToReliefLogs(user.uid, setLogs);
  }, [user?.uid]);

  const insights = useMemo(() => buildReliefInsights(logs), [logs]);
  const summary =
    insights.proseSummary || fallbackSummary(logs);

  return {
    logs,
    summary,
    hint: tonightHint(logs),
  };
}

// Same shape as the old summarizeLogs — kept as a one-liner so a single
// log still gets a sentence in the AI prompt until the patient has enough
// data for `buildReliefInsights` to produce its own.
function fallbackSummary(logs: ReliefLog[]): string {
  if (logs.length === 0) return "";
  return logs
    .slice(0, 8)
    .map((l) => {
      const cond = l.conditions[0] ?? "general";
      return `${l.strainName} for ${cond}: ${l.fit}, relief ${l.relief}/5`;
    })
    .join("; ");
}
