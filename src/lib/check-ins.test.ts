import { describe, expect, test } from "bun:test";
import {
  buildCheckInTrend,
  CHECKIN_NOTE_MAX,
  clipCheckInNote,
  isTodayKey,
  normalizeMetrics,
  summarizeCheckIns,
  todayKey,
  __test,
} from "./check-ins";

function makeCheckIn(daysAgo: number, base: {
  mood: number;
  sleep: number;
  pain: number;
  anxiety: number;
  note?: string;
}, baseDay = "2026-08-10") {
  const [y, m, d] = baseDay.split("-").map((n) => Number(n));
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - daysAgo);
  const ts = date.getTime();
  return {
    id: todayKey(ts),
    date: todayKey(ts),
    metrics: {
      mood: base.mood,
      sleep: base.sleep,
      pain: base.pain,
      anxiety: base.anxiety,
    },
    note: base.note ?? "",
    createdAt: ts,
    updatedAt: ts,
  };
}

describe("todayKey", () => {
  test("returns YYYY-MM-DD in local time, zero-padded", () => {
    const key = todayKey(Date.parse("2026-01-05T18:00:00"));
    expect(key).toBe("2026-01-05");
  });
});

describe("isTodayKey", () => {
  test("matches today's key and rejects yesterday's", () => {
    const now = Date.parse("2026-08-10T12:00:00");
    expect(isTodayKey("2026-08-10", now)).toBe(true);
    expect(isTodayKey("2026-08-09", now)).toBe(false);
  });
});

describe("clipCheckInNote", () => {
  test("truncates to the Firestore rule max", () => {
    const text = "x".repeat(CHECKIN_NOTE_MAX + 50);
    expect(clipCheckInNote(text).length).toBe(CHECKIN_NOTE_MAX);
  });
});

describe("normalizeMetrics", () => {
  test("clamps each value to 1-5 and rounds", () => {
    expect(
      normalizeMetrics({ mood: -1, sleep: 0.4, pain: 3.6, anxiety: 99 }),
    ).toEqual({ mood: 1, sleep: 1, pain: 4, anxiety: 5 });
  });

  test("substitutes a 3 (neutral) when input is not a number", () => {
    expect(
      normalizeMetrics({ mood: Number.NaN, sleep: 4, pain: 2, anxiety: 5 }),
    ).toEqual({ mood: 3, sleep: 4, pain: 2, anxiety: 5 });
  });
});

describe("dataPayload", () => {
  test("round-trips metrics and note through the rule-safe shape", () => {
    const payload = __test.dataPayload(
      { metrics: { mood: 4, sleep: 3, pain: 2, anxiety: 5 }, note: "  felt ok " },
      "2026-08-10",
      1234,
    );
    expect(payload.date).toBe("2026-08-10");
    expect(payload.mood).toBe(4);
    expect(payload.note).toBe("felt ok");
    expect(payload.createdAt).toBe(1234);
    expect(payload.updatedAt).toBe(1234);
  });
});

describe("buildCheckInTrend", () => {
  test("emits 14 days oldest → newest, with nulls for days without a check-in", () => {
    const trend = buildCheckInTrend(
      [makeCheckIn(0, { mood: 4, sleep: 3, pain: 2, anxiety: 5 })],
      Date.parse("2026-08-10T08:00:00"),
      14,
    );
    expect(trend.days).toHaveLength(14);
    expect(trend.days[0]?.date).toBe("2026-07-28");
    expect(trend.days.at(-1)?.date).toBe("2026-08-10");
    expect(trend.days.at(-1)?.mood).toBe(4);
    expect(trend.loggedDays).toBe(1);
    expect(trend.averages?.mood).toBe(4);
    // Earlier days have null metrics
    expect(trend.days[0]?.mood).toBe(null);
  });

  test("averages all four metrics across the window", () => {
    const now = Date.parse("2026-08-10T08:00:00");
    const trend = buildCheckInTrend(
      [
        makeCheckIn(0, { mood: 5, sleep: 4, pain: 2, anxiety: 3 }),
        makeCheckIn(1, { mood: 3, sleep: 2, pain: 4, anxiety: 5 }),
      ],
      now,
      14,
    );
    expect(trend.averages).toEqual({
      mood: 4,
      sleep: 3,
      pain: 3,
      anxiety: 4,
    });
  });

  test("empty input returns a window of nulls and averages: null", () => {
    const trend = buildCheckInTrend([], Date.parse("2026-08-10T08:00:00"), 14);
    expect(trend.days).toHaveLength(14);
    expect(trend.averages).toBe(null);
    expect(trend.loggedDays).toBe(0);
  });
});

describe("summarizeCheckIns", () => {
  test("returns empty string when there are no check-ins", () => {
    expect(summarizeCheckIns([])).toBe("");
  });

  test("includes the four averages and the day count when there's data", () => {
    const summary = summarizeCheckIns(
      [makeCheckIn(0, { mood: 4, sleep: 3, pain: 2, anxiety: 5 })],
      Date.parse("2026-08-10T08:00:00"),
    );
    expect(summary).toContain("mood 4.0/5");
    expect(summary).toContain("sleep 3.0/5");
    expect(summary).toContain("pain 2.0/5");
    expect(summary).toContain("anxiety 5.0/5");
    expect(summary).toContain("1 of last 14 days");
  });
});
