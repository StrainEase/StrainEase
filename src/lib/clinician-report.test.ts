import { describe, expect, test } from "bun:test";
import { buildClinicianReport, reportHeadline } from "./clinician-report";
import type { AuthUser } from "@/hooks/use-auth";
import type { CheckIn } from "@/lib/check-ins";
import type { ReliefLog } from "@/lib/relief-log";
import type { MedicationDoc } from "@/lib/medications";

const NOW = Date.parse("2026-08-31T12:00:00");

const user: AuthUser = {
  uid: "u1",
  email: "pat@example.com",
  name: "Pat Patient",
};

const medications: MedicationDoc[] = [
  { id: "m1", name: "Lexapro", addedAt: NOW - 1000 },
];

function makeLog(daysAgo: number, partial: Partial<ReliefLog>): ReliefLog {
  return {
    id: `log-${daysAgo}`,
    strainName: "Blue Dream",
    conditions: ["Insomnia"],
    fit: "just-right",
    relief: 4,
    createdAt: NOW - daysAgo * 24 * 60 * 60 * 1000,
    ...partial,
  };
}

function makeCheckIn(daysAgo: number, mood: number, sleep: number, pain: number, anxiety: number): CheckIn {
  const ts = NOW - daysAgo * 24 * 60 * 60 * 1000;
  const date = new Date(ts);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return {
    id: `${y}-${m}-${d}`,
    date: `${y}-${m}-${d}`,
    metrics: { mood, sleep, pain, anxiety },
    note: "",
    createdAt: ts,
    updatedAt: ts,
  };
}

describe("buildClinicianReport", () => {
  test("normalizes conditions and clamps check-in trend to 14 days", () => {
    const report = buildClinicianReport({
      user,
      ailments: ["  Anxiety ", "anxiety", "OCD"],
      medications,
      checkIns: [makeCheckIn(0, 4, 3, 2, 5), makeCheckIn(40, 2, 2, 4, 5)],
      reliefLogs: [],
      savedStrains: [],
      now: NOW,
    });
    expect(report.conditions).toEqual(["Anxiety", "OCD"]);
    expect(report.checkIns.window).toBe(14);
    expect(report.checkIns.trend.days).toHaveLength(14);
  });

  test("filters relief logs to the last 30 days and surfaces top strains", () => {
    const report = buildClinicianReport({
      user,
      ailments: [],
      medications: [],
      checkIns: [],
      reliefLogs: [
        makeLog(2, { strainName: "Blue Dream", relief: 5, conditions: ["Insomnia"] }),
        makeLog(3, { strainName: "Blue Dream", relief: 4, conditions: ["Insomnia"] }),
        makeLog(5, { strainName: "Godfather OG", fit: "too-strong", relief: 2 }),
        makeLog(5, { strainName: "Godfather OG", fit: "too-strong", relief: 2 }),
        // Outside the 30-day window — must be excluded from the analysis
        makeLog(60, { strainName: "Ancient", relief: 1, conditions: ["Pain"] }),
      ],
      savedStrains: [],
      now: NOW,
    });
    expect(report.reliefLogs.totalInWindow).toBe(4);
    expect(report.reliefLogs.recent.map((l) => l.strainName)).not.toContain("Ancient");
    expect(report.reliefLogs.topStrains[0]?.strain).toBe("Blue Dream");
    expect(report.reliefLogs.avoid[0]?.strainName).toBe("Godfather OG");
  });

  test("orders recent relief logs newest first", () => {
    const report = buildClinicianReport({
      user,
      ailments: [],
      medications: [],
      checkIns: [],
      reliefLogs: [
        makeLog(5, { strainName: "A" }),
        makeLog(1, { strainName: "B" }),
        makeLog(3, { strainName: "C" }),
      ],
      savedStrains: [],
      now: NOW,
    });
    expect(report.reliefLogs.recent.map((l) => l.strainName)).toEqual(["B", "C", "A"]);
  });
});

describe("reportHeadline", () => {
  test("includes the display name and the generated date", () => {
    const report = buildClinicianReport({
      user,
      ailments: [],
      medications: [],
      checkIns: [],
      reliefLogs: [],
      savedStrains: [],
      now: NOW,
    });
    const headline = reportHeadline(report);
    expect(headline).toContain("Pat Patient");
    expect(headline).toContain("2026");
  });
});
