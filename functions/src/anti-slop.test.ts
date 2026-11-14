import { describe, expect, test } from "bun:test";
import {
  addressReader,
  antiSlop,
  antiSlopObject,
  rewriteDashes,
  stripSlopPhrases,
  tidyPunctuation,
} from "./anti-slop";

describe("rewriteDashes", () => {
  test("turns an em dash into punctuation", () => {
    expect(rewriteDashes("Blue Dream \u2014 a hybrid")).toBe(
      "Blue Dream, a hybrid",
    );
  });

  test("turns an unspaced em dash into punctuation", () => {
    expect(rewriteDashes("relaxing\u2014and gentle")).toBe("relaxing, and gentle");
  });

  test("keeps a numeric range intact", () => {
    expect(rewriteDashes("THC runs 17\u201424% here")).toBe("THC runs 17-24% here");
  });

  test("keeps an en dash range intact", () => {
    expect(rewriteDashes("THC runs 17\u201324% here")).toBe("THC runs 17\u201324% here");
  });

  test("rewrites a spaced en dash in running text", () => {
    expect(rewriteDashes("calm \u2013 steady")).toBe("calm, steady");
  });

  test("closes a clause that ended on a dash", () => {
    expect(rewriteDashes("Start low \u2014")).toBe("Start low.");
  });
});

describe("stripSlopPhrases", () => {
  test("removes stock filler openers", () => {
    expect(stripSlopPhrases("It's important to note that THC varies.")).toBe(
      "THC varies.",
    );
    expect(stripSlopPhrases("Moreover, the effect is calming.")).toBe(
      "The effect is calming.",
    );
  });

  test("removes marketing verbs and adjectives", () => {
    expect(stripSlopPhrases("a seamless experience")).toBe("a consistent experience");
    expect(stripSlopPhrases("leverage your relief log")).toBe(
      "Use your relief log",
    );
  });
});

describe("addressReader", () => {
  test("turns the patient into you", () => {
    expect(addressReader("the patient's saved ailments")).toBe(
      "your saved ailments",
    );
    expect(addressReader("Ask the patient before trying it.")).toBe(
      "Ask you before trying it.",
    );
  });

  test("turns patients into people", () => {
    expect(addressReader("what patients report")).toBe("what people report");
  });
});

describe("tidyPunctuation", () => {
  test("removes a space before punctuation", () => {
    expect(tidyPunctuation("calm , steady")).toBe("calm, steady");
  });

  test("collapses doubled commas", () => {
    expect(tidyPunctuation("calm,, steady")).toBe("calm, steady");
  });

  test("capitalizes a sentence that lost its opener", () => {
    expect(tidyPunctuation("the effect is calming.")).toBe(
      "The effect is calming.",
    );
  });
});

describe("antiSlop", () => {
  test("cleans a whole sentence in one pass", () => {
    const input =
      "It's important to note that Blue Dream \u2014 an indica-leaning hybrid \u2014 may help your sleep.";
    expect(antiSlop(input)).toBe(
      "Blue Dream, an indica-leaning hybrid, may help your sleep.",
    );
  });

  test("keeps paragraph breaks", () => {
    expect(antiSlop("First line.\n\nSecond line.")).toBe(
      "First line.\n\nSecond line.",
    );
  });

  test("leaves clean copy untouched", () => {
    const clean = "Start with a low dose and see how you feel.";
    expect(antiSlop(clean)).toBe(clean);
  });

  test("does not break a URL", () => {
    expect(antiSlop("https://example.com/a")).toBe("https://example.com/a");
  });
});

describe("antiSlopObject", () => {
  test("cleans nested string values", () => {
    expect(
      antiSlopObject({
        headline: "A calm pick \u2014 great for night",
        child: ["Seamless and effective"],
        count: 3,
      }),
    ).toEqual({
      headline: "A calm pick, great for night",
      child: ["Consistent and effective"],
      count: 3,
    });
  });
});
