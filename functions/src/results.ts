import { randomUUID } from "crypto";
import { getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

if (getApps().length === 0) initializeApp();

export type StoredKind = "find" | "compare";

const hits = new Map<string, { n: number; t: number }>();

export function guestRateLimit(
  ip: string,
  max = 10,
  windowMs = 15 * 60 * 1000,
) {
  const now = Date.now();
  const row = hits.get(ip);
  if (!row || now - row.t > windowMs) {
    hits.set(ip, { n: 1, t: now });
    return;
  }
  if (row.n >= max) {
    const err = new Error(
      "Too many guest searches. Sign in or try again later.",
    );
    (err as Error & { code: string }).code = "resource-exhausted";
    throw err;
  }
  row.n += 1;
}

export async function persistResult(input: {
  kind: StoredKind;
  args: Record<string, unknown>;
  result: unknown;
  uid: string | null;
}): Promise<string> {
  const id = randomUUID().replace(/-/g, "").slice(0, 16);
  await getFirestore().collection("researchResults").doc(id).set({
    kind: input.kind,
    args: input.args,
    result: input.result,
    uid: input.uid,
    createdAt: FieldValue.serverTimestamp(),
  });
  return id;
}

export function clientIp(req: { rawRequest?: { ip?: string } }): string {
  // Cloud Functions v2 sits behind Google's load balancer, which sets
  // `request.rawRequest.ip` from the actual client connection. We
  // deliberately do NOT trust the X-Forwarded-For header — a malicious
  // caller could otherwise rotate IPs in the header to bypass any
  // per-IP rate limit applied via `guestRateLimit(clientIp(request))`.
  return req.rawRequest?.ip || "unknown";
}
