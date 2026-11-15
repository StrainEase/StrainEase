import { describe, expect, test } from "bun:test";
import { isRichDescription } from "./description-quality";

describe("isRichDescription", () => {
  test("rejects a missing description", () => {
    expect(isRichDescription(undefined)).toBe(false);
    expect(isRichDescription("")).toBe(false);
  });

  test("rejects a one-line catalog blurb", () => {
    expect(
      isRichDescription(
        "A balanced hybrid patients often reach for when they need relief without being glued to the couch.",
      ),
    ).toBe(false);
  });

  test("rejects a short description even when it has two sentences", () => {
    expect(
      isRichDescription(
        "Blue Dream is a hybrid. It is popular. Many people like it.",
      ),
    ).toBe(false);
  });

  test("accepts a full, multi-sentence description", () => {
    const rich =
      "Blue Dream is a sativa-leaning hybrid from California and the most searched strain on the market for good reason. It pairs a sweet berry aroma with a light herbal finish on the exhale, which makes it easy to pick out of a jar from across the room. The high is gentle and cerebral, with a soft body ease that settles in without pinning you to the couch. Most people reach for it during the day because the effects stay functional, and it is often the first flower people try when stronger weed leaves them anxious or sleepy. Expect a steady mood lift, a mild body buzz, and dry mouth as the most common complaint.";
    expect(isRichDescription(rich)).toBe(true);
  });
});
