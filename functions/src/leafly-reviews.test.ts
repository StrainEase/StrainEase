import { describe, expect, test } from "bun:test";
import { medicalScore, reviewNotesFrom } from "./leafly";

describe("medicalScore", () => {
  test("returns 0 for empty / whitespace", () => {
    expect(medicalScore("")).toBe(0);
  });

  test("counts keyword occurrences, not just presence", () => {
    // "pain" appears twice; should outrank a single-occurrence review.
    const twoHits = medicalScore("The pain went away and the chronic pain stopped.");
    const oneHit = medicalScore("Helps with my anxiety.");
    expect(twoHits).toBeGreaterThan(oneHit);
  });

  test("ignores substrings inside other words", () => {
    // 'mg' would otherwise match 'imagine'; 'pain' would match 'painting'.
    expect(medicalScore("I painted the trim this weekend, imagine that.")).toBe(0);
  });

  test("boosts reviews in the 80-400 char sweet spot", () => {
    const sweetSpot =
      "Helps with chronic back pain and insomnia. I sleep through the night and wake up without stiffness. Great for daily use.";
    const tooLong = `${sweetSpot} ${"more text ".repeat(40)}`;
    expect(medicalScore(sweetSpot)).toBeGreaterThan(medicalScore(tooLong));
  });
});

describe("reviewNotesFrom", () => {
  const reviews = [
    {
      username: "recreational_user",
      rating: 5,
      text: "Great taste, smooth smoke, awesome flavor. Smoke with friends on the weekend.",
    },
    {
      username: "patient_one",
      rating: 4,
      text: "Really helps my chronic back pain and insomnia. I sleep through the night and the morning stiffness is gone.",
    },
    {
      username: "patient_two",
      rating: 5,
      text: "Calms my anxiety and panic attacks without leaving me couch-locked. Great daytime dose for PTSD symptoms.",
    },
    {
      username: "casual_user",
      rating: 5,
      text: "Love it. Good for movies and relaxing after work. Tasty.",
    },
  ];

  test("surfaces medical reviews before recreational ones", () => {
    const notes = reviewNotesFrom(reviews);
    expect(notes.length).toBeGreaterThanOrEqual(2);
    // Both patient reviews should rank above the recreational ones.
    expect(notes[0].text.toLowerCase()).toMatch(/chronic back pain|anxiety/);
    expect(notes[1].text.toLowerCase()).toMatch(/chronic back pain|anxiety/);
    // The recreational reviews land after the medical ones.
    const medicalCount = notes.filter((n) =>
      /pain|anxiety|insomnia|sleep|ptsd/.test(n.text.toLowerCase()),
    ).length;
    expect(medicalCount).toBeGreaterThanOrEqual(2);
  });

  test("falls back to non-medical reviews when nothing matches", () => {
    const onlyRecreational = reviews.map((r) => ({
      username: r.username,
      rating: r.rating,
      text: r.username === "patient_one" || r.username === "patient_two"
        ? "Tasty and smooth, great for weekends with friends."
        : r.text,
    }));
    const notes = reviewNotesFrom(onlyRecreational);
    // No medical hits → return what's available, still capped at 6.
    expect(notes.length).toBeGreaterThan(0);
    expect(notes.length).toBeLessThanOrEqual(6);
  });

  test("returns an empty array for missing or malformed input", () => {
    expect(reviewNotesFrom(undefined)).toEqual([]);
    expect(reviewNotesFrom(null)).toEqual([]);
    expect(reviewNotesFrom({})).toEqual([]);
    expect(reviewNotesFrom("not an array")).toEqual([]);
  });

  test("skips reviews shorter than 40 chars", () => {
    const tooShort = [
      { username: "short", text: "ok", rating: 5 },
      {
        username: "long",
        text: "This is a longer review that mentions chronic pain and helps with sleep at night.",
        rating: 5,
      },
    ];
    const notes = reviewNotesFrom(tooShort);
    expect(notes.length).toBe(1);
    expect(notes[0].text).toContain("chronic pain");
  });

  test("caps output at six reviews", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      username: `user_${i}`,
      rating: 5,
      text: `Helps with chronic pain and anxiety. Review number ${i} with enough length to pass.`,
    }));
    expect(reviewNotesFrom(many).length).toBe(6);
  });
});