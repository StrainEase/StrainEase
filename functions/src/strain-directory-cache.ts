// Per-type breakdown of the Leafly directory cache. Mirrors the
// `popularListCache` document but splits the ~3,500 strain previews into
// three documents (`strainDirectory/byType/{indica,sativa,hybrid}`) so the
// web, iOS, and Android Browse rails can render every strain of a type
// without shipping the bundled `strain-directory.json` snapshot.
//
// Read paths (web client, iOS, Android) hit Firestore directly via the
// shared `strainDirectory/byType/{type}` document. The scheduled
// `warmStrainDirectory` Cloud Function is the only writer (admin SDK),
// so the documents stay in lockstep with the daily Leafly scrape.
//
// Document body shape:
//   {
//     previews: StrainPreview[],
//     fetchedAt: number,        // ms since epoch
//     totalCount: number,
//   }
//
// Firestore document size cap is 1 MiB; the ~17 indica + ~18 sativa +
// ~3,500 hybrid previews easily fit. (Indica + sativa counts are
// naturally small; hybrid dominates the Leafly catalog.)
import { getFirestore, type Transaction } from "firebase-admin/firestore";
import type { StrainPreview } from "./leafly";
import type { StrainType } from "./types";

export const STRAIN_DIRECTORY_COLLECTION = "strainDirectory";
export const STRAIN_DIRECTORY_BY_TYPE_DOC = "byType";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours, same as popularListCache

export type StrainDirectoryByTypeDoc = {
  previews: StrainPreview[];
  fetchedAt: number;
  totalCount: number;
};

/**
 * Build the per-type breakdown from the full preview list. Pure so it can
 * be unit-tested without Firestore. Strains whose `type` is missing or
 * outside the three tracked types fall into `hybrid` (the historical
 * default the Browse rails have used) and stay out of the named buckets —
 * that mirrors `mergeCatalog`'s preferringType logic on the web side.
 */
export function partitionByType(
  previews: ReadonlyArray<StrainPreview>,
): Record<StrainType, StrainPreview[]> {
  const out: Record<StrainType, StrainPreview[]> = {
    indica: [],
    sativa: [],
    hybrid: [],
  };
  for (const preview of previews) {
    const type = preview.type;
    if (type === "indica" || type === "sativa" || type === "hybrid") {
      out[type].push(preview);
    }
  }
  return out;
}

/** Read one per-type document. Returns `null` on miss, stale data, or any
 *  Firestore error — callers fall through to the bundled directory JSON. */
export async function readStrainDirectoryByType(
  type: StrainType,
): Promise<StrainDirectoryByTypeDoc | null> {
  try {
    const snap = await getFirestore()
      .collection(STRAIN_DIRECTORY_COLLECTION)
      .doc(STRAIN_DIRECTORY_BY_TYPE_DOC)
      .collection(type)
      .doc("current")
      .get();
    if (!snap.exists) return null;
    const data = snap.data() as Partial<StrainDirectoryByTypeDoc>;
    if (!Array.isArray(data.previews) || typeof data.fetchedAt !== "number") {
      return null;
    }
    if (Date.now() - data.fetchedAt > CACHE_TTL_MS) return null;
    return {
      previews: data.previews,
      fetchedAt: data.fetchedAt,
      totalCount:
        typeof data.totalCount === "number"
          ? data.totalCount
          : data.previews.length,
    };
  } catch {
    return null;
  }
}

/** Direct (non-transactional) write of one per-type document. Used by
 *  `warmStrainDirectory` after `writePopularListCache` resolves. Best-effort
 *  — a Firestore outage means the next scheduled run will refresh. */
export async function writeStrainDirectoryByType(
  type: StrainType,
  previews: StrainPreview[],
  fetchedAt: number,
): Promise<void> {
  try {
    await getFirestore()
      .collection(STRAIN_DIRECTORY_COLLECTION)
      .doc(STRAIN_DIRECTORY_BY_TYPE_DOC)
      .collection(type)
      .doc("current")
      .set(
        {
          previews,
          fetchedAt,
          totalCount: previews.length,
        },
        { merge: true },
      );
  } catch (err) {
    console.error(
      `[strain-directory-cache] Firestore write failed for ${type}:`,
      err,
    );
  }
}

/** Transactional write of one per-type document. Callers that already hold
 *  a transaction (e.g. to keep `popularListCache` + byType in lockstep)
 *  use this variant so the writes land atomically. */
export function putStrainDirectoryByType(
  tx: Transaction,
  type: StrainType,
  previews: StrainPreview[],
  fetchedAt: number,
): void {
  tx.set(
    getFirestore()
      .collection(STRAIN_DIRECTORY_COLLECTION)
      .doc(STRAIN_DIRECTORY_BY_TYPE_DOC)
      .collection(type)
      .doc("current"),
    {
      previews,
      fetchedAt,
      totalCount: previews.length,
    },
    { merge: true },
  );
}
