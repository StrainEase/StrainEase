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

const PDF_TIMEOUT_MS = 60_000;

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

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
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
