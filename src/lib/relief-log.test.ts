import { describe, expect, test } from "bun:test";
import { clipReliefStrainName, RELIEF_STRAIN_NAME_MAX, reliefLogCreateData } from "./relief-log";

describe("reliefLogCreateData", () => {
  test("clips strainName to the Firestore rule max (size < 80)", () => {
    const name = "A".repeat(80);
    const doc = reliefLogCreateData({
      strainName: name,
      conditions: [],
      fit: "just-right",
      relief: 4,
    });
    expect(clipReliefStrainName(name).length).toBe(RELIEF_STRAIN_NAME_MAX);
    expect(doc.strainName.length).toBe(79);
    expect(doc.strainName.length).toBeLessThan(80);
  });
});
