// StrainEase report/PDF backend (split from functions/ to keep Puppeteer/Chromium
// out of the public scraper cold start).
//
// Exposes two auth-gated callables:
//   - clinicianReportSummary: prose-only, JSON in/out, used by the legacy surfaces.
//   - generateClinicianReportPdf: full PDF, base64-encoded payload.
//
// The shared helpers (compactJson, parseOutputLanguage, withLanguageClause,
// normalizeEscapedNewlines, KAYA_CORE) are intentionally duplicated from
// functions/src/index.ts — Firebase Functions v2 deploys each codebase as an
// independent artifact, so cross-codebase imports are not safe at runtime.

import {
  HttpsError,
  onCall,
  type CallableOptions,
} from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import { getFirestore } from "firebase-admin/firestore";
import { callGroq, extractJsonObject } from "./groq";
import {
  loadClinicianReport,
  serializeReportForModel,
  type ClinicianReport,
} from "./clinician-report-data";
import { renderClinicianReportHtml } from "./clinician-report-html";
import { buildReportFilename, renderHtmlToPdf } from "./clinician-report-pdf";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const GROQ_API_KEY = defineSecret("GROQ_API_KEY");

const AI_OPTIONS: CallableOptions = {
  secrets: [GROQ_API_KEY],
  timeoutSeconds: 120,
  memory: "512MiB",
};

// ── Shared helpers (duplicated from functions/src/index.ts) ──────────

function compactJson(value: unknown): string {
  return JSON.stringify(value);
}

const DEFAULT_OUTPUT_LANGUAGE = "English";

function parseOutputLanguage(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_OUTPUT_LANGUAGE;
  const trimmed = value.trim();
  if (trimmed === "") return DEFAULT_OUTPUT_LANGUAGE;
  if (trimmed.length > 40) return DEFAULT_OUTPUT_LANGUAGE;
  if (/[\r\n]/.test(trimmed)) return DEFAULT_OUTPUT_LANGUAGE;
  if (!/^[\p{L} ()'-]+$/u.test(trimmed)) return DEFAULT_OUTPUT_LANGUAGE;
  return trimmed;
}

function withLanguageClause(base: string, language: string): string {
  return (
    `${base}\n\n` +
    `Language pinning:\n` +
    `- Write the entire response in ${language}. Do not switch into any other language, even briefly — including proper nouns, examples, or strain names; transliterate or translate foreign-language text instead of copying it verbatim.`
  );
}

function normalizeEscapedNewlines(s: string): string {
  return s.replace(/\\n/g, "\n");
}

const KAYA_CORE = `You are Dr. Kaya, StrainEase's AI cannabis care assistant. You write for patients, not budtenders: precise, calm, practical, low-jargon; define any technical term in a short phrase. Lead with symptom relief and day-to-day usability.`;

// ── Clinician report ──────────────────────────────────────────────────

export type ClinicianReportSummary = {
  /** 2-3 short paragraphs of prose. */
  summary: string;
  /** 3-5 short clinical-style considerations (one per line). */
  considerations: string[];
};

const CLINICIAN_REPORT_SYSTEM_PROMPT = `${KAYA_CORE}

Task: write a concise clinical-style summary of a StrainEase patient from the structured snapshot below. The output is for a clinician (physician, NP, dispensary pharmacist) — not the patient — and will be printed on a single page.
- Ground every claim in the supplied snapshot. Do NOT invent facts (no diagnoses, no specific THC/CBD numbers beyond what the patient logged, no medication names that are not in the list). If a field is empty, say so plainly ("no relief logs in the last 30 days").
- Keep the prose 2-3 short paragraphs (1-3 sentences each), separated by a single blank line. No markdown, no headings, no bullet lists in the prose body.
- "considerations" is a 3-5 line list of short, practical items the clinician may want to weigh (e.g. "Sedating profile at night, monitor next-day drowsiness", "Patient is also on Lexapro — note any additive serotonergic load with high-THC sativa"). Frame as neutral observations, not prescriptions. Never tell the clinician what to prescribe. Never advise discontinuing a medication.
- If the patient is on medications and the patient's relief logs reference a strain class, mention any widely-cited interaction class in one line of the considerations (e.g. "benzodiazepine + sedating strain → monitor additive sedation"). When in doubt, omit.
- Use the language clause injected at the end of this prompt.

JSON shape (all fields required):
{
  "summary": "2-3 short paragraphs of prose, separated by a single \\n\\n",
  "considerations": ["short practical item 1", "short practical item 2", "short practical item 3"]
}`;

function clinicianReportPrompt(snapshot: unknown, language: string): string {
  return [
    `Patient snapshot (assembled locally from the patient's StrainEase account; do not invent data outside this object):`,
    compactJson(snapshot),
    ``,
    `Language clause: respond in ${language}.`,
    ``,
    `Write the JSON exactly as specified.`,
  ].join("\n");
}

function normalizeClinicianReport(content: string): ClinicianReportSummary {
  const obj = extractJsonObject(content) as {
    summary?: unknown;
    considerations?: unknown;
  } | null;
  const summary =
    obj && typeof obj.summary === "string"
      ? normalizeEscapedNewlines(obj.summary.trim())
      : "";
  const considerations =
    obj && Array.isArray(obj.considerations)
      ? (obj.considerations as unknown[])
          .filter((x): x is string => typeof x === "string")
          .map((x) => x.trim())
          .filter((x) => x !== "")
          .slice(0, 6)
      : [];
  if (summary === "") {
    return {
      summary:
        "We don't have a clinical summary for this patient right now. Tap again in a moment.",
      considerations,
    };
  }
  return { summary, considerations };
}

/**
 * Generate the prose section of the clinician report. Auth-gated: the
 * patient must be signed in because the payload includes their saved
 * ailments, medications, and relief log. The page calls this from a
 * button, so we never run it on page-load (no surprise billing) and
 * guests don't hit the rate-limited path here.
 */
export const clinicianReportSummary = onCall(
  AI_OPTIONS,
  async (request): Promise<ClinicianReportSummary> => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Sign in to generate a clinician report.",
      );
    }
    const data = (request.data ?? {}) as {
      snapshot?: unknown;
      language?: unknown;
    };
    const language = parseOutputLanguage(data.language);
    if (!data.snapshot || typeof data.snapshot !== "object") {
      throw new HttpsError(
        "invalid-argument",
        "Provide a patient snapshot built from buildClinicianReport.",
      );
    }
    const content = await callGroq(GROQ_API_KEY.value(), [
      {
        role: "system",
        content: withLanguageClause(CLINICIAN_REPORT_SYSTEM_PROMPT, language),
      },
      {
        role: "user",
        content: clinicianReportPrompt(data.snapshot, language),
      },
    ]);
    return normalizeClinicianReport(content);
  },
);

