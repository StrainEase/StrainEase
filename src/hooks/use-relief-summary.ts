import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  listenToReliefLogs,
  summarizeLogs,
  tonightHint,
  type ReliefLog,
} from "@/lib/relief-log";

/**
 * Live summary of the signed-in user's relief logs.
 *
 * - `logs` is the raw, sorted log list (newest first).
 * - `summary` is the short prose line that gets piped into the AI prompt
 *   as `reliefSummary` so the next compare/recommend weights real outcomes.
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

  return {
    logs,
    summary: summarizeLogs(logs),
    hint: tonightHint(logs),
  };
}
