// Server-side PDF rendering for the Clinician Report.
//
// Puppeteer (with @sparticuz/chromium for the Lambda/serverless
// runtime) is the only practical way to keep the PDF visually
// identical to the web `/report` page without shipping the full
// React + Tailwind + asset bundle into the function. The HTML
// template in `clinician-report-html.ts` mirrors the web layout 1:1
// so clinicians see one consistent document regardless of how it
// was generated.
//
// Snapshot + Kaya summary construction lives in `index.ts` next to
// the other clinician-report helpers, so this file only owns the
// Puppeteer pipeline.

import chromium from "@sparticuz/chromium";
import puppeteer, { type Browser } from "puppeteer-core";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { logger } from "firebase-functions";
import { renderClinicianReportHtml } from "./clinician-report-html";

const PDF_TIMEOUT_MS = 60_000;

// CommonJS provides __dirname at runtime. The compiled file lives at
// functions/lib/clinician-report-pdf.js, with the SVG dropped next to
// it by scripts/copy-assets.mjs.
declare const __dirname: string;

let cachedLogoSvg: string | null = null;

/** Lazily read the brand SVG so the function bundle stays small. */
function loadBrandLogoSvg(): string {
  if (cachedLogoSvg !== null) return cachedLogoSvg;
  // The function bundle drops the source SVG next to the compiled
  // JS as `clinician-report-logo.svg`. The fallbacks cover local
  // tsc-only dev runs.
  const candidates = [
    join(__dirname, "clinician-report-logo.svg"),
    join(__dirname, "..", "assets", "clinician-report-logo.svg"),
    join(__dirname, "..", "src", "assets", "clinician-report-logo.svg"),
    join(__dirname, "..", "..", "public", "logo.svg"),
  ];
  for (const path of candidates) {
    try {
      cachedLogoSvg = readFileSync(path, "utf8");
      return cachedLogoSvg;
    } catch {
      // try next
    }
  }
  logger.warn("Brand SVG not found; falling back to inline placeholder");
  cachedLogoSvg = FALLBACK_LOGO_SVG;
  return cachedLogoSvg;
}

const FALLBACK_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><rect width="1024" height="1024" rx="200" fill="#0c5238"/><text x="512" y="640" text-anchor="middle" font-family="-apple-system,Helvetica,Arial,sans-serif" font-size="640" font-weight="700" fill="#ffffff">S</text></svg>`;

/** Render the given HTML to a PDF byte buffer via headless Chromium. */
export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  let browser: Browser | null = null;
  try {
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        "--disable-dev-shm-usage",
        "--no-sandbox",
        "--disable-gpu",
        "--font-render-hinting=none",
      ],
      defaultViewport: { width: 816, height: 1056 }, // 8.5x11 @ 96dpi
      executablePath: await chromium.executablePath(),
      headless: true,
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await withTimeout(
      page.pdf({
        format: "Letter",
        printBackground: true,
        margin: {
          top: "0.6in",
          bottom: "0.6in",
          left: "0.6in",
          right: "0.6in",
        },
      }),
      PDF_TIMEOUT_MS,
      "PDF render timed out",
    );
    return Buffer.from(pdf);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // ignore close errors; the function has already produced its result
      }
    }
  }
}

/**
 * Compose a printable filename from the patient's display name + the
 * generated date. Keeps the name filename-safe across iOS, Android,
 * and Windows file systems.
 */
export function buildReportFilename(
  displayName: string,
  generatedOn: string,
): string {
  const safe = (displayName || "patient")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const date = generatedOn.replace(/[^0-9]+/g, "-");
  return `strainease-clinician-report-${safe || "patient"}-${date}.pdf`;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