/**
 * Server-side PDF generator. Reads the patient snapshot via the
 * Admin SDK, calls Groq for Dr. Kaya's prose section, and renders a
 * PDF with Puppeteer + @sparticuz/chromium. Returns the PDF as
 * base64 so the callable fits inside the 10MB response limit (a
 * single patient's report is typically 100KB-2MB).
 *
 * This is the canonical "generate report" path for every client
 * (web, iOS, Android). The standalone `clinicianReportSummary`
 * callable above stays for backwards compatibility but the
 * `/report` page and the iOS/Android surfaces should call this.
 */
export const generateClinicianReportPdf = onCall(
  {
    ...AI_OPTIONS,
    memory: "1GiB",
    timeoutSeconds: 180,
    cpu: 1,
  },
  async (
    request,
  ): Promise<{
    pdfBase64: string;
    filename: string;
    contentType: "application/pdf";
    byteLength: number;
    kayaIncluded: boolean;
  }> => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Sign in to generate a clinician report.",
      );
    }
    const data = (request.data ?? {}) as {
      language?: unknown;
      includeKayaSummary?: unknown;
    };
    const language = parseOutputLanguage(data.language);
    const includeKaya = data.includeKayaSummary !== false;
    const uid = request.auth.uid;

    const report = await loadClinicianReport(uid);

    const kaya = includeKaya
      ? await safeKayaSummary(report, language, GROQ_API_KEY.value())
      : null;

    const html = renderClinicianReportHtml(report, kaya, loadBrandLogoSvg());
    const pdf = await renderHtmlToPdf(html);
    const filename = buildReportFilename(
      report.patient.displayName,
      report.patient.generatedOn,
    );
    return {
      pdfBase64: pdf.toString("base64"),
      filename,
      contentType: "application/pdf",
      byteLength: pdf.byteLength,
      kayaIncluded: kaya !== null,
    };
  },
);

/**
 * Generate the Kaya prose section for the PDF. Mirrors the standalone
 * `clinicianReportSummary` callable but is fault-tolerant: if the
 * model call fails or times out, we ship the PDF without the prose
 * section rather than failing the whole request.
 */
async function safeKayaSummary(
  report: ClinicianReport,
  language: string,
  apiKey: string,
): Promise<{ summary: string; considerations: string[] } | null> {
  try {
    const content = await callGroq(apiKey, [
      {
        role: "system",
        content: withLanguageClause(CLINICIAN_REPORT_SYSTEM_PROMPT, language),
      },
      {
        role: "user",
        content: clinicianReportPrompt(
          serializeReportForModel(report),
          language,
        ),
      },
    ]);
    return normalizeClinicianReport(content);
  } catch (err) {
    logger.warn("Kaya summary failed; rendering PDF without it", err as Error);
    return null;
  }
}

/**
 * Lazily read the brand SVG used in the PDF header. The build
 * script copies `src/assets/clinician-report-logo.svg` next to the
 * compiled JS so this read is fully self-contained inside the
 * function's `lib/` directory.
 */
let cachedBrandLogo: string | null = null;
function loadBrandLogoSvg(): string {
  if (cachedBrandLogo !== null) return cachedBrandLogo;
  // The compiled function lives at functions-report/lib/index.js; the SVG
  // is at functions-report/lib/clinician-report-logo.svg (copied by
  // scripts/copy-assets.mjs after tsc).
  const candidates = [
    "./clinician-report-logo.svg",
    "./lib/clinician-report-logo.svg",
  ];
  for (const rel of candidates) {
    try {
      const resolved = resolve(__dirname, rel);
      cachedBrandLogo = readFileSync(resolved, "utf8");
      return cachedBrandLogo;
    } catch {
      // try next
    }
  }
  logger.warn("Brand SVG not found in lib/; using inline fallback");
  cachedBrandLogo =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">` +
    `<rect width="1024" height="1024" rx="200" fill="#0c5238"/>` +
    `<text x="512" y="640" text-anchor="middle" font-family="-apple-system,Helvetica,Arial,sans-serif" font-size="640" font-weight="700" fill="#ffffff">S</text>` +
    `</svg>`;
  return cachedBrandLogo;
}

export const __testing = {
  CLINICIAN_REPORT_SYSTEM_PROMPT,
  clinicianReportPrompt,
  normalizeClinicianReport,
  parseOutputLanguage,
  withLanguageClause,
};
