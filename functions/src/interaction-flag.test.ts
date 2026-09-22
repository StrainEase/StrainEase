import { describe, expect, test } from "bun:test";
import {
  flagInteractionForStrain,
  HIGH_THC_THRESHOLD,
} from "./interaction-flag";
import type { InteractionRecord } from "./reference-library";

const HIGH_THC_STRAIN = { thcRange: "20-26%" };
const LOW_THC_STRAIN = { thcRange: "8-12%" };
const NO_THC_STRAIN = {};

function ssriRecord(): InteractionRecord {
  return {
    slug: "sertraline",
    drugName: "Sertraline",
    drugClass: "SSRI",
    cannabisInteraction: {
      severity: "low",
      mechanism: "Survey-level signal.",
      commonGuidance:
        "Start with a low-THC or CBD-dominant product and watch for amplified anxiety or racing heart.",
      discussWithPrescriber: true,
    },
    sources: [],
  };
}

function benzodiazepineRecord(): InteractionRecord {
  return {
    slug: "alprazolam",
    drugName: "Alprazolam",
    drugClass: "benzodiazepine",
    cannabisInteraction: {
      severity: "moderate",
      mechanism: "Additive sedation.",
      commonGuidance:
        "Cannabis can compound the sedative effect; avoid driving or operating machinery until you know how the combination affects you.",
      discussWithPrescriber: true,
    },
    sources: [],
  };
}

function theoreticalRecord(): InteractionRecord {
  return {
    slug: "future-drug",
    drugName: "Future Drug",
    drugClass: "other",
    cannabisInteraction: {
      severity: "theoretical",
      mechanism: "Hypothetical CYP3A4 concern.",
      commonGuidance: "No real-world signal.",
      discussWithPrescriber: true,
    },
    sources: [],
  };
}

describe("flagInteractionForStrain", () => {
  test("returns null when the patient has no interactions on file", () => {
    expect(flagInteractionForStrain(HIGH_THC_STRAIN, [])).toBeNull();
  });

  test("returns null when the strain is below the high-THC threshold", () => {
    expect(flagInteractionForStrain(LOW_THC_STRAIN, [ssriRecord()])).toBeNull();
  });

  test("returns null when the strain has no THC data", () => {
    expect(flagInteractionForStrain(NO_THC_STRAIN, [ssriRecord()])).toBeNull();
  });

  test("returns null when only theoretical records are on file", () => {
    expect(
      flagInteractionForStrain(HIGH_THC_STRAIN, [theoreticalRecord()]),
    ).toBeNull();
  });

  test("attaches the SSRI flag for a high-THC strain on sertraline", () => {
    const flag = flagInteractionForStrain(HIGH_THC_STRAIN, [ssriRecord()]);
    expect(flag).not.toBeNull();
    expect(flag?.drugClass).toBe("SSRI");
    expect(flag?.severity).toBe("low");
    expect(flag?.summary).toContain("low-THC");
  });

  test("picks the worst-severity class when multiple are on file", () => {
    const flag = flagInteractionForStrain(HIGH_THC_STRAIN, [
      ssriRecord(),
      benzodiazepineRecord(),
    ]);
    expect(flag?.drugClass).toBe("benzodiazepine");
    expect(flag?.severity).toBe("moderate");
  });

  test("dedupes drug classes — worst record per class wins", () => {
    const mildSSRI: InteractionRecord = {
      ...ssriRecord(),
      drugName: "Citalopram",
      slug: "citalopram",
      cannabisInteraction: {
        ...ssriRecord().cannabisInteraction,
        severity: "low",
      },
    };
    const strongSSRI: InteractionRecord = {
      ...ssriRecord(),
      drugName: "Sertraline high",
      slug: "sertraline-high",
      cannabisInteraction: {
        ...ssriRecord().cannabisInteraction,
        severity: "moderate",
      },
    };
    const flag = flagInteractionForStrain(HIGH_THC_STRAIN, [
      mildSSRI,
      strongSSRI,
    ]);
    expect(flag?.drugClass).toBe("SSRI");
    expect(flag?.severity).toBe("moderate");
  });

  test("clamps the summary to one line", () => {
    const longGuidance =
      "This is a deliberately verbose guidance string. ".repeat(20).trim();
    const record: InteractionRecord = {
      ...ssriRecord(),
      cannabisInteraction: {
        ...ssriRecord().cannabisInteraction,
        commonGuidance: longGuidance,
      },
    };
    const flag = flagInteractionForStrain(HIGH_THC_STRAIN, [record]);
    expect(flag?.summary).toBeTruthy();
    expect(flag?.summary.length ?? 0).toBeLessThanOrEqual(160);
    expect(flag?.summary).not.toContain("\n");
  });

  test("ignores theoretical records even when the worst-ranked class is theoretical", () => {
    const flag = flagInteractionForStrain(HIGH_THC_STRAIN, [
      theoreticalRecord(),
      ssriRecord(),
    ]);
    expect(flag?.drugClass).toBe("SSRI");
  });

  test("accepts strains at the boundary THC midpoint", () => {
    const exactThreshold = { thcRange: `${HIGH_THC_THRESHOLD}%` };
    expect(flagInteractionForStrain(exactThreshold, [ssriRecord()])).not.toBeNull();
    const justBelow = { thcRange: `${HIGH_THC_THRESHOLD - 1}%` };
    expect(flagInteractionForStrain(justBelow, [ssriRecord()])).toBeNull();
  });
});