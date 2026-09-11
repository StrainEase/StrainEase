# functions-report

This is the **report/PDF generation Firebase codebase** for StrainEase. It
runs alongside the main `functions/` codebase and is declared in
`firebase.json` as codebase `report`. Firebase deploys both together with
`firebase deploy --only functions`.

## Why this exists

`@sparticuz/chromium` + `puppeteer-core` (~50 MB on disk, hundreds of ms
of cold-start latency) were statically imported at the top of
`functions/src/index.ts`. Every Cloud Function in the public scraper +
AI codebase paid that cost on first invocation — including `popularStrains`,
`searchStrain`, `redditThreadsForStrain`, and `cachedStrainImage`, none of
which touch the PDF pipeline.

We split the code so the public scraper entry never loads Chromium. The
two codebases deploy independently but share the same GCP project and the
same secrets (`GROQ_API_KEY`).

## What's in here

| File                                   | Purpose                                                                                                                                                                                              |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/index.ts`                         | Cloud Function entry. Exports `clinicianReportSummary` (prose-only) and `generateClinicianReportPdf` (full PDF, base64-encoded payload).                                                             |
| `src/clinician-report-html.ts`         | HTML rendering for the PDF body.                                                                                                                                                                     |
| `src/clinician-report-pdf.ts`          | `@sparticuz/chromium` + `puppeteer-core` wrapper. The only consumer is `generateClinicianReportPdf`.                                                                                                 |
| `src/clinician-report-data.ts`         | Patient snapshot assembly from Firestore (Admin SDK).                                                                                                                                                |
| `src/groq.ts`                          | Groq Chat Completions client + JSON extraction. Duplicated from `functions/src/groq.ts` — each codebase is independently bundled by Firebase, so cross-codebase imports are not safe at deploy time. |
| `src/age.ts`                           | Region-aware age policy. Mirrors `src/lib/age-policy.ts` (web) and `functions/src/age.ts` (used only by the public codebase's `age.test.ts`). Keep all three in sync.                                |
| `src/assets/clinician-report-logo.svg` | Brand SVG rendered in the PDF header. Copied to `lib/` by `scripts/copy-assets.mjs` at build time.                                                                                                   |
| `src/clinician-report-html.test.ts`    | HTML render tests (8 cases — XSS escaping, header, conditions, Kaya summary).                                                                                                                        |
| `src/clinician-report.test.ts`         | Prompt + normalizer tests (5 cases).                                                                                                                                                                 |

## Deploying

```bash
cd functions-report
npm ci
npm run build          # tsc → lib/ + node scripts/copy-assets.mjs
cd ..
firebase deploy --only functions  # deploys BOTH codebases
```

The CI workflow at `.github/workflows/firebase-functions-deploy.yml` builds
both codebases before deploying.

## Local dev / emulator

```bash
cd functions-report
npm ci
npm run build
cd ..
firebase emulators:start --only functions  # runs both codebases locally
```

## Adding a new report-related callable

Put it in `functions-report/src/index.ts`. The split rationale: any
function whose cold-start cost would be unfair to charge to the public
scrapers belongs here. The current bar is "needs Chromium or needs the
PDF generator" — extend it consciously if you add something new.

## Cross-codebase helpers

`groq.ts` and `age.ts` are duplicated in both codebases. If you change
either, update the matching file in `functions/src/` too. Both codebases
are bundled separately by Firebase at deploy time — there is no shared
module, no monorepo build orchestration.

## What does NOT go here

- Public scraper callables (`popularStrains`, `browseStrains`,
  `searchStrain`, `redditThreadsForStrain`, `cachedStrainImage`) → `functions/`
- AI synthesis callables (`compareStrains`, `recommendStrainsForConditions`,
  `describeStrainForUser`, `elaborateSection`) → `functions/`
- Auth-gated callables that touch the user's saved data (`findDoctors`,
  `submitStrainReview`) → `functions/`
- Admin / seed callables (`vetRedditThread`, `listPendingRedditThreads`,
  `unvetRedditThread`, `seedReferenceLibrary`, `seedInteractionLibrary`,
  `getReferenceLibrary`, `getDrugInteractions`) → `functions/`
