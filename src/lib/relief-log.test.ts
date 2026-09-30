import { describe, expect, test } from "bun:test";
import {
  clipReliefStrainName,
  isHelpfulLog,
  normalizeSessionForm,
  normalizeSessionTimeOfDay,
  normalizeWouldRepeat,
  personalHitRate,
  RELIEF_DOSE_MAX,
  RELIEF_NOTE_MAX,
  RELIEF_STRAIN_NAME_MAX,
  reliefLogCreateData,
  type ReliefLog,
} from "./relief-log";

const BASE_LOG: Omit<ReliefLog, "id" | "createdAt"> = {
  strainName: "Blue Dream",
  conditions: ["insomnia"],
  fit: "just-right",
  relief: 4,
  note: "",
};

describe("reliefLogCreateData", () => {
  test("clips strainName to the Firestore rule max (size < 80)", () => {
    const name = "A".repeat(80);
    const doc = reliefLogCreateData({
      ...BASE_LOG,
      strainName: name,
    });
    expect(clipReliefStrainName(name).length).toBe(RELIEF_STRAIN_NAME_MAX);
    expect(doc.strainName.length).toBe(79);
    expect(doc.strainName.length).toBeLessThan(80);
  });

  test("writes the session-journal fields when provided", () => {
    const doc = reliefLogCreateData({
      ...BASE_LOG,
      form: "edible",
      doseMg: 10,
      timeOfDay: "night",
      onsetMinutes: 60,
      sideEffects: ["dry-mouth", "anxiety"],
      wouldRepeat: true,
    });
    expect(doc.form).toBe("edible");
    expect(doc.doseMg).toBe(10);
    expect(doc.timeOfDay).toBe("night");
    expect(doc.onsetMinutes).toBe(60);
    expect(doc.sideEffects).toEqual(["dry-mouth", "anxiety"]);
    expect(doc.wouldRepeat).toBe(true);
  });

  test("drops unknown side-effect strings", () => {
    const doc = reliefLogCreateData({
      ...BASE_LOG,
      // @ts-expect-error: intentionally bad input
      sideEffects: ["dry-mouth", "not-a-real-effect", "anxiety"],
    });
    expect(doc.sideEffects).toEqual(["dry-mouth", "anxiety"]);
  });

  test("clamps doseMg to the rule max", () => {
    const doc = reliefLogCreateData({
      ...BASE_LOG,
      doseMg: 9999,
    });
    expect(doc.doseMg).toBe(RELIEF_DOSE_MAX);
  });

  test("clamps onsetMinutes to 240", () => {
    const doc = reliefLogCreateData({
      ...BASE_LOG,
      onsetMinutes: 600,
    });
    expect(doc.onsetMinutes).toBe(240);
  });

  test("truncates note to RELIEF_NOTE_MAX", () => {
    const doc = reliefLogCreateData({
      ...BASE_LOG,
      note: "x".repeat(RELIEF_NOTE_MAX + 50),
    });
    expect(doc.note.length).toBe(RELIEF_NOTE_MAX);
  });

  test("omits optional fields when not provided", () => {
    const doc = reliefLogCreateData(BASE_LOG);
    expect("form" in doc).toBe(false);
    expect("doseMg" in doc).toBe(false);
    expect("timeOfDay" in doc).toBe(false);
    expect("onsetMinutes" in doc).toBe(false);
    expect("sideEffects" in doc).toBe(false);
    expect("wouldRepeat" in doc).toBe(false);
  });
});

describe("isHelpfulLog", () => {
  test("counts just-right + relief >= 4 as a hit", () => {
    expect(
      isHelpfulLog({
        ...BASE_LOG,
        id: "x",
        createdAt: 0,
        fit: "just-right",
        relief: 4,
      }),
    ).toBe(true);
  });
  test("rejects too-strong even with high relief", () => {
    expect(
      isHelpfulLog({
        ...BASE_LOG,
        id: "x",
        createdAt: 0,
        fit: "too-strong",
        relief: 5,
      }),
    ).toBe(false);
  });
  test("rejects just-right with relief below 4", () => {
    expect(
      isHelpfulLog({
        ...BASE_LOG,
        id: "x",
        createdAt: 0,
        fit: "just-right",
        relief: 3,
      }),
    ).toBe(false);
  });
});

describe("personalHitRate", () => {
  function log(
    strainName: string,
    condition: string,
    fit: ReliefLog["fit"],
    relief: number,
  ): ReliefLog {
    return {
      id: `${strainName}-${condition}-${Math.random()}`,
      strainName,
      conditions: [condition],
      fit,
      relief,
      note: "",
      createdAt: 0,
    };
  }

  test("returns null when the strain isn't logged", () => {
    const rate = personalHitRate([], "Blue Dream");
    expect(rate).toBeNull();
  });

  test("returns null until the patient has at least 3 logs", () => {
    const logs = [
      log("Blue Dream", "insomnia", "just-right", 5),
      log("Blue Dream", "insomnia", "just-right", 4),
    ];
    const rate = personalHitRate(logs, "Blue Dream", "insomnia");
    expect(rate).not.toBeNull();
    expect(rate?.sufficient).toBe(false);
    expect(rate?.total).toBe(2);
  });

  test("computes a hit rate for a condition with enough data", () => {
    const logs = [
      log("Blue Dream", "insomnia", "just-right", 5),
      log("Blue Dream", "insomnia", "just-right", 4),
      log("Blue Dream", "insomnia", "too-strong", 2),
    ];
    const rate = personalHitRate(logs, "Blue Dream", "insomnia");
    expect(rate).toEqual({
      strainName: "Blue Dream",
      condition: "insomnia",
      total: 3,
      hits: 2,
      rate: 0.67,
      sufficient: true,
    });
  });

  test("returns null when the condition slice is empty", () => {
    const logs = [
      log("Blue Dream", "anxiety", "just-right", 5),
      log("Blue Dream", "insomnia", "just-right", 4),
      log("Blue Dream", "pain", "just-right", 4),
    ];
    const rate = personalHitRate(logs, "Blue Dream", "focus");
    expect(rate).toBeNull();
  });

  test("scores against any condition when none is given", () => {
    const logs = [
      log("Blue Dream", "anxiety", "just-right", 5),
      log("Blue Dream", "insomnia", "just-right", 4),
      log("Blue Dream", "pain", "just-right", 4),
    ];
    const rate = personalHitRate(logs, "Blue Dream");
    expect(rate?.total).toBe(3);
    expect(rate?.condition).toBeNull();
  });
});

describe("normalizers", () => {
  test("normalizeSessionForm accepts the closed enum only", () => {
    expect(normalizeSessionForm("flower")).toBe("flower");
    expect(normalizeSessionForm("dab")).toBeNull();
    expect(normalizeSessionForm(null)).toBeNull();
    expect(normalizeSessionForm(42)).toBeNull();
  });

  test("normalizeSessionTimeOfDay accepts the closed enum only", () => {
    expect(normalizeSessionTimeOfDay("evening")).toBe("evening");
    expect(normalizeSessionTimeOfDay("dawn")).toBeNull();
  });

  test("normalizeWouldRepeat accepts booleans only", () => {
    expect(normalizeWouldRepeat(true)).toBe(true);
    expect(normalizeWouldRepeat("yes")).toBeNull();
    expect(normalizeWouldRepeat(0)).toBeNull();
  });
});
