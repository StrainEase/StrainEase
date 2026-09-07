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
import { commentToCandidate, uniqueCandidatesByThread } from "./reddit";

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

describe("commentToCandidate", () => {
  const comment = {
    body: "Granddaddy Purple knocked me out after a long pain day.",
    subreddit: "trees",
    score: 12,
    permalink: "/r/trees/comments/abcd1234/gdp_thread/comment123/",
    link_title: "GDP for sleep?",
  };

  test("maps a PullPush-style comment to a candidate thread", () => {
    const candidate = commentToCandidate(comment, "Granddaddy Purple");
    expect(candidate).not.toBeNull();
    expect(candidate!.url).toBe(comment.permalink);
    expect(candidate!.subreddit).toBe("trees");
    expect(candidate!.title).toBe("GDP for sleep?");
    expect(candidate!.score).toBe(12);
    expect(candidate!.applicableStrains).toEqual(["Granddaddy Purple"]);
    expect(candidate!.applicableConditions).toEqual([]);
    expect(candidate!.snippet).toContain("knocked me out");
  });

  test("returns null without a thread title (Arctic Shift payloads)", () => {
    expect(
      commentToCandidate(
        { ...comment, link_title: undefined },
        "Granddaddy Purple",
      ),
    ).toBeNull();
  });

  test("returns null without a permalink", () => {
    expect(
      commentToCandidate(
        { ...comment, permalink: undefined },
        "Granddaddy Purple",
      ),
    ).toBeNull();
  });

  test("returns null for deleted or removed bodies", () => {
    for (const body of ["[deleted]", "[removed]"]) {
      const candidate = commentToCandidate({ ...comment, body }, "Granddaddy Purple");
      expect(candidate).toBeNull();
    }
  });
});

describe("uniqueCandidatesByThread", () => {
  const base = {
    subreddit: "trees",
    title: "A thread",
    applicableConditions: [],
    applicableStrains: ["Blue Dream"],
  };

  test("dedupes comments from the same thread by normalized thread id", () => {
    const candidates = [
      { ...base, url: "https://www.reddit.com/r/trees/comments/abcd1234/x/" },
      { ...base, url: "https://old.reddit.com/r/trees/comments/abcd1234/x/c1/" },
      { ...base, url: "https://old.reddit.com/r/trees/comments/efgh5678/y/" },
    ];
    const unique = uniqueCandidatesByThread(candidates, 5);
    expect(unique).toHaveLength(2);
    expect(unique[0].url).toBe(
      "https://www.reddit.com/r/trees/comments/abcd1234/x/",
    );
  });

  test("caps the batch at the per-strain limit", () => {
    const candidates = Array.from({ length: 10 }, (_, i) => ({
      ...base,
      url: `https://old.reddit.com/r/trees/comments/id${i}0000/x/`,
    }));
    expect(uniqueCandidatesByThread(candidates, 5)).toHaveLength(5);
    expect(uniqueCandidatesByThread(candidates)).toHaveLength(5);
  });

  test("drops candidates without a valid thread id", () => {
    const candidates = [{ ...base, url: "https://example.com/not-a-thread" }];
    expect(uniqueCandidatesByThread(candidates, 5)).toHaveLength(0);
  });
});
