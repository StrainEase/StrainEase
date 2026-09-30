import { describe, expect, test } from "bun:test";
import { __testing } from "./index";

const {
  CLINICIAN_REPORT_SYSTEM_PROMPT,
  clinicianReportPrompt,
  normalizeClinicianReport,
} = __testing;

describe("CLINICIAN_REPORT_SYSTEM_PROMPT", () => {
  test("instructs the model to write prose, not diagnoses, and to ground every claim in the snapshot", () => {
    const prompt = CLINICIAN_REPORT_SYSTEM_PROMPT;
    expect(prompt).toContain("summary");
    expect(prompt).toContain("considerations");
    expect(prompt).toContain("Do NOT invent facts");
    expect(prompt).toContain("Never advise discontinuing a medication");
  });
});

describe("clinicianReportPrompt", () => {
  test("includes the snapshot and the language clause", () => {
    const prompt = clinicianReportPrompt(
      { patient: { name: "Pat" } },
      "English",
    );
    expect(prompt).toContain("Pat");
    expect(prompt).toContain("English");
  });
});

describe("normalizeClinicianReport", () => {
  test("parses summary and considerations from JSON", () => {
    const out = normalizeClinicianReport(
      JSON.stringify({
        summary: "First paragraph.\n\nSecond paragraph.",
        considerations: ["C1", "C2", "C3"],
      }),
    );
    expect(out.summary).toContain("First paragraph");
    expect(out.considerations).toHaveLength(3);
  });

  test("clamps considerations to 6 items and drops empties", () => {
    const out = normalizeClinicianReport(
      JSON.stringify({
        summary: "ok",
        considerations: ["a", "  ", "b", "c", "d", "e", "f", "g"],
      }),
    );
    expect(out.considerations).toEqual(["a", "b", "c", "d", "e", "f"]);
  });

  test("returns the fallback summary when the model emits nothing parseable", () => {
    const out = normalizeClinicianReport("not json at all");
    expect(out.summary).toMatch(/don't have a clinical summary/i);
    expect(out.considerations).toEqual([]);
  });
});
