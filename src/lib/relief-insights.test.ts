import { describe, expect, it } from "bun:test";
import { analyzeReliefLogs } from "./relief-insights";
import type { ReliefLog } from "./relief-log";

const log = (overrides: Partial<ReliefLog>): ReliefLog => ({
  id: String(overrides.createdAt ?? 0),
  strainName: "Blue Dream",
  conditions: ["Pain"],
  fit: "just-right",
  relief: 3,
  createdAt: 1,
  ...overrides,
});

describe("analyzeReliefLogs", () => {
  it("returns an empty, deterministic state without logs", () => {
    expect(analyzeReliefLogs([])).toEqual({
      totalEntries: 0,
      averageRelief: null,
      trend: "insufficient-data",
      bestStrains: [],
      fitCounts: { "too-strong": 0, "just-right": 0, "too-weak": 0 },
      insights: [],
    });
  });

  it("ranks strains and detects an improving recent half", () => {
    const result = analyzeReliefLogs([
      log({ createdAt: 1, relief: 2 }),
      log({ createdAt: 2, relief: 2 }),
      log({ createdAt: 3, relief: 4, strainName: "Northern Lights" }),
      log({ createdAt: 4, relief: 5, strainName: "Northern Lights", fit: "too-strong" }),
    ]);

    expect(result.trend).toBe("improving");
    expect(result.averageRelief).toBe(3.3);
    expect(result.fitCounts["too-strong"]).toBe(1);
    expect(result.bestStrains[0]).toMatchObject({
      strainName: "Northern Lights",
      entries: 2,
      averageRelief: 4.5,
      justRightRate: 0.5,
    });
  });
});
