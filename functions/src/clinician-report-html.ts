// Self-contained HTML template for the printable Clinician Report.
//
// Puppeteer renders this string into a PDF on the server, so every
// platform (web, iOS, Android) gets the same output. We deliberately
// inline all CSS — no external stylesheets, no Tailwind, no React —
// to keep the function bundle small and avoid any network fetches at
// render time. The layout is the printable twin of the web `/report`
// page so clinicians see one consistent document regardless of how it
// was generated.

import type { ClinicianReport, CheckInTrend } from "./clinician-report-data";

export type ClinicianReportSummaryLike = {
  summary: string;
  considerations: string[];
};

const METRIC_COLORS: Record<string, string> = {
  mood: "#10b981", // emerald-500
  sleep: "#0ea5e9", // sky-500
  pain: "#f43f5e", // rose-500
  anxiety: "#f59e0b", // amber-500
};

const METRIC_LABELS: Record<string, string> = {
  mood: "Mood",
  sleep: "Sleep",
  pain: "Pain",
  anxiety: "Anxiety",
};

export function renderClinicianReportHtml(
  report: ClinicianReport,
  summary: ClinicianReportSummaryLike | null,
  brandLogoSvg: string,
): string {
  const escape = (s: string) => htmlEscape(s);
  const today = report.patient.generatedOn;
  const headline = `Patient summary — ${escape(report.patient.displayName.trim() || "Patient")} · ${today}`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escape(headline)}</title>
