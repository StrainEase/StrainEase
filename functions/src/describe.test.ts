import { describe, expect, test } from "bun:test";
import {
  __testing,
  describeStrainPayload,
  describePrompt,
} from "./index";

describe("describeStrainPayload", () => {
  test("strips communityNotes and redditSources — the description prompt does not need them", () => {
    const payload = describeStrainPayload({
      name: "Blue Dream",
      inKnowledgeBase: true,
      type: "hybrid",
      thcRange: "17–24%",
      description: "Classic daytime hybrid.",
      communityNotes: [{ source: "Leafly", text: "Great for daytime." }],
      redditSources: [
        {
          url: "https://old.reddit.com/r/trees/comments/abc/sample/",
          subreddit: "trees",
          title: "Blue Dream review",
        },
      ],
    });
    expect(payload).toMatchObject({
      name: "Blue Dream",
      type: "hybrid",
      thcRange: "17–24%",
      description: "Classic daytime hybrid.",
      noCuratedProfile: false,
    });
    expect("communityNotes" in payload).toBe(false);
    expect("redditSources" in payload).toBe(false);
  });

  test("keeps a true stub as name-only with noCuratedProfile flag", () => {
    expect(
      describeStrainPayload({ name: "Mystery Kush", inKnowledgeBase: false }),
    ).toEqual({ name: "Mystery Kush", noCuratedProfile: true });
  });

  test("flags a name-only stub as noCuratedProfile", () => {
    // A row that has nothing but a name — we want the model to lean on
    // its general knowledge, not pretend the catalog told us anything.
    const payload = describeStrainPayload({
      name: "Thin Profile",
      inKnowledgeBase: false,
    });
    expect(payload.noCuratedProfile).toBe(true);
  });
});

describe("normalizeDescriptionSections", () => {
  const { normalizeDescriptionSections } = __testing;

  test("passes through three well-formed sections", () => {
    const out = normalizeDescriptionSections(
      [
        { heading: "Overview", body: "A calm daytime strain." },
        {
          heading: "What it might do for you",
          body: "Reported for anxiety and focus.",
        },
        {
          heading: "What to expect",
          body: "Mild onset, lasts a couple hours. Start low.",
        },
      ],
      "Blue Dream",
    );
    expect(out.map((s) => s.heading)).toEqual([
      "Overview",
      "What it might do for you",
      "What to expect",
    ]);
    expect(out[0].body).toBe("A calm daytime strain.");
  });

  test("fills in missing sections with safe fallbacks", () => {
    const out = normalizeDescriptionSections(
      [{ heading: "Overview", body: "Just one." }],
      "X",
    );
    expect(out).toHaveLength(3);
    expect(out[0].heading).toBe("Overview");
    expect(out[0].body).toBe("Just one.");
    expect(out[1].heading).toBe("What it might do for you");
    expect(out[1].body.length).toBeGreaterThan(0);
    expect(out[2].heading).toBe("What to expect");
    expect(out[2].body.length).toBeGreaterThan(0);
  });

  test("returns all three fallbacks for an empty array", () => {
    const out = normalizeDescriptionSections([], "Z");
    expect(out).toHaveLength(3);
    expect(out.every((s) => s.heading && s.body)).toBe(true);
  });

  test("skips sections with empty heading or body", () => {
    const out = normalizeDescriptionSections(
      [
        { heading: "", body: "no heading" },
        { heading: "Overview", body: "" },
        { heading: "Overview", body: "real" },
      ],
      "Y",
    );
    // Only the third item is usable; the rest are fallbacks.
    expect(out[0].body).toBe("real");
    expect(out[1].heading).toBe("What it might do for you");
    expect(out[2].heading).toBe("What to expect");
  });

  test("ignores non-array input", () => {
    const out = normalizeDescriptionSections({ weird: true }, "Y");
    expect(out).toHaveLength(3);
  });
});

describe("describePrompt", () => {
  const strain = {
    name: "Blue Dream",
    inKnowledgeBase: true,
    type: "hybrid" as const,
  };

  test("includes medications and relief history in the user message", () => {
    const prompt = describePrompt(
      strain,
      ["Insomnia"],
      ["Lorazepam", "Sertraline"],
      "Northern Lights for Insomnia: just-right, relief 5/5",
    );
    expect(prompt).toContain("Lorazepam");
    expect(prompt).toContain("Sertraline");
    expect(prompt).toContain("Northern Lights for Insomnia");
    expect(prompt).toContain("Insomnia");
  });

  test("renders explicit placeholders when no medications or relief log", () => {
    const prompt = describePrompt(strain, [], [], "");
    expect(prompt).toContain("none reported");
    expect(prompt).toContain("empty");
  });

  test("passes medications through to the prompt verbatim (clamping lives upstream)", () => {
    // The describeStrainForUser callable trims/clips medications before
    // calling describePrompt. The prompt function itself is a thin
    // renderer, so it does no additional truncation.
    const prompt = describePrompt(strain, [], ["Atorvastatin"], "");
    expect(prompt).toContain("Atorvastatin");
  });
});
