import { describe, expect, test } from "bun:test";
import {
  buildVettedWrite,
  extractThreadId,
  filterVettedThreads,
  normalizeRedditUrl,
  PoolOperatorError,
  requirePoolOperator,
  toRedditSource,
  validateCandidateBatch,
  validateCandidateThread,
  vettedSourcesOrFallback,
  type PendingRedditThread,
  type VettedRedditThread,
} from "./reddit-pool";

const candidate = {
  url: "https://www.reddit.com/r/trees/comments/abcd1234/good-thread/",
  subreddit: "trees",
  title: "A good thread",
  snippet: "A useful community discussion.",
  score: 42,
  applicableConditions: ["Insomnia", " sleep "],
  applicableStrains: ["Granddaddy Purple"],
};

function vetted(overrides: Partial<VettedRedditThread> = {}): VettedRedditThread {
  return {
    threadId: "abcd1234",
    url: "https://old.reddit.com/r/trees/comments/abcd1234/good-thread/",
    subreddit: "trees",
    title: "A good thread",
    snippet: "A useful community discussion.",
    score: 42,
    applicableConditions: ["insomnia"],
    applicableStrains: ["Granddaddy Purple"],
    vettedAt: Date.now(),
    vettedBy: "operator-1",
    addedAt: Date.now(),
    ...overrides,
  };
}

describe("Reddit URL helpers", () => {
  test("normalizes Reddit hosts and relative permalinks", () => {
    expect(normalizeRedditUrl("https://www.reddit.com/r/trees/comments/abcd/title/"))
      .toBe("https://old.reddit.com/r/trees/comments/abcd/title/");
    expect(normalizeRedditUrl("/r/trees/comments/abcd/title/"))
      .toBe("https://old.reddit.com/r/trees/comments/abcd/title/");
    expect(extractThreadId("https://old.reddit.com/r/trees/comments/abcd/title/"))
      .toBe("abcd");
    expect(extractThreadId("https://example.com/not-reddit")).toBeNull();
  });
});

describe("validateCandidateThread", () => {
  test("accepts PullPush-style permalink data and normalizes fields", () => {
    const result = validateCandidateThread(
      { ...candidate, permalink: candidate.url, url: undefined },
      0,
    );
    expect(result.threadId).toBe("abcd1234");
    expect(result.url).toStartWith("https://old.reddit.com/");
    expect(result.applicableConditions).toEqual(["insomnia", "sleep"]);
    expect(result.applicableStrains).toEqual(["Granddaddy Purple"]);
    expect(result.vettedAt).toBeNull();
    expect(result.vettedBy).toBeNull();
  });

  test("rejects non-Reddit URLs", () => {
    expect(() =>
      validateCandidateThread({ ...candidate, url: "https://example.com/thread" }, 0),
    ).toThrow(/old\.reddit\.com/);
  });

  test("rejects missing applicability arrays", () => {
    const { applicableConditions: _conditions, ...bad } = candidate;
    expect(() => validateCandidateThread(bad, 0)).toThrow(/applicableConditions/);
  });

  test("rejects duplicate thread IDs in a batch", () => {
    expect(() => validateCandidateBatch([candidate, candidate])).toThrow(
      /duplicate threadId/,
    );
  });
});

describe("filterVettedThreads", () => {
  test("returns only vetted, fresh threads matching the strain", () => {
    const result = filterVettedThreads(
      [
        vetted(),
        vetted({ threadId: "pending", vettedAt: null, vettedBy: null }),
        vetted({
          threadId: "stale",
          vettedAt: Date.now() - 31 * 24 * 60 * 60 * 1000,
        }),
        vetted({
          threadId: "other",
          applicableStrains: ["Blue Dream"],
        }),
      ],
      "Granddaddy Purple",
      ["insomnia"],
    );
    expect(result.map((thread) => thread.threadId)).toEqual(["abcd1234"]);
  });

  test("a strain match works without a condition focus", () => {
    const result = filterVettedThreads([vetted()], "Granddaddy Purple", []);
    expect(result).toHaveLength(1);
  });

  test("condition scores rank exact matches ahead of fuzzy matches", () => {
    const result = filterVettedThreads(
      [
        vetted({ threadId: "fuzzy", applicableConditions: ["sleep problems"] }),
        vetted({ threadId: "exact", applicableConditions: ["insomnia"] }),
      ],
      "Granddaddy Purple",
      ["insomnia"],
    );
    expect(result.map((thread) => thread.threadId)).toEqual(["exact", "fuzzy"]);
  });

  test("condition-only threads do not satisfy a strain-specific lookup", () => {
    const result = filterVettedThreads(
      [vetted({ applicableStrains: [] })],
      "Granddaddy Purple",
      ["insomnia"],
    );
    expect(result).toEqual([]);
  });
});