<style>
  :root {
    --fg: #0a0a0a;
    --fg-muted: #52525b;
    --border: #e4e4e7;
    --border-soft: #f4f4f5;
    --primary: #0c5238;
    --emerald-bg: rgba(16, 185, 129, 0.08);
    --emerald-fg: #047857;
    --amber-bg: rgba(245, 158, 11, 0.06);
    --amber-border: rgba(245, 158, 11, 0.4);
    --amber-fg: #92400e;
  }
  @page { size: Letter; margin: 0.6in; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, "Helvetica Neue", Arial, sans-serif;
    color: var(--fg);
    font-size: 11pt;
    line-height: 1.5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body { padding: 0; }
  .report {
    max-width: 7.5in;
    margin: 0 auto;
  }
  .header {
    display: flex;
    align-items: center;
    gap: 12px;
    border-bottom: 1px solid var(--border);
    padding-bottom: 12px;
  }
  .header__logo {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    overflow: hidden;
    flex-shrink: 0;
    background: #ffffff;
  }
  .header__logo svg { display: block; width: 100%; height: 100%; }
  .header__text { min-width: 0; flex: 1 1 auto; }
  .eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-weight: 600;
    font-size: 9pt;
    color: var(--primary);
    margin: 0;
  }
  h1 {
    font-size: 18pt;
    font-weight: 600;
    margin: 2px 0 2px 0;
    letter-spacing: -0.01em;
  }
  h2 {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 9pt;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: var(--fg-muted);
    margin: 24px 0 8px 0;
  }
  h2 .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 999px;
    background: rgba(12, 82, 56, 0.1);
    color: var(--primary);
  }
  p { margin: 0 0 6px 0; }
  .muted { color: var(--fg-muted); }
  .meta { font-size: 9pt; color: var(--fg-muted); margin-top: 2px; }

  .card {
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 12px;
  }
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .grid-4 {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
  .stat__label {
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 8pt;
    font-weight: 600;
    color: var(--fg-muted);
    margin: 0;
  }
  .stat__value {
    font-size: 16pt;
    font-weight: 600;
    margin: 4px 0 0 0;
  }

  .pill {
    display: inline-block;
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 2px 10px;
    font-size: 10pt;
    background: #fafafa;
    margin: 0 4px 4px 0;
  }
  .pill--emerald {
    background: var(--emerald-bg);
    color: var(--emerald-fg);
    border: 1px solid rgba(16, 185, 129, 0.2);
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 8px 12px;
    margin: 0 0 6px 0;
  }
  .row--amber {
    background: var(--amber-bg);
    border-color: var(--amber-border);
  }
  .row--amber .row__name { color: var(--amber-fg); font-weight: 600; }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10pt;
  }
  th {
    text-align: left;
    background: #f4f4f5;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 8pt;
    font-weight: 600;
    color: var(--fg-muted);
    padding: 6px 8px;
    border-bottom: 1px solid var(--border);
  }
  td {
    padding: 6px 8px;
    border-bottom: 1px solid var(--border-soft);
    vertical-align: top;
  }
  tr:last-child td { border-bottom: none; }

  .sparkline { width: 100%; height: 90px; }
  .sparkline-line { fill: none; stroke-width: 1.6; }

  .strain {
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 10px 12px;
    margin: 0 0 8px 0;
  }
  .strain__head {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .strain__name { font-weight: 600; }
  .strain__meta { font-size: 9pt; color: var(--fg-muted); }
  .strain__notes {
    list-style: none;
    margin: 8px 0 0 0;
    padding: 8px 0 0 0;
    border-top: 1px solid var(--border);
  }
  .strain__notes li {
    display: flex;
    gap: 6px;
    font-size: 10pt;
    line-height: 1.5;
    margin: 0 0 4px 0;
  }
  .strain__notes li::before {
    content: "✎";
    color: var(--primary);
    flex-shrink: 0;
  }
  .strain__notes .note-meta {
    font-size: 8pt;
    color: var(--fg-muted);
    margin-top: 2px;
  }

  .kaya__summary {
    white-space: pre-line;
    font-size: 11pt;
    line-height: 1.65;
  }
  .kaya__list {
    list-style: none;
    margin: 8px 0 0 0;
    padding: 0;
  }
  .kaya__list li {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    font-size: 10.5pt;
    line-height: 1.55;
    margin: 0 0 4px 0;
  }
  .kaya__list li::before {
    content: "";
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: var(--primary);
    margin-top: 7px;
    flex-shrink: 0;
  }

  .footer {
    margin-top: 36px;
    border-top: 1px solid var(--border);
    padding-top: 8px;
    font-size: 8pt;
    color: var(--fg-muted);
    line-height: 1.5;
  }

  .empty {
    color: var(--fg-muted);
    font-size: 10pt;
  }
</style>
</head>
<body>
<main class="report">
  ${renderHeader(headline, brandLogoSvg, report)}
  ${renderPatientFacts(report)}
  ${renderConditions(report)}
  ${renderMedications(report)}
  ${renderCheckIns(report)}
  ${renderReliefLogs(report)}
  ${renderInsights(report)}
  ${renderSavedStrains(report)}
  ${renderKayaSummary(summary)}
  ${renderFooter()}
</main>
</body>
</html>`;
}

function renderHeader(headline: string, brandLogoSvg: string, report: ClinicianReport): string {
  return `
<header class="header">
  <div class="header__logo" aria-hidden="true">${brandLogoSvg}</div>
  <div class="header__text">
    <p class="eyebrow">StrainEase</p>
    <h1>${htmlEscape(headline)}</h1>
    <p class="meta">Generated ${htmlEscape(report.patient.generatedOn)} · age context: ${htmlEscape(report.patient.ageContext)}</p>
  </div>
</header>`;
}

function renderPatientFacts(report: ClinicianReport): string {
  const rows = [
    { label: "Display name", value: report.patient.displayName },
    { label: "Email", value: report.patient.email ?? "— not on file —" },
    { label: "Age context", value: report.patient.ageContext },
    { label: "Report window", value: "Last 30 days (relief), last 14 days (check-ins)" },
  ];
  return section(
    "Patient facts",
    icon("🩺"),
    `<div class="grid-2">
      ${rows
        .map(
          (r) => `
        <div class="card">
          <p class="stat__label">${htmlEscape(r.label)}</p>
          <p class="stat__value" style="font-size:12pt; font-weight:500; margin-top:4px;">${htmlEscape(r.value)}</p>
        </div>`,
        )
        .join("")}
    </div>`,
  );
}

function renderConditions(report: ClinicianReport): string {
  if (report.conditions.length === 0) {
    return section(
      "Active conditions",
      icon("📋"),
      `<p class="empty">No saved conditions on file. Consider asking which symptoms the patient is actively treating.</p>`,
    );
  }
  return section(
    "Active conditions",
    icon("📋"),
    `<div>${report.conditions
      .map((c) => `<span class="pill">${htmlEscape(c)}</span>`)
      .join("")}</div>`,
  );
}

function renderMedications(report: ClinicianReport): string {
  if (report.medications.length === 0) {
    return section(
      "Current medications",
      icon("💊"),
      `<p class="empty">No medications logged. Confirm any current prescriptions directly with the patient.</p>`,
    );
  }
  return section(
    "Current medications",
    icon("💊"),
    `<div>
      ${report.medications
        .map(
          (m) => `
        <div class="row">
          <span>${htmlEscape(m.name)}</span>
          <span class="muted" style="font-size:9pt;">added ${formatDate(m.addedAt)}</span>
        </div>`,
        )
        .join("")}
    </div>`,
  );
}

function renderCheckIns(report: ClinicianReport): string {
  const trend = report.checkIns.trend;
  return section(
    `Daily check-ins · last ${report.checkIns.window} days`,
    icon("📅"),
    trend.loggedDays === 0
      ? `<p class="empty">No check-ins logged in this window. Consider asking the patient to start a daily log on the dashboard.</p>`
      : `
        <div class="card">${renderSparkline(trend)}</div>
        <div class="grid-4" style="margin-top:8px;">
          ${["mood", "sleep", "pain", "anxiety"]
            .map(
              (m) => `
            <div class="card">
              <p class="stat__label">${METRIC_LABELS[m]}</p>
              <p class="stat__value">${trend.averages ? trend.averages[m as keyof typeof trend.averages].toFixed(1) + "/5" : "—"}</p>
            </div>`,
            )
            .join("")}
        </div>
        <p class="meta" style="margin-top:6px;">${trend.loggedDays} of ${trend.days.length} days logged.</p>
        ${renderRecentCheckIns(report.checkIns.recent)}`,
  );
}

function renderRecentCheckIns(recent: ClinicianReport["checkIns"]["recent"]): string {
  const withNotes = recent.filter((c) => c.note.trim() !== "");
  if (recent.length === 0) return "";
  return `
    <details style="margin-top:8px;" class="card">
      <summary class="stat__label" style="cursor:pointer;">Recent check-in notes (${recent.length})</summary>
      <ul style="list-style:none; padding:0; margin:8px 0 0 0;">
        ${withNotes
          .map(
            (c) => `
          <li style="margin:0 0 6px 0;">
            <p class="stat__label" style="margin:0;">${htmlEscape(c.date)}</p>
            <p style="margin:0;">${htmlEscape(c.note)}</p>
          </li>`,
          )
          .join("")}
        ${withNotes.length === 0 ? `<li class="empty">No notes on the recent check-ins.</li>` : ""}
      </ul>
    </details>`;
}

function renderSparkline(trend: CheckInTrend): string {
  const W = 600;
  const H = 90;
  const PAD = 8;
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;
  const stepX = trend.days.length > 1 ? innerW / (trend.days.length - 1) : 0;
  const metrics = ["mood", "sleep", "pain", "anxiety"];
  const lines: string[] = [];
  for (const m of metrics) {
    const color = METRIC_COLORS[m];
    const points: string[] = [];
    trend.days.forEach((d, i) => {
      const v = d[m as keyof typeof d];
      if (typeof v === "number") {
        const x = PAD + i * stepX;
        // Pain + anxiety are "high is bad" — invert for visual so all
        // 4 lines trend up = good. 1 → bottom, 5 → top.
        const y = PAD + innerH - ((v - 1) / 4) * innerH;
        points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      }
    });
    if (points.length === 0) continue;
    lines.push(
      `<polyline class="sparkline-line" points="${points.join(" ")}" stroke="${color}" />`,
    );
  }
  // Legend
  const legend = metrics
    .map(
      (m, i) =>
        `<span style="display:inline-flex;align-items:center;gap:4px;margin-right:12px;font-size:8pt;color:var(--fg-muted);"><span style="display:inline-block;width:10px;height:2px;background:${METRIC_COLORS[m]};"></span>${METRIC_LABELS[m]}</span>`,
    )
    .join("");
  return `
    <svg class="sparkline" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff" />
      ${lines.join("\n      ")}
    </svg>
    <div style="margin-top:6px;">${legend}</div>`;
}

function renderReliefLogs(report: ClinicianReport): string {
  const { reliefLogs } = report;
  const body: string[] = [];
  if (reliefLogs.totalInWindow === 0) {
    body.push(`<p class="empty">No relief logs in the last 30 days.</p>`);
  } else {
    body.push(
      `<p class="meta">${reliefLogs.totalInWindow} ${reliefLogs.totalInWindow === 1 ? "log" : "logs"} in the last 30 days.</p>`,
    );
  }
  if (reliefLogs.recent.length > 0) {
    body.push(`<div class="card" style="padding:0; margin-top:6px;">
      <table>
        <thead>
          <tr>
            <th>Date</th><th>Strain</th><th>Conditions</th><th>Fit</th><th>Relief</th>
          </tr>
        </thead>
        <tbody>
          ${reliefLogs.recent
            .map(
              (log) => `<tr>
            <td class="meta">${formatDate(log.createdAt)}</td>
            <td>${htmlEscape(log.strainName)}</td>
            <td class="muted">${log.conditions.length === 0 ? "—" : htmlEscape(log.conditions.join(", "))}</td>
            <td>${log.fit.replace("-", " ")}</td>
            <td>${log.relief}/5</td>
          </tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </div>`);
  }
  return section(
    `Relief logs · last ${reliefLogs.windowDays} days`,
    icon("📈"),
    body.join(""),
  );
}

