// Regression tests for the Reddit quote fetchers.
//
// The fetchers mostly hit the network, so these tests are intentionally
// scoped to: (1) the URL shape that gets sent (it bit us once when an
// undocumented date format made Arctic Shift return 400), and (2) the
// pure filtering/scoring logic.
import { describe, expect, test } from "bun:test";

// We import the helper directly so the regression test stays focused
// on the URL construction. The fetcher itself is intentionally
// network-bound and not unit-tested here.
import { __test__ as redditInternal } from "./reddit";

describe("arctic shift URL", () => {
  test("uses the singular `6m` form Arctic Shift actually accepts", () => {
    // We previously shipped `after=6months` which Arctic Shift rejects
    // with a 400 — every fallback scrape silently returned []. Keep
    // this test in place so a future edit doesn't reintroduce it.
    const url = redditInternal.arcticShiftRecentSubredditUrl("trees");
    expect(url).toContain("after=6m");
    expect(url).not.toContain("6months");
    expect(url).toContain("limit=");
    expect(url).toContain("sort=desc");
  });

  test("encodes spaces and special characters in subreddit names", () => {
    const url = redditInternal.arcticShiftRecentSubredditUrl("uk medical");
    // encodeURIComponent turns the space into %20.
    expect(url).toContain("subreddit=uk%20medical");
  });
});
