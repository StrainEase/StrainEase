import { describe, expect, test } from "bun:test";
import { isAllowedCachedImageHost, publicStrainImageUrl } from "./index";

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

/**
 * The callable used to accept any `https://` URL, which made it an
 * open fetch proxy with a 30-second budget. The fix narrows the
 * allowed hosts to the upstream sources we actually scrape strain
 * images from plus the StrainEase Storage bucket for already-cached
 * objects. Pin the exact set here so a missing-CDN regression (every
 * image returning PERMISSION_DENIED) can't slip through again.
 */
describe("isAllowedCachedImageHost", () => {
  test("accepts the Leafly marketing hosts", () => {
    expect(isAllowedCachedImageHost("https://leafly.com/foo.png")).toBe(true);
    expect(isAllowedCachedImageHost("https://www.leafly.com/foo.png")).toBe(
      true,
    );
  });

  test("accepts the Leafly image CDNs that host every flower photo", () => {
    // images.leafly.com — the catalog's primary flower-image host.
    expect(
      isAllowedCachedImageHost(
        "https://images.leafly.com/flower-images/blue-dream.png",
      ),
    ).toBe(true);
    // leafly-public.imgix.net — the catalog's secondary imgix host.
    expect(
      isAllowedCachedImageHost(
        "https://leafly-public.imgix.net/strains/photos/x.jpg",
      ),
    ).toBe(true);
  });

  test("accepts the Weedmaps and Allbud marketing hosts", () => {
    expect(isAllowedCachedImageHost("https://weedmaps.com/foo.png")).toBe(true);
    expect(isAllowedCachedImageHost("https://www.weedmaps.com/foo.png")).toBe(
      true,
    );
    expect(isAllowedCachedImageHost("https://allbud.com/foo.png")).toBe(true);
    expect(isAllowedCachedImageHost("https://www.allbud.com/foo.png")).toBe(
      true,
    );
  });

  test("accepts the StrainEase Storage bucket for already-cached objects", () => {
    expect(
      isAllowedCachedImageHost(
        "https://storage.googleapis.com/strainease.appspot.com/strain-images/abc",
      ),
    ).toBe(true);
  });

  test("rejects an unrelated host", () => {
    expect(isAllowedCachedImageHost("https://example.com/foo.png")).toBe(false);
    expect(isAllowedCachedImageHost("https://evil.example.org/x")).toBe(false);
  });

  test("rejects a malformed URL", () => {
    expect(isAllowedCachedImageHost("not-a-url")).toBe(false);
    expect(isAllowedCachedImageHost("")).toBe(false);
    expect(isAllowedCachedImageHost("ftp://example.com/x")).toBe(false);
  });

  test("matches the host case-insensitively", () => {
    expect(
      isAllowedCachedImageHost("https://IMAGES.LEAFLY.COM/flower-images/x.png"),
    ).toBe(true);
  });
});
