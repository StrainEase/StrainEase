import { popularStrains } from "@/lib/strain-api";
import {
  applyCatalogPhotos,
  uniqueProfiles,
} from "@/lib/strain-catalog";
import { readPopularCache, writePopularCache } from "@/lib/strain-cache";
import type { StrainProfile } from "@/lib/strain-profile";
import { useEffect, useState } from "react";

let cached: StrainProfile[] | null = null;
let inflight: Promise<StrainProfile[]> | null = null;

/**
 * Load the popular strains list with a three-layer cache:
 *
 *   1. **Module-level in-memory** — instant within a single page session.
 *   2. **Firestore `clientCache/popularStrains`** — persists across page
 *      reloads and across devices. Any signed-in user who sees a stale
 *      cache refreshes it for everyone.
 *   3. **`popularStrains` Cloud Function** — the Leafly scrape. Only hit
 *      when both local caches miss or are stale (6 h TTL).
 *
 * On every successful API response we also write back to Firestore so the
 * next reader (on any device) skips the Leafly scrape entirely.
 */
function loadPopular(): Promise<StrainProfile[]> {
  if (cached) return Promise.resolve(cached);
  if (inflight) return inflight;

  inflight = (async () => {
    // 1) Firestore cache — public data, no auth needed to read.
    const firestoreHit = await readPopularCache();
    if (firestoreHit && firestoreHit.length > 0) {
      cached = applyCatalogPhotos(uniqueProfiles(firestoreHit));
      return cached;
    }

    // 2) Leafly scrape via Cloud Function.
    const list = await popularStrains();
    const result = applyCatalogPhotos(uniqueProfiles(list));
    cached = result;

    // 3) Write back to Firestore so the next reader skips the scrape.
    void writePopularCache(result);

    return result;
  })().finally(() => {
    inflight = null;
  });

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