function renderInsights(report: ClinicianReport): string {
  const { reliefLogs } = report;
  if (reliefLogs.topStrains.length === 0 && reliefLogs.avoid.length === 0) {
    return section(
      "Pattern analysis (deterministic)",
      icon("📊"),
      `<p class="empty">Not enough relief logs in the last 30 days to derive patterns (needs ≥ 2 logs for the same strain).</p>`,
    );
  }
  const body: string[] = [];
  if (reliefLogs.topStrains.length > 0) {
    body.push(`<p class="stat__label" style="margin-bottom:6px;">👍 Top strains for the patient</p>`);
    body.push(
      reliefLogs.topStrains
        .map(
          (row) => `<div class="row">
          <span><strong>${htmlEscape(row.strain)}</strong> <span class="muted">for ${htmlEscape(row.condition)} · ${row.logCount}× logged</span></span>
          <span class="pill pill--emerald">${row.avgRelief.toFixed(1)}/5</span>
        </div>`,
        )
        .join(""),
    );
  }
  if (reliefLogs.avoid.length > 0) {
    body.push(`<p class="stat__label" style="margin:12px 0 6px 0;">⚠️ Marked "too strong" repeatedly</p>`);
    body.push(
      reliefLogs.avoid
        .map(
          (row) => `<div class="row row--amber">
          <span class="row__name">${htmlEscape(row.strainName)}</span>
          <span class="meta">${row.harshCount}× of ${row.totalCount} sessions</span>
        </div>`,
        )
        .join(""),
    );
  }
  if (reliefLogs.insightsProse) {
    body.push(
      `<p class="card muted" style="margin-top:8px;">${htmlEscape(reliefLogs.insightsProse)}</p>`,
    );
  }
  return section("Pattern analysis (deterministic)", icon("📊"), body.join(""));
}

