/**
 * Client-side Firestore cache for the popular-strains list. Sits in front of
 * the `popularStrains` Cloud Function so repeat visits (and both the Home
 * rails and the Browse grid) load instantly from Firestore instead of
 * re-scraping Leafly every time.
 *
 * The cached document lives at `clientCache/popularStrains` and is readable
 * by anyone (public data). Only authenticated clients write to it — the
 * first signed-in user to see a stale cache refreshes it for everyone.
 *
 * TTL: 6 hours on the client. After that the next reader triggers a fresh
 * API call and overwrites the document.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  serverTimestamp,
  where,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { StrainProfile } from "./strain-profile";

const COLLECTION = "clientCache";
const DOC_ID = "popularStrains";
const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

type CachedDoc = {
  strains: StrainProfile[];
  updatedAt: Timestamp;
};

/**
 * Read the cached popular strains from Firestore. Returns `null` on
 * cache miss, stale data, or any Firestore error. Callers should
 * treat a null return as "go fetch from the API".
 */
export async function readPopularCache(): Promise<StrainProfile[] | null> {
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, COLLECTION, DOC_ID));
    if (!snap.exists()) return null;
    const data = snap.data() as CachedDoc;
    if (!Array.isArray(data.strains) || data.strains.length === 0) return null;
    // Check freshness — serverTimestamp gives a Firestore Timestamp.
    const updatedAt =
      data.updatedAt instanceof Date
        ? data.updatedAt.getTime()
        : typeof data.updatedAt?.toMillis === "function"
          ? data.updatedAt.toMillis()
          : 0;
    if (updatedAt === 0 || Date.now() - updatedAt > TTL_MS) return null;
    return data.strains;
  } catch {
    // Firestore unavailable or permission denied — fall through to API.
    return null;
  }
}

/**
 * Write the popular strains list to Firestore so subsequent readers
 * (on any device) hit the cache. Best-effort — a write failure is
 * silently ignored; the in-memory cache and API still work.
 */
export async function writePopularCache(
  strains: StrainProfile[],
): Promise<void> {
  if (!db || strains.length === 0) return;
  try {
    await setDoc(doc(db, COLLECTION, DOC_ID), {
      strains,
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Quota, permissions, or offline — the caller still has the data
    // in memory; next visit will retry.
  }
}

/* ── Individual strain profile cache (strainCache/{slug}) ────────── */

const STRAIN_CACHE_COLLECTION = "strainCache";
const STRAIN_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Read a single strain profile from the server-side `strainCache`
 * collection. The Cloud Functions admin SDK writes these when scraping
 * Leafly / Weedmaps; the Firestore rules now allow public read.
 *
 * Returns `null` on miss, stale data, or any Firestore error.
 */
export async function readStrainCache(
  slug: string,
): Promise<StrainProfile | null> {
  if (!db || !slug) return null;
  try {
    const snap = await getDoc(doc(db, STRAIN_CACHE_COLLECTION, slug));
    if (!snap.exists()) return null;
    const data = snap.data() as {
      profile?: StrainProfile;
      fetchedAt?: number;
    };
    if (!data.profile || typeof data.fetchedAt !== "number") return null;
    if (Date.now() - data.fetchedAt > STRAIN_CACHE_TTL_MS) return null;
    return data.profile;
  } catch {
    return null;
  }
}

/**
 * Read multiple strain profiles from `strainCache` in a single batch.
 * Returns a Map of slug → StrainProfile for all cache hits. Useful for
 * hydrating the browse grid with full profiles (medicalUses, terpenes,
 * lineage, etc.) without per-strain round-trips.
 */
export async function readStrainCacheBatch(
  slugs: string[],
): Promise<Map<string, StrainProfile>> {
  if (!db || slugs.length === 0) return new Map();
  const result = new Map<string, StrainProfile>();
  // Firestore `in` queries support up to 30 items per call.
  const batches: string[][] = [];
  for (let i = 0; i < slugs.length; i += 30) {
    batches.push(slugs.slice(i, i + 30));
  }
  try {
    for (const batch of batches) {
      const q = query(
        collection(db, STRAIN_CACHE_COLLECTION),
        where("__name__", "in", batch),
      );
      const snap = await getDocs(q);
      for (const docSnap of snap.docs) {
        const data = docSnap.data() as {
          profile?: StrainProfile;
          fetchedAt?: number;
        };
        if (
          data.profile &&
          typeof data.fetchedAt === "number" &&
          Date.now() - data.fetchedAt <= STRAIN_CACHE_TTL_MS
        ) {
          result.set(docSnap.id, data.profile);
        }
      }
    }
  } catch {
    // Partial results are fine — callers merge what they get.
  }
  return result;
}
