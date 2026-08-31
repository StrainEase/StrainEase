import { describe, expect, test } from "bun:test";
import {
  avoidStrains,
  buildReliefInsights,
  reliefTrend,
  strainPersonalFit,
  summarizeInsights,
  timeOfDayPattern,
  topStrainsForCondition,
  __test,
} from "./relief-insights";
import type { ReliefLog } from "./relief-log";

function makeLog(
  partial: Partial<ReliefLog> & {
    strainName: string;
    fit: ReliefLog["fit"];
    relief: number;
    createdAt: number;
  },
): ReliefLog {
  return {
    id: `log-${partial.createdAt}-${partial.strainName}`,
    conditions: partial.conditions ?? [],
    note: partial.note ?? "",
    ...partial,
  };
}

const DAY_MS = __test.startOfDay(Date.parse("2026-08-10T12:00:00Z"));
const hour = (h: number) => DAY_MS + h * 60 * 60 * 1000;

describe("topStrainsForCondition", () => {
  test("ranks strains by mean relief, ties broken by log count", () => {
    const logs: ReliefLog[] = [
      makeLog({ strainName: "Blue Dream", fit: "just-right", relief: 5, conditions: ["Insomnia"], createdAt: hour(9) }),
      makeLog({ strainName: "Blue Dream", fit: "just-right", relief: 4, conditions: ["Insomnia"], createdAt: hour(11) }),
      makeLog({ strainName: "Northern Lights", fit: "just-right", relief: 5, conditions: ["Insomnia"], createdAt: hour(22) }),
      makeLog({ strainName: "Northern Lights", fit: "just-right", relief: 4, conditions: ["Insomnia"], createdAt: hour(0) }),
      makeLog({ strainName: "OG Kush", fit: "just-right", relief: 3, conditions: ["Insomnia"], createdAt: hour(20) }),
      makeLog({ strainName: "OG Kush", fit: "just-right", relief: 3, conditions: ["Insomnia"], createdAt: hour(21) }),
    ];
    const result = topStrainsForCondition(logs, "Insomnia");
    // Blue Dream and Northern Lights both average 4.5, both have 2 logs.
    // OG Kush is solidly last with 3.0.
    expect(result[0]?.avgRelief).toBeGreaterThanOrEqual(4.4);
    expect(result[0]?.avgRelief).toBeLessThanOrEqual(4.6);
    expect(result[0]?.logCount).toBe(2);
    expect(result.at(-1)?.strain).toBe("OG Kush");
    expect(result.at(-1)?.avgRelief).toBe(3);
  });

  test("ignores single-log strains — one rating is noise", () => {
    const logs: ReliefLog[] = [
      makeLog({ strainName: "One-Hit Wonder", fit: "just-right", relief: 5, conditions: ["Pain"], createdAt: hour(10) }),
      makeLog({ strainName: "Sour Diesel", fit: "just-right", relief: 4, conditions: ["Pain"], createdAt: hour(12) }),
      makeLog({ strainName: "Sour Diesel", fit: "just-right", relief: 4, conditions: ["Pain"], createdAt: hour(14) }),
    ];
    const result = topStrainsForCondition(logs, "Pain");
    expect(result.map((r) => r.strain)).toEqual(["Sour Diesel"]);
  });

  test("matches conditions case-insensitively", () => {
    const logs: ReliefLog[] = [
      makeLog({ strainName: "Granddaddy Purple", fit: "just-right", relief: 5, conditions: ["INSOMNIA"], createdAt: hour(22) }),
      makeLog({ strainName: "Granddaddy Purple", fit: "just-right", relief: 5, conditions: ["insomnia"], createdAt: hour(23) }),
    ];
    const result = topStrainsForCondition(logs, "Insomnia");
    expect(result[0]?.strain).toBe("Granddaddy Purple");
    expect(result[0]?.logCount).toBe(2);
  });
});

describe("avoidStrains", () => {
  test("flags strains the patient has marked 'too strong' >= 2 times", () => {
    const logs: ReliefLog[] = [
      makeLog({ strainName: "Godfather OG", fit: "too-strong", relief: 2, createdAt: hour(20) }),
      makeLog({ strainName: "Godfather OG", fit: "too-strong", relief: 2, createdAt: hour(22) }),
      makeLog({ strainName: "Godfather OG", fit: "just-right", relief: 4, createdAt: hour(0) }),
      makeLog({ strainName: "Blue Dream", fit: "too-strong", relief: 2, createdAt: hour(21) }),
    ];
    const result = avoidStrains(logs);
    expect(result).toHaveLength(1);
    expect(result[0]?.strainName).toBe("Godfather OG");
    expect(result[0]?.harshCount).toBe(2);
    expect(result[0]?.totalCount).toBe(3);
  });
});