function renderSavedStrains(report: ClinicianReport): string {
  if (report.savedStrains.length === 0) return "";
  const totalNotes = report.savedStrains.reduce((s, x) => s + x.notes.length, 0);
  const title =
    totalNotes > 0
      ? `Saved strains (${report.savedStrains.length}) · ${totalNotes} note${totalNotes === 1 ? "" : "s"}`
      : `Saved strains (${report.savedStrains.length})`;
  return section(
    title,
    icon("📋"),
    report.savedStrains
      .map((s) => {
        const meta = [s.type, s.thcRange ? `THC ${s.thcRange}` : null]
          .filter(Boolean)
          .join(" · ");
        const notes =
          s.notes.length === 0
            ? ""
            : `<ul class="strain__notes">${s.notes
                .slice()
                .sort((a, b) => b.createdAt - a.createdAt)
                .map(
                  (n) => `<li>
                    <div>
                      <div>${htmlEscape(n.text)}</div>
                      <div class="note-meta">${formatDate(n.createdAt)}${n.isPublic ? " · shared with community" : ""}</div>
                    </div>
                  </li>`,
                )
                .join("")}</ul>`;
        return `<div class="strain">
          <div class="strain__head">
            <div>
              <div class="strain__name">${htmlEscape(s.name)}</div>
              <div class="strain__meta">${htmlEscape(meta)}</div>
            </div>
          </div>
          ${notes}
        </div>`;
      })
      .join(""),
  );
}

function renderKayaSummary(summary: ClinicianReportSummaryLike | null): string {
  if (summary === null) {
    return section(
      "Dr. Kaya clinical summary",
      icon("✨"),
      `<p class="empty">The Dr. Kaya summary was not generated for this report. The rest of the report stands on its own.</p>`,
    );
  }
  const considerations =
    summary.considerations.length === 0
      ? ""
      : `<ul class="kaya__list">${summary.considerations
          .map((c) => `<li>${htmlEscape(c)}</li>`)
          .join("")}</ul>`;
  return section(
    "Dr. Kaya clinical summary",
    icon("✨"),
    `<div class="kaya__summary">${htmlEscape(summary.summary)}</div>${considerations}`,
  );
}

function renderFooter(): string {
  return `<footer class="footer">
    This summary was generated by StrainEase from the patient's own
    account data. The Dr. Kaya section (if present) is produced by an
    AI assistant and is not a diagnosis or prescription. Always defer
    to the patient's licensed healthcare provider for treatment
    decisions.
  </footer>`;
}

function section(title: string, iconHtml: string, body: string): string {
  return `
<section>
  <h2><span class="icon">${iconHtml}</span>${htmlEscape(title)}</h2>
  <div>${body}</div>
</section>`;
}

function icon(symbol: string): string {
  return `<span aria-hidden="true">${symbol}</span>`;
}

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(ts: number): string {
  if (!Number.isFinite(ts) || ts <= 0) return "—";
  return new Date(ts).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
