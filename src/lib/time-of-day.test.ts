import { describe, expect, test } from "bun:test";
import { dayPartFor, timeOfDayHeadline } from "./time-of-day";

describe("dayPartFor", () => {
  test("buckets hours into the four parts", () => {
    expect(dayPartFor(new Date("2025-01-01T06:00:00"))).toBe("morning");
    expect(dayPartFor(new Date("2025-01-01T11:59:00"))).toBe("morning");
    expect(dayPartFor(new Date("2025-01-01T12:00:00"))).toBe("afternoon");
    expect(dayPartFor(new Date("2025-01-01T16:59:00"))).toBe("afternoon");
    expect(dayPartFor(new Date("2025-01-01T17:00:00"))).toBe("evening");
    expect(dayPartFor(new Date("2025-01-01T21:59:00"))).toBe("evening");
    expect(dayPartFor(new Date("2025-01-01T22:00:00"))).toBe("night");
    expect(dayPartFor(new Date("2025-01-01T04:59:00"))).toBe("night");
  });
});

describe("timeOfDayHeadline", () => {
  test("is deterministic for the same date", () => {
    const a = timeOfDayHeadline(new Date("2025-08-15T20:00:00"));
    const b = timeOfDayHeadline(new Date("2025-08-15T20:30:00"));
    expect(a).toBe(b);
  });

  test("returns a non-empty string for each daypart", () => {
    const samples = [
      new Date("2025-08-15T08:00:00"),
      new Date("2025-08-15T14:00:00"),
      new Date("2025-08-15T20:00:00"),
      new Date("2025-08-15T02:00:00"),
    ];
    for (const d of samples) {
      const h = timeOfDayHeadline(d);
      expect(h.length).toBeGreaterThan(0);
    }
  });

  test("rolls through the pool across days", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const d = new Date("2025-08-15T20:00:00");
      d.setDate(d.getDate() + i);
      seen.add(timeOfDayHeadline(d));
    }
    // 30 days of evening should surface multiple distinct headlines.
    expect(seen.size).toBeGreaterThan(1);
  });
});
