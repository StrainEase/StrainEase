import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { listenToSavedAilments } from "@/lib/saved-ailments";

/**
 * Live list of the signed-in user's saved symptom chips
 * (`users/{uid}.ailments`).
 *
 * - `ailments` is the normalized array (trimmed, deduped, capped at
 *   the same length iOS uses).
 * - Empty when signed out, when Firebase isn't configured, or when the
 *   user hasn't saved anything yet — components should always treat
 *   the empty case as "no personalization".
 */
export function useSavedAilments(): string[] {
  const { user } = useAuth();
  const [ailments, setAilments] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      setAilments([]);
      return;
    }
    const unsub = listenToSavedAilments(user.uid, setAilments);
    return () => {
      unsub?.();
    };
  }, [user?.uid]);

  return ailments;
}
