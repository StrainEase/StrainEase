import { describe, expect, test } from "bun:test";
import { renderClinicianReportHtml } from "./clinician-report-html";
import type { ClinicianReport } from "./clinician-report-data";

const sampleReport: ClinicianReport = {
  patient: {
    displayName: "Jane Patient",
    email: "jane@example.com",
    ageContext: "US · age 34",
    generatedAt: 1_700_000_000_000,
    generatedOn: "November 14, 2023",
  },
  conditions: ["Insomnia", "Chronic pain"],
  medications: [
    { id: "m1", name: "Lexapro", addedAt: 1_700_000_000_000 },
  ],
  checkIns: {
    window: 14,
    trend: {
      days: [
        { date: "2023-11-01", mood: 3, sleep: 2, pain: 4, anxiety: 3 },
        { date: "2023-11-02", mood: 4, sleep: 3, pain: 3, anxiety: 2 },
        { date: "2023-11-03", mood: null, sleep: null, pain: null, anxiety: null },
        { date: "2023-11-04", mood: 5, sleep: 4, pain: 3, anxiety: 2 },
      ],
      loggedDays: 3,
      averages: { mood: 4, sleep: 3, pain: 3.33, anxiety: 2.33 },
    },
    recent: [
      {
        id: "c1",
        date: "2023-11-04",
        metrics: { mood: 5, sleep: 4, pain: 3, anxiety: 2 },
        note: "Slept much better last night.",
        createdAt: 1_700_000_000_000,
        updatedAt: 1_700_000_000_000,
      },
    ],
  },
  reliefLogs: {
    windowDays: 30,
    totalInWindow: 4,
    recent: [
      {
        id: "r1",
        strainName: "Granddaddy Purple",
        conditions: ["Insomnia"],
        fit: "just-right",
        relief: 5,
        note: "Slept 8 hours, no grogginess",
        createdAt: 1_700_000_000_000,
      },
    ],
    topStrains: [
      { strain: "Granddaddy Purple", condition: "Insomnia", avgRelief: 4.5, logCount: 2 },
    ],
    avoid: [],
    insightsProse: "Top performers: Granddaddy Purple for Insomnia (4.5/5).",
  },
  savedStrains: [
    {
      slug: "gdp",
      name: "Granddaddy Purple",
      type: "indica",
      thcRange: "17-23%",
      savedAt: 1_700_000_000_000,
      notes: [
        {
          id: "n1",
          text: "Great for nighttime pain. 1 hit, 2 hours relief.",
          isPublic: true,
          createdAt: 1_700_000_000_000,
        },
      ],
    },
  ],
};

const SAMPLE_LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><rect width="1024" height="1024" rx="200" fill="#0c5238"/><text x="512" y="640" text-anchor="middle" font-size="640" fill="#fff">S</text></svg>`;

describe("renderClinicianReportHtml", () => {
  test("renders the branded header with the logo + app name", () => {
    const html = renderClinicianReportHtml(sampleReport, null, SAMPLE_LOGO);
    expect(html).toContain(SAMPLE_LOGO);
    expect(html).toContain("StrainEase");
    expect(html).toContain("Patient summary — Jane Patient");
    expect(html).toContain("November 14, 2023");
  });

  test("renders the patient facts", () => {
    const html = renderClinicianReportHtml(sampleReport, null, SAMPLE_LOGO);
    expect(html).toContain("Jane Patient");
    expect(html).toContain("jane@example.com");
    expect(html).toContain("US · age 34");
  });

  test("renders conditions as pills", () => {
    const html = renderClinicianReportHtml(sampleReport, null, SAMPLE_LOGO);
    expect(html).toContain("Insomnia");
    expect(html).toContain("Chronic pain");
    expect(html).toContain('class="pill"');
  });

  test("renders the relief log table", () => {
    const html = renderClinicianReportHtml(sampleReport, null, SAMPLE_LOGO);
    expect(html).toContain("Granddaddy Purple");
    expect(html).toContain("5/5");
  });

  test("renders saved-strain notes as text, not just a count", () => {
    const html = renderClinicianReportHtml(sampleReport, null, SAMPLE_LOGO);
    expect(html).toContain("Great for nighttime pain. 1 hit, 2 hours relief.");
    expect(html).toContain("shared with community");
  });

  test("renders the Kaya summary when provided", () => {
    const html = renderClinicianReportHtml(
      sampleReport,
      {
        summary: "Patient reports solid relief with Granddaddy Purple for insomnia.",
        considerations: ["Monitor next-day drowsiness", "Check Lexapro interaction"],
      },
      SAMPLE_LOGO,
    );
    expect(html).toContain("Dr. Kaya clinical summary");
    expect(html).toContain("Patient reports solid relief");
    expect(html).toContain("Monitor next-day drowsiness");
  });

  test("escapes HTML in user-supplied fields", () => {
    const xssReport: ClinicianReport = {
      ...sampleReport,
      patient: {
        ...sampleReport.patient,
        displayName: "<script>alert(1)</script>",
      },
    };
    const html = renderClinicianReportHtml(xssReport, null, SAMPLE_LOGO);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  test("falls back to 'no notes' copy when saved-strain notes are empty", () => {
    const noNotes: ClinicianReport = {
      ...sampleReport,
      savedStrains: [
        {
          slug: "gdp",
          name: "Granddaddy Purple",
          type: "indica",
          thcRange: "17-23%",
          savedAt: 1_700_000_000_000,
          notes: [],
        },
      ],
    };
    const html = renderClinicianReportHtml(noNotes, null, SAMPLE_LOGO);
    expect(html).toContain("Saved strains (1)");
    expect(html).not.toContain("&middot; 0 notes");
  });
});
