import { describe, expect, test } from "bun:test";
import { publicStrainImageUrl } from "./index";

/**
 * `cachedStrainImage` used to call `getSignedUrl` on the Storage
 * object — that needs `iam.serviceAccounts.signBlob` on the runtime
 * service account, which the default Firebase compute SA does NOT
 * have, so every call landed as an opaque `INTERNAL` error from
 * Cloud Functions. The fix returns a permanent public URL instead,
 * which the browser can fetch with normal HTTP caching. This test
 * locks in the public-URL contract so a future refactor can't
 * silently switch back to signed URLs.
 */
describe("publicStrainImageUrl", () => {
  test("returns a https://storage.googleapis.com/<bucket>/strain-images/<key> URL", () => {
    const url = publicStrainImageUrl("my-bucket", "abc123");
    expect(url).toBe(
      "https://storage.googleapis.com/my-bucket/strain-images/abc123",
    );
  });

  test("does not include any signed-URL query parameters", () => {
    const url = publicStrainImageUrl("my-bucket", "abc123");
    // Public URLs are stable; signed URLs carry ?X-Goog-Signature&...
    // which would expire and recreate the INTERNAL-on-renew problem.
    expect(url).not.toContain("?");
    expect(url).not.toMatch(/X-Goog-/i);
  });

  test("preserves the bucket and the key verbatim", () => {
    const url = publicStrainImageUrl(
      "strainease.appspot.com",
      "f" + "0".repeat(63),
    );
    expect(url).toBe(
      "https://storage.googleapis.com/strainease.appspot.com/strain-images/f" +
        "0".repeat(63),
    );
  });
});
