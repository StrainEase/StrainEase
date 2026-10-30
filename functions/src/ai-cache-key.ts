// Pure hash helper for the AI cache keys.
//
// Split out of `ai-cache.ts` so the modules that only need to build a
// key (the Discover recommend pipeline) can import it without pulling
// the Firebase admin SDK into the import graph. The admin SDK boots a
// Firestore client when it is imported from a module that initialises
// the app, which turns the Firestore-backed unit tests into real
// network waits.
//
// The hash itself is dependency-free: SHA-256 over a canonical JSON
// serialization with sorted object keys.

import { createHash } from "node:crypto";

/**
 * Deterministic SHA-256 hash of any JSON-serializable input, returned
 * as lowercase hex (64 chars). Keys are sorted at every level so
 * `{a:1,b:2}` and `{b:2,a:1}` produce the same hash. Arrays keep
 * their order — `{ailments:["a","b"]}` and `{ailments:["b","a"]}` are
 * intentionally different cache entries (callers must pre-sort
 * order-sensitive lists like strain names).
 */
export function computeAiCacheKey(input: unknown): string {
  return createHash("sha256").update(canonicalize(input)).digest("hex");
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map((v) => canonicalize(v)).join(",") + "]";
  }
  // Plain object: sort keys for a stable serialization.
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const parts: string[] = [];
  for (const k of keys) {
    parts.push(JSON.stringify(k) + ":" + canonicalize(obj[k]));
  }
  return "{" + parts.join(",") + "}";
}
