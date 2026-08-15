import { popularStrains } from "@/lib/strain-api";
import { uniqueProfiles } from "@/lib/strain-catalog";
import type { StrainProfile } from "@/lib/strain-profile";
import { useEffect, useState } from "react";

let cached: StrainProfile[] | null = null;
let inflight: Promise<StrainProfile[]> | null = null;

function loadPopular(): Promise<StrainProfile[]> {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = popularStrains()
      .then((list) => {
        cached = uniqueProfiles(list);
        return cached;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function usePopularStrains() {
  const [popular, setPopular] = useState<StrainProfile[]>(cached ?? []);
  const [isLoading, setIsLoading] = useState(cached === null);

  useEffect(() => {
    let cancelled = false;
    void loadPopular()
      .then((list) => {
        if (!cancelled) setPopular(list);
      })
      .catch(() => {
        // Catalog extras still fill the rails.
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { popular, isLoading };
}