describe("reliefTrend", () => {
  test("produces one bucket per day for the last N days, oldest → newest, with nulls for empty days", () => {
    const now = DAY_MS + 8 * 60 * 60 * 1000; // 8 AM on the reference day
    const logs: ReliefLog[] = [
      makeLog({ strainName: "Blue Dream", fit: "just-right", relief: 5, createdAt: now }),
      makeLog({ strainName: "Blue Dream", fit: "just-right", relief: 3, createdAt: now - 2 * 24 * 60 * 60 * 1000 }),
    ];
    const trend = reliefTrend(logs, now, 5);
    expect(trend).toHaveLength(5);
    expect(trend[0]?.avgRelief).toBe(null);
    expect(trend[1]?.avgRelief).toBe(null);
    expect(trend[2]?.avgRelief).toBe(3);
    expect(trend[3]?.avgRelief).toBe(null);
    expect(trend[4]?.avgRelief).toBe(5);
  });
});

describe("timeOfDayPattern", () => {
  test("buckets logs into four bands and averages relief per band", () => {
    const logs: ReliefLog[] = [
      makeLog({ strainName: "Blue Dream", fit: "just-right", relief: 5, createdAt: hour(9) }),
      makeLog({ strainName: "Blue Dream", fit: "just-right", relief: 3, createdAt: hour(14) }),
      makeLog({ strainName: "Blue Dream", fit: "just-right", relief: 4, createdAt: hour(20) }),
      makeLog({ strainName: "Blue Dream", fit: "just-right", relief: 5, createdAt: hour(23) }),
    ];
    const bands = timeOfDayPattern(logs);
    expect(bands[0]?.label).toBe("Morning (6–11)");
    expect(bands[0]?.avgRelief).toBe(5);
    expect(bands[1]?.avgRelief).toBe(3);
    expect(bands[2]?.avgRelief).toBe(4);
    expect(bands[3]?.avgRelief).toBe(5);
  });

  test("returns null avg for bands with no logs", () => {
    const bands = timeOfDayPattern([]);
    for (const band of bands) {
      expect(band.avgRelief).toBe(null);
      expect(band.logCount).toBe(0);
    }
  });
});

describe("buildReliefInsights", () => {
  test("empty logs → hasEnoughData: false and an empty summary", () => {
    const result = buildReliefInsights([]);
    expect(result.hasEnoughData).toBe(false);
    expect(result.totalLogs).toBe(0);
    expect(result.proseSummary).toBe("");
    expect(result.topStrains).toEqual([]);
    expect(result.avoid).toEqual([]);
  });

  test("composes all lenses and writes a short prose summary", () => {
    const logs: ReliefLog[] = [
      makeLog({ strainName: "Blue Dream", fit: "just-right", relief: 5, conditions: ["Insomnia"], createdAt: hour(23) }),
      makeLog({ strainName: "Blue Dream", fit: "just-right", relief: 4, conditions: ["Insomnia"], createdAt: hour(0) }),
      makeLog({ strainName: "Godfather OG", fit: "too-strong", relief: 2, conditions: ["Pain"], createdAt: hour(20) }),
      makeLog({ strainName: "Godfather OG", fit: "too-strong", relief: 2, conditions: ["Pain"], createdAt: hour(21) }),
    ];
    const result = buildReliefInsights(logs, DAY_MS + 60 * 60 * 1000);
    expect(result.hasEnoughData).toBe(true);
    expect(result.totalLogs).toBe(4);
    expect(result.topStrains[0]?.strain).toBe("Blue Dream");
    expect(result.avoid[0]?.strainName).toBe("Godfather OG");
    expect(result.proseSummary).toContain("Blue Dream");
    expect(result.proseSummary).toContain("Godfather OG");
    expect(result.proseSummary).toContain("Best window");
  });
});

describe("strainPersonalFit", () => {
  test("returns null for strains the patient has never logged", () => {
    expect(strainPersonalFit([], "Anything")).toBe(null);
  });

  test("returns avg relief and just-right rate for a logged strain", () => {
    const logs: ReliefLog[] = [
      makeLog({ strainName: "Blue Dream", fit: "just-right", relief: 5, createdAt: hour(9) }),
      makeLog({ strainName: "Blue Dream", fit: "just-right", relief: 4, createdAt: hour(11) }),
      makeLog({ strainName: "Blue Dream", fit: "too-weak", relief: 3, createdAt: hour(13) }),
    ];
    const fit = strainPersonalFit(logs, "blue dream");
    expect(fit?.avgRelief).toBeCloseTo(4, 1);
    expect(fit?.justRightRate).toBeCloseTo(2 / 3, 2);
    expect(fit?.logCount).toBe(3);
  });
});

describe("summarizeInsights", () => {
  test("returns empty string when there is not enough data", () => {
    const result = buildReliefInsights([]);
    expect(summarizeInsights(result)).toBe("");
  });
});
