/**
 * Single source of truth for the compare-from-search selection on web.
 *
 * The compare selection is persisted in the URL as `?strains=NAME1,NAME2`
 * (comma-separated, URL-encoded). This hook reads/writes that single
 * param via react-router's `useSearchParams`, so the selection survives
 * reloads, back/forward navigation, and deep links — and every Dashboard
 * tab reads from the same source.
 *
 * Selection rules (shared with iOS):
 * - Cap at {@link CAP} strains (matches the `compareStrains` Cloud Function).
 * - Case-insensitive dedup; first occurrence's casing wins.
 * - Empty selection drops the URL param entirely.
 *
 * The pure helpers {@link parseStrains}, {@link serializeStrains}, and
 * {@link dedupeAndCap} are exported so unit tests can exercise the URL
 * round-trip and dedup/cap rules without React.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";

/** Hard cap shared with the iOS store and the `compareStrains` function. */
export const CAP = 3;

const STRAINS_PARAM = "strains";
export const COMPARE_STORAGE_KEY = "strainease:compare.v1";
const COMPARE_EVENT = "strainease:compare-change";

export function readStoredStrains(): string[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    return parseStrains(sessionStorage.getItem(COMPARE_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function writeStoredStrains(names: readonly string[]): string[] {
  const next = dedupeAndCap(names);
  if (typeof sessionStorage !== "undefined") {
    try {
      if (next.length === 0) sessionStorage.removeItem(COMPARE_STORAGE_KEY);
      else sessionStorage.setItem(COMPARE_STORAGE_KEY, serializeStrains(next));
    } catch {
      // quota / private mode
    }
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(COMPARE_EVENT));
  }
  return next;
}

/**
 * Parse a raw `?strains=` value (decoded by `URLSearchParams.get`) into
 * the deduped, capped array the rest of the app sees. Case-insensitive
 * dedup keeps the first occurrence's casing. Empty/whitespace entries
 * are dropped.
 */
export function parseStrains(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const parts = raw.split(",").map((s) => s.trim()).filter((s) => s !== "");
  const deduped: string[] = [];
  for (const part of parts) {
    if (!deduped.some((existing) => existing.toLowerCase() === part.toLowerCase())) {
      deduped.push(part);
    }
    if (deduped.length >= CAP) break;
  }
  return deduped;
}

/** Serialize an array of strain names back into the `?strains=` value. */
export function serializeStrains(names: readonly string[]): string {
  return names.join(",");
}

/**
 * Dedupe case-insensitively and apply the cap. Used by mutation helpers
 * before writing back to the URL so the URL never holds an out-of-bounds
 * or duplicate-laden value, regardless of caller intent.
 */
export function dedupeAndCap(names: readonly string[]): string[] {
  const out: string[] = [];
  for (const name of names) {
    const trimmed = name.trim();
    if (trimmed === "") continue;
    if (out.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) {
      continue;
    }
    out.push(trimmed);
    if (out.length >= CAP) break;
  }
  return out;
}

export type CompareSelection = {
  /** Case-preserving, deduped, capped list of strain names. */
  names: string[];
  /** Append a name. No-op if it would exceed the cap or duplicates an existing entry. */
  add: (name: string) => void;
  /** Remove a name (case-insensitive match). */
  remove: (name: string) => void;
  /**
   * Toggle a name in/out of the selection. Returns the new "is in"
   * state after the operation. When the selection is already at cap
   * and `name` isn't already in it, this is a no-op and returns false.
   */
  toggle: (name: string) => boolean;
  /** Replace the whole selection (used by quick-pick flows). Dedupes + caps. */
  setNames: (names: readonly string[]) => void;
  /** Drop every strain. URL param removed entirely when count hits 0. */
  clear: () => void;
  /** Case-insensitive membership check. */
  isIn: (name: string) => boolean;
  /** True when the selection is at the cap and can't accept new entries. */
  atCap: boolean;
  /** Number of strains currently selected. */
  count: number;
  /** Maximum strains allowed (3). */
  cap: number;
};

/**
 * Read/write the `?strains=` URL param. See file header for selection
 * rules. The hook is the single writer; every mutation routes through
 * {@link writeSearchParams} so the URL and component state stay in
 * lockstep.
 */
export function useCompareSelection(): CompareSelection {
  const [searchParams, setSearchParams] = useSearchParams();
  const [stored, setStored] = useState<string[]>(readStoredStrains);

  useEffect(() => {
    const sync = () => setStored(readStoredStrains());
    window.addEventListener(COMPARE_EVENT, sync);
    return () => window.removeEventListener(COMPARE_EVENT, sync);
  }, []);

  const urlNames = useMemo(
    () => parseStrains(searchParams.get(STRAINS_PARAM)),
    [searchParams],
  );

  useEffect(() => {
    if (urlNames.length === 0) return;
    const current = readStoredStrains();
    if (serializeStrains(current) === serializeStrains(urlNames)) return;
    writeStoredStrains(urlNames);
  }, [urlNames]);

  const names = urlNames.length > 0 ? urlNames : stored;

  const writeNames = useCallback(
    (next: readonly string[]) => {
      const deduped = writeStoredStrains(next);
      setStored(deduped);
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (deduped.length === 0) {
            params.delete(STRAINS_PARAM);
          } else {
            params.set(STRAINS_PARAM, serializeStrains(deduped));
          }
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const add = useCallback(
    (name: string) => {
      if (names.length >= CAP) return;
      if (names.some((n) => n.toLowerCase() === name.toLowerCase())) return;
      writeNames([...names, name]);
    },
    [names, writeNames],
  );

  const remove = useCallback(
    (name: string) => {
      const lower = name.toLowerCase();
      const next = names.filter((n) => n.toLowerCase() !== lower);
      if (next.length === names.length) return;
      writeNames(next);
    },
    [names, writeNames],
  );

  const toggle = useCallback(
    (name: string): boolean => {
      const lower = name.toLowerCase();
      const isCurrentlyIn = names.some((n) => n.toLowerCase() === lower);
      if (isCurrentlyIn) {
        writeNames(names.filter((n) => n.toLowerCase() !== lower));
        return false;
      }
      if (names.length >= CAP) {
        return false;
      }
      writeNames([...names, name]);
      return true;
    },
    [names, writeNames],
  );

  const setNames = useCallback(
    (next: readonly string[]) => {
      writeNames(next);
    },
    [writeNames],
  );

  const clear = useCallback(() => {
    writeNames([]);
  }, [writeNames]);

  const isIn = useCallback(
    (name: string) =>
      names.some((n) => n.toLowerCase() === name.toLowerCase()),
    [names],
  );

  return {
    names,
    add,
    remove,
    toggle,
    setNames,
    clear,
    isIn,
    atCap: names.length >= CAP,
    count: names.length,
    cap: CAP,
  };
}