describe("vettedSourcesOrFallback", () => {
  const fallback = [
    {
      url: "https://old.reddit.com/r/trees/comments/fallback/fallback/",
      subreddit: "trees",
      title: "Static fallback",
    },
  ];

  test("prefers vetted sources when a match exists", () => {
    const result = vettedSourcesOrFallback(
      [vetted()],
      "Granddaddy Purple",
      ["insomnia"],
      fallback,
    );
    expect(result).toHaveLength(1);
    expect(result[0].url).toContain("abcd1234");
    expect(result[0].title).not.toBe("Static fallback");
  });

  test("uses static seed fallback only when vetted pool has no match", () => {
    const result = vettedSourcesOrFallback(
      [vetted({ applicableStrains: ["Blue Dream"] })],
      "Granddaddy Purple",
      ["insomnia"],
      fallback,
    );
    expect(result).toEqual(fallback);
  });

  test("strips vetting metadata before returning a source", () => {
    const result = toRedditSource(vetted());
    expect(result).toEqual({
      url: "https://old.reddit.com/r/trees/comments/abcd1234/good-thread/",
      subreddit: "trees",
      title: "A good thread",
      snippet: "A useful community discussion.",
      score: 42,
    });
  });
});

describe("requirePoolOperator (admin-callable auth gate)", () => {
  const operators = new Set<string>(["operator-1"]);

  test("returns the UID for a known operator", () => {
    expect(requirePoolOperator("operator-1", operators, "vet threads")).toBe(
      "operator-1",
    );
  });

  test("rejects an anonymous caller (no auth)", () => {
    expect(() => requirePoolOperator(undefined, operators, "vet threads")).toThrow(
      PoolOperatorError,
    );
    expect(() => requirePoolOperator(null, operators, "vet threads")).toThrow(
      PoolOperatorError,
    );
    expect(() => requirePoolOperator("", operators, "vet threads")).toThrow(
      PoolOperatorError,
    );
    try {
      requirePoolOperator(undefined, operators, "vet threads");
    } catch (err) {
      expect(err).toBeInstanceOf(PoolOperatorError);
      expect((err as PoolOperatorError).code).toBe("unauthenticated");
    }
  });

  test("rejects a signed-in non-operator", () => {
    try {
      requirePoolOperator("someone-else", operators, "vet threads");
    } catch (err) {
      expect(err).toBeInstanceOf(PoolOperatorError);
      expect((err as PoolOperatorError).code).toBe("permission-denied");
      expect((err as PoolOperatorError).message).toContain("vet threads");
    }
  });

  test("passes the action into the permission-denied message", () => {
    try {
      requirePoolOperator("someone-else", operators, "unvet threads");
    } catch (err) {
      expect((err as PoolOperatorError).message).toContain("unvet threads");
    }
  });
});

describe("buildVettedWrite (idempotent re-vet)", () => {
  function pending(overrides: Partial<PendingRedditThread> = {}): PendingRedditThread {
    return {
      threadId: "abcd1234",
      url: "https://old.reddit.com/r/trees/comments/abcd1234/good-thread/",
      subreddit: "trees",
      title: "A good thread",
      snippet: "A useful community discussion.",
      score: 42,
      applicableConditions: ["insomnia"],
      applicableStrains: ["Granddaddy Purple"],
      vettedAt: null,
      vettedBy: null,
      addedAt: 1000,
      ...overrides,
    };
  }

  test("writes the candidate fields plus vetting metadata", () => {
    const doc = buildVettedWrite(pending(), undefined, 2000, "operator-1");
    expect(doc.threadId).toBe("abcd1234");
    expect(doc.vettedAt).toBe(2000);
    expect(doc.vettedBy).toBe("operator-1");
    expect(doc.vettedNotes).toBeNull();
    expect(doc.addedAt).toBe(1000);
  });

  test("preserves the original addedAt when the doc already exists (re-vet)", () => {
    const existing = vetted({ addedAt: 500 });
    const doc = buildVettedWrite(pending(), existing, 3000, "operator-1");
    expect(doc.addedAt).toBe(500);
    expect(doc.vettedAt).toBe(3000);
  });

  test("falls back to the candidate addedAt for a fresh write", () => {
    const doc = buildVettedWrite(pending({ addedAt: 1234 }), undefined, 3000, "op");
    expect(doc.addedAt).toBe(1234);
  });

  test("persists vettedNotes when provided", () => {
    const doc = buildVettedWrite(
      pending(),
      undefined,
      3000,
      "operator-1",
      "Verified against the OP.",
    );
    expect(doc.vettedNotes).toBe("Verified against the OP.");
  });
});
