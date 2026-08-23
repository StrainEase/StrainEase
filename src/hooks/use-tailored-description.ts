import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMedications } from "@/hooks/use-medications";
import { useReliefSummary } from "@/hooks/use-relief-summary";
import { useSavedAilments } from "@/hooks/use-saved-ailments";
import {
  describeStrainForUser,
  type StrainDescription,
} from "@/lib/strain-api";
import { getFeaturedTailoredDescription } from "@/lib/featured-strain-details";
import { slugify } from "@/lib/slug";
import type { StrainProfile } from "@/lib/strain-profile";

/**
 * Fetch the patient-tailored three-section description for a strain.
 *
 * - Always fires for signed-in users (including those with no saved
 *   ailments) — the backend returns a general three-section writeup
 *   when there are no ailments, so the same 3-card surface is shown
 *   to every reader.
 * - Reads the user's medications and recent relief-log summary so the
 *   model can flag interactions (caution only, never "stop your
 *   prescription") and calibrate against what has actually worked for
 *   them on similar strains.
 * - Caches per-strain-per-input-set in component state so reopening
 *   the same strain in the same session doesn't re-call the backend.
 * - Aborts on unmount and when inputs change so we never paint stale
 *   text over a fresh strain.
 */
export function useTailoredDescription(
  strain: StrainProfile | null,
): {
  description: StrainDescription | null;
  isLoading: boolean;
  error: string | null;
} {
  const { isAuthenticated } = useAuth();
  const ailments = useSavedAilments();
  const { names: medications } = useMedications();
  const { summary: reliefHistory } = useReliefSummary();
  const ailmentsKey = ailments.join("|");
  const medsKey = medications.join("|");
  const [description, setDescription] = useState<StrainDescription | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cache = useRef(new Map<string, StrainDescription>());

  useEffect(() => {
    // Reset on any input change so we don't paint stale data while a
    // new fetch is in flight.
    setDescription(null);
    setError(null);
    setIsLoading(false);
    cache.current.clear();

    if (!strain || !isAuthenticated) return;

    // Featured rail strains ship a preloaded 3-section description so we
    // can skip the MiniMax callable entirely. Mock is generic (not bound
    // to the user's ailments) — same shape the live callable returns.
    const featured = getFeaturedTailoredDescription(slugify(strain.name));
    if (featured) {
      setDescription(featured);
      return;
    }

    const key =
      `${ailmentsKey}::${medsKey}::${reliefHistory}::` +
      strain.name.trim().toLowerCase();
    const cached = cache.current.get(key);
    if (cached) {
      setDescription(cached);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    void describeStrainForUser({
      strain,
      ailments,
      medications,
      reliefHistory,
    })
      .then((result) => {
        if (cancelled) return;
        cache.current.set(key, result);
        setDescription(result);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load description.");
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    strain,
    isAuthenticated,
    ailmentsKey,
    ailments.length,
    medsKey,
    reliefHistory,
  ]);

  return { description, isLoading, error };
}
