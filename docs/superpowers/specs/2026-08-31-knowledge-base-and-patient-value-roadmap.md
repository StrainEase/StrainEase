# Knowledge Base & Patient Value Roadmap — 7-PR Sequence

**Author:** Mavis (brainstorming → design) · **Date:** 2026-08-31
**Owner:** JC Sanchez · **Status:** Draft, awaiting sign-off
**Scope:** Seven feature PRs that strengthen StrainEase's medical knowledge base and
deliver more longitudinal value to medical patients. Each PR is small enough to
land and review in isolation; the sequence is dependency-ordered so no PR is
blocked by a later one.

---

## Why this order

| Tier | PR | What it is | Why it goes here |
| ---- | -- | ---------- | ---------------- |
| 1 — Data foundations | 1, 2 | Terpene/cannabinoid + drug-interaction libraries | Pure data, no AI changes, no UI yet. Later PRs cite this. |
| 2 — AI surface | 3 | Reddit pool refresh + citation/source-attribution layer | Touches the AI callables' JSON contract; everything else either feeds or consumes it. |
| 3 — Patient value (read existing data) | 4, 5 | Relief-log insights, clinician report export | Use data we already collect; no new writes. |
| 4 — Patient value (new writes) | 6 | Daily check-in / symptom tracking | New collection, new chart, lowest-risk new write. |
| 5 — AI surface, take two | 7 | "Why this strain" reasoning trace | Depends on PR1 (terpene data), PR3 (citation shape), and existing ReliefLog + ResearchPrefs. |

The 7 PRs the user named map 1:1 to this table. The user combined
"replace the static `reddit-seed.ts` with a vetted, growing pool" and
"citation/source-attribution layer" into a single PR; we keep that
collapsing.

---

## Cross-PR conventions

These apply to every PR below unless that PR calls them out as different.

- **Backend:** `functions/` uses `bun test --serial`. Cloud Functions TS, compiled via `npm run build` before `firebase deploy --only functions,firestore:rules --force`.
- **Frontend:** Vite + React 19 + Tailwind v4 + shadcn/ui. Follow the existing page/component/hook patterns in `src/pages/`, `src/components/`, `src/hooks/`. No shadows. Borders only. No nested cards. No skeletons — `<Loader2 />` for loading. Tailwind v4 with `oklch` colors. Animate with `framer-motion`.
- **AI callables:** edits to `functions/src/index.ts` go through the existing pattern — `onCall` with shared `KAYA_CORE` persona, `request.auth` gates, `defineSecret("GROQ_API_KEY")` for AI_OPTIONS. Update `src/lib/strain-api.ts` for any new typed wrapper. Do **not** import `firebase/functions` from a component.
- **Firestore rules:** every new collection needs a rule. New rules land in the same PR as the collection. The `firebase-security-rules-auditor` skill reviews them.
- **Cross-platform parity:** every patient-facing surface ships to web **and** Android (mirroring the iOS pattern). Each PR below calls out the Android surface if it changes. Following the 13-PR Android port pattern in `AGENTS.md` (`feat/android/*` branches), a follow-up Android mirror PR per surface is expected — flagged in each PR's "Android mirror" line.
- **What "rigorous testing" means per surface:**
  - New data library or pure functions → `bun test` unit tests on the parser/normalizer/loader, plus a snapshot of the seeded data.
  - New AI callable contract → golden-prompt tests in `functions/src/*.test.ts` (mock Groq), plus a manual smoke test script under `scripts/` that an operator can run against the emulator.
  - New UI surface → component test with `happy-dom`, plus a manual scenario checklist appended to the PR description.
  - Firestore rule changes → rule tests via the Firestore emulator.
  - Each PR's "Test plan" section lists exactly which of these apply.

---

## PR 1 — Terpene & Cannabinoid Library

**Branch:** `feat/kb/terpene-cannabinoid-library`
**Tier:** 1 (data foundation)
**Blocks:** PR 7
**Android mirror:** `feat/android/terpene-cannabinoid-library` (follow-up PR)

### Scope
Add two server-controlled Firestore collections that back the strain detail
"why might this work for you" content with real, citable facts:

- `terpeneLibrary/{slug}` — `displayName`, `classDescription` (e.g. monoterpene
  vs sesquiterpene), `aroma`, `commonSources`, `mechanism` (short, plain English),
  `commonlyReportedEffects` (string[]), `evidenceGrade` (`"strong" | "moderate"
  | "limited" | "anecdotal"`), `sources` (`{label, url, kind: "pubmed" | "review" | "nor.org" | "other"}[]`).
- `cannabinoidLibrary/{slug}` — same shape plus `cb1Affinity`, `cb2Affinity`
  (descriptive strings, not numeric — we do not invent Ki values), and
  `psychoactivity` (`"none" | "mild" | "moderate" | "high"`).

Seed ~12 terpenes and ~8 cannabinoids (THC, CBD, CBG, CBN, CBC, THCV, CBDV,
THCA) with manually curated, sourced entries. The seed lives in
`functions/src/seed/terpeneLibrary.json` and `functions/src/seed/cannabinoidLibrary.json`,
loaded by a one-shot admin migration callable (`seedReferenceLibrary`, auth-gated
to the project owner) — no client-side writes.

### Files
- `functions/src/reference-library.ts` — loaders, types, lookup helpers
- `functions/src/seed/terpeneLibrary.json` (new)
- `functions/src/seed/cannabinoidLibrary.json` (new)
- `functions/src/index.ts` — `seedReferenceLibrary`, `getReferenceLibrary`
  callables; `seedReferenceLibrary` gated to a hard-coded admin UID list
  (matches existing admin-style pattern in `consolidate.ts`).
- `firestore.rules` — read public, write admin-only, deny client.
- `src/lib/reference-library.ts` — typed client wrapper around `getReferenceLibrary`.

### Acceptance criteria
1. `seedReferenceLibrary` writes the seeded JSON into Firestore, idempotently.
2. `getReferenceLibrary({ kind: "terpene" | "cannabinoid" })` returns the
   full list with no LLM in the loop.
3. `getReferenceLibrary({ kind: "terpene", slug: "myrcene" })` returns a
   single record with non-empty `mechanism`, `commonlyReportedEffects`, and
   at least one `source`.
4. Firestore rules deny direct client writes; allow public reads.
5. `bun test --serial` from `functions/` passes.

### Test plan
- `functions/src/reference-library.test.ts` — loader parses JSON, lookups
  by slug, slug normalization, empty-collection fallback.
- `functions/src/seed/terpeneLibrary.json` and `cannabinoidLibrary.json`
  pass a JSON schema check (a small Zod schema in `reference-library.ts`).
- Firestore rules: rule test denies client writes to `terpeneLibrary/*` and
  `cannabinoidLibrary/*`; allows reads.
- Manual: run `seedReferenceLibrary` against the emulator, then
  `getReferenceLibrary` end-to-end.

### Out of scope
- Strain detail page UI changes. The "why this might work" block on the
  strain page is added in **PR 7** once the AI knows how to cite.
- Editing the library from a UI. Admin-only migration only.

---

## PR 2 — Drug Interaction Library

**Branch:** `feat/kb/drug-interaction-library`
**Tier:** 1 (data foundation)
**Blocks:** None (consumed by PR 7 reasoning trace; PR 3's prompt also
references it for the existing medication caution)
**Android mirror:** `feat/android/drug-interaction-library` (follow-up PR)

### Scope
Add a small, hand-curated `interactionLibrary/{drugSlug}` collection that the
strain detail page and the AI callables can look up against a patient's
`medications` field.

Document shape per record:
- `drugName`, `slug`, `drugClass` (`"SSRI" | "benzodiazepine" | "opioid" |
  "anticoagulant" | "antihistamine" | "stimulant" | "other"`).
- `cannabisInteraction` — `{ severity: "low" | "moderate" | "high" | "theoretical",
  mechanism: string, commonGuidance: string, discussWithPrescriber: bool }`.
- `sources[]` (same shape as PR 1).

Seed ~15 drugs covering the most-commonly-searched classes (sertraline,
fluoxetine, escitalopram, citalopram; alprazolam, lorazepam, clonazepam;
oxycodone, hydrocodone, morphine; warfarin, apixaban; diphenhydramine;
 Adderall/mixed amphetamines; modafinil).

The library is **not medical advice** — every record has
`discussWithPrescriber: true` and the UI must say so. The render is purely a
"here is what the literature commonly reports" block, no clinical claims.

### Files
- `functions/src/seed/interactionLibrary.json` (new)
- `functions/src/reference-library.ts` (extend with `lookupInteractions(drugs: string[])`)
- `functions/src/index.ts` — `getDrugInteractions` callable
- `firestore.rules` — read public, write admin-only.
- `src/lib/reference-library.ts` — typed client wrapper.

### Acceptance criteria
1. `getDrugInteractions({ drugs: ["sertraline"] })` returns one record.
2. Unknown drug name returns an empty array, not an error.
3. Every record's `cannabisInteraction.discussWithPrescriber === true`.
4. Firestore rules: deny client writes, allow public reads.
5. `bun test --serial` passes.

### Test plan
- Unit tests for the loader, slug normalization, multi-drug lookup,
  dedupe of duplicate slugs.
- Rule test denies client writes.
- Manual: emulator end-to-end lookup.

### Out of scope
- Clinical-grade severity scoring or drug-drug-drug checks. This is a
  literature pointer, not a CDS.

---

## PR 3 — Reddit Pool Refresh & Citation Layer

**Branch:** `feat/kb/reddit-pool-and-citations`
**Tier:** 2 (AI surface)
**Blocks:** PR 7
**Android mirror:** `feat/android/reddit-pool-and-citations` (follow-up PR)

### Scope, part A — Reddit pool
Replace `functions/src/reddit-seed.ts` (the static, hand-seeded array) with a
Firestore collection `redditThreads/{threadId}` that the existing
`redditCacheRefresh` schedule (`functions/src/reddit-refresh.ts`) can write
into. Each record is vetted once by a clinician/editor review process before it
becomes eligible to be served:

- `threadId`, `subreddit`, `url`, `title`, `snippet`, `score`, `vettedAt`,
  `vettedBy` (operator UID), `vettedNotes` (optional), `applicableConditions[]`
  (e.g. `["insomnia", "chronic-pain"]`), `applicableStrains[]` (e.g. `["Granddaddy Purple"]`).

New admin-only callables:
- `vetRedditThread` — accept a PullPush/Arctic-Shift result, write to
  `redditThreads/{threadId}` with `vettedAt`/`vettedBy` set.
- `listPendingRedditThreads` — list candidate threads needing review.
- `unvetRedditThread` — set `vettedAt = null`.

`redditThreadsForStrain` (existing in `index.ts`) now reads from the vetted
collection first, then falls back to the static `reddit-seed.ts` for any
strain not yet covered by the live pool. The seed file is **kept** as a
safety net for one release, then deleted in a follow-up PR.

### Scope, part B — Citation layer
Add a `citations` field to every AI call JSON shape that contains prose claims.
Dr. Kaya's JSON output gains an optional `citations: Array<{ id: string, source:
string, label: string, kind: "pubmed" | "review" | "nor.org" | "leafly" |
"weedmaps" | "allbud" | "reddit" }>` array. The `redditThreads` and
`drugInteractions` blocks (and, once PR 1 lands, the terpene/cannabinoid
blocks) become referenceable from `citations` by `id`.

This is a **prompt change + JSON contract change**, not a UI change. The UI
rendering lands in **PR 7** (or — opportunistically — in the strain detail
"why this might work" block that PR 7 introduces).

### Files
- `functions/src/reddit.ts` — add `vetRedditThread`, `listPendingRedditThreads`,
  `unvetRedditThread`.
- `functions/src/index.ts` — change `redditThreadsForStrain` to prefer the
  Firestore vetted pool; add the three new admin callables; update
  `COMPARE_SYSTEM_PROMPT`, `RECOMMEND_SYSTEM_PROMPT`, `DESCRIBE_SYSTEM_PROMPT`
  to emit `citations[]` (extend the shared `KAYA_CORE` block).
- `firestore.rules` — `redditThreads/*` admin-write, public-read for vetted
  records (`vettedAt != null`), deny unvetted reads.
- `src/lib/strain-api.ts` — typed wrappers for the new callables.
- `src/lib/reddit-admin.ts` (new) — small admin UI helpers (gated to a known
  operator UID list, mirrored from the seed callable in PR 1).
- `docs/superpowers/specs/citation-json-contract.md` (new) — short doc that
  pins the `citations` array shape so PR 7 can rely on it.

### Acceptance criteria
1. Admin `vetRedditThread` writes a record; `listPendingRedditThreads` returns
   candidates; `unvetRedditThread` clears the vetting.
2. `redditThreadsForStrain("Granddaddy Purple", ["insomnia"])` returns vetted
   records first, falling back to seed only when the pool is empty.
3. The AI JSON contract doc is committed and matches the actual `onCall`
   return shapes (asserted by existing golden tests).
4. Unauthenticated calls to the admin callables are rejected.
5. Firestore rules prevent reading unvetted threads from the client.

### Test plan
- Unit tests for the three new admin callables (auth gate, idempotency).
- Unit tests for `redditThreadsForStrain` fallback ordering.
- Golden-prompt test: stub the Groq client, assert the system prompt now
  includes the `citations[]` instructions, and that the `extractJsonObject`
  helper accepts the new shape.
- Rule test: client cannot read unvetted threads.
- Manual: end-to-end on the emulator, vetting one thread and seeing it
  surface.

### Out of scope
- A real admin UI for vetting. Operators use the Functions emulator + a
  small CLI in `scripts/vet-reddit.ts` (one-shot script, no UI).

---

## PR 4 — Relief-Log Insights & Trends

**Branch:** `feat/patient/relief-log-insights`
**Tier:** 3 (patient value, reads existing data)
**Blocks:** PR 5 (clinician report consumes the same derived insights)
**Android mirror:** `feat/android/relief-log-insights` (follow-up PR)

### Scope
Add a `ReliefInsights` surface on Home and Account that surfaces
patient-specific patterns from existing `reliefLogs` (collection is already
live under `users/{uid}/reliefLogs`). The insights are deterministic, not
LLM-derived — they run in the client and read the existing
`listenToReliefLogs` stream.

Insight rules (each shown only if data is sufficient):
- **Top strain for a saved condition**: "For your *insomnia*, X of your last
  N logs rated relief ≥ 4 on **Strain Name**" — requires ≥ 3 logs for the
  condition and the same strain appearing in ≥ 2 of them.
- **THC ceiling fit**: "Strains above N% THC tend to feel 'too strong' to
  you (K of M logs)" — derived from the patient's own logs, not the
  ResearchPrefs ceiling (this is empirical vs stated).
- **Form fit**: "**Vape** tends to feel 'just right' to you (K of M logs)"
  — the log already has `consumptionForm`; we add a new optional
  `consumptionForm` field to the `ReliefLog` write in this PR (defaults to
  `"unspecified"` for back-compat).
- **Recent streak**: "You've logged relief ≥ 4 on 3 of your last 5
  sessions" — last 5 logs, sorted by `createdAt`.

### Files
- `src/lib/relief-insights.ts` (new) — pure functions over `ReliefLog[]`.
- `src/components/saved/ReliefInsights.tsx` (new) — UI block.
- `src/components/home/HomeScreen.tsx` — insert the block above the StrainRails
  for signed-in users with ≥ 3 logs.
- `src/pages/Dashboard.tsx` — second instance.
- `src/lib/relief-log.ts` — add optional `consumptionForm` field to writes.
- `firestore.rules` — extend `reliefLogs` rules to allow the new optional
  `consumptionForm` field (string enum).
- `src/components/saved/ReliefLogButton.tsx` — surface a `consumptionForm`
  picker in the "How did this go?" sheet.

### Acceptance criteria
1. With < 3 logs, the block is hidden (no noisy empty state).
2. With ≥ 3 logs and a saved condition that matches, "Top strain" insight
   shows with the right numerator/denominator.
3. The four insight rules are covered by unit tests in
   `relief-insights.test.ts`.
4. `consumptionForm` is optional and defaults to `"unspecified"` on read.
5. Firestore rule test allows the new field.

### Test plan
- Unit tests for each insight rule, including edge cases (single log,
  zero logs, all-same-strain, mixed conditions).
- Component test for `ReliefInsights` (renders nothing below threshold,
  renders the right block above it).
- Rule test for the new `consumptionForm` field.
- Manual: feed a fake uid with synthetic logs and confirm the Home block.

### Out of scope
- LLM-generated insights. Everything is deterministic; we add a comment
  noting that the "ask Dr. Kaya" prompt at the bottom of the block already
  goes to a non-deterministic LLM.

---

## PR 5 — Clinician Report Export

**Branch:** `feat/patient/clinician-report`
**Tier:** 3 (patient value)
**Blocks:** None
**Android mirror:** `feat/android/clinician-report` (follow-up PR; PDF
  generation on Android uses Compose's native print framework)

### Scope
Add a "Share with my doctor" flow on Account that renders a structured
report from the patient's data and exports it as both a print-friendly
HTML view and a downloadable PDF. The report includes:

- Patient-controlled date range (default: last 90 days).
- Patient-controlled condition subset (defaults to all saved ailments).
- Strains tried (from `reliefLogs` in range), with relief scores and fit.
- Free-text notes (verbatim, optionally redacted by the patient per-note).
- Current medications (from `medications` store).
- A one-paragraph Dr. Kaya summary, generated by a new
  `generateClinicianSummary` callable. The summary prompt is tuned to be
  conservative — no diagnoses, no "stop your prescription" language, only
  "patient reports" framing.

The HTML is rendered with the same Tailwind tokens as the rest of the app
(no shadows, borders only), then sent to the browser's print dialog with
`@media print` styles. The PDF is the same HTML captured via `window.print()`
to "Save as PDF" — no headless browser, no extra binary dependency.

### Files
- `functions/src/index.ts` — `generateClinicianSummary` callable (auth-gated,
  same `KAYA_CORE` guardrails).
- `src/lib/strain-api.ts` — typed wrapper.
- `src/components/account/ClinicianReport.tsx` (new) — composer + print view.
- `src/pages/Account.tsx` (or equivalent) — link to the report.
- `src/components/account/ClinicianReport.print.css` (new) — `@media print`
  rules.
- `src/lib/clinician-report.ts` (new) — pure function that assembles the
  report payload from `reliefLogs` + `medications` + `savedAilments`.

### Acceptance criteria
1. The report shows real data for the chosen date range, not Lorem ipsum.
2. The Dr. Kaya summary contains no "stop taking" language (golden test
   with three example reports).
3. The print stylesheet hides the navigation and the composer controls.
4. The link is reachable from Account in < 2 clicks.
5. `bun test --serial` passes; app component tests pass.

### Test plan
- Unit tests for the assembler (date filtering, condition subset, note
  redaction, empty-data edge cases).
- Golden-prompt test: stub Groq, assert the summary's `body` does not
  contain "stop", "discontinue", "cease", or diagnostic claim patterns.
- Component test for the composer (date range, condition checkboxes,
  generated summary preview).
- Manual: print preview from Chrome and Safari; verify the PDF is single-
  column, scannable in < 1 page for a 30-day range.

### Out of scope
- Server-side PDF rendering. Browser print is enough; we explicitly avoid
  adding a headless Chromium dependency.

---

## PR 6 — Daily Check-In / Symptom Tracking

**Branch:** `feat/patient/daily-checkin`
**Tier:** 3 (patient value, new writes)
**Blocks:** None
**Android mirror:** `feat/android/daily-checkin` (follow-up PR)

### Scope
Add a `dailyCheckIns/{yyyy-mm-dd}` collection under each user. One doc per
day. The doc holds a small fixed-shape payload:

- `mood` (1–5), `sleep` (1–5), `pain` (1–5, optional), `anxiety` (1–5,
  optional), `sideEffects` (string[] from a closed enum:
  `["dry-mouth", "anxiety", "paranoia", "drowsiness", "dizziness", "none"]`),
  `note` (string ≤ 400), `createdAt`, `updatedAt`.

UI:
- A new `DailyCheckIn` sheet on the strain detail page ("How are you today?")
  and a Home tile for the signed-in user.
- A `CheckInHistory` view (Account) that renders the last 30 days as four
  small sparkline-ish rows (mood, sleep, pain, anxiety), drawn with SVG,
  not a chart library.

### Files
- `functions/src/index.ts` — none (pure client write; rules gate it).
- `firestore.rules` — new `users/{uid}/dailyCheckIns/{dateId}` rules.
- `src/lib/daily-checkin.ts` (new) — types + Firestore helpers.
- `src/components/checkin/CheckInSheet.tsx` (new) — bottom-sheet form.
- `src/components/checkin/CheckInHistory.tsx` (new) — sparkline view.
- `src/pages/Strain.tsx` — add the "How are you today?" CTA when the user
  is signed in.
- `src/components/home/HomeScreen.tsx` — add the Home tile.

### Acceptance criteria
1. One check-in per day per user (the date id is the doc id; Firestore
   rule rejects a second same-day create).
2. `sideEffects` is a closed enum, validated in the rule.
3. `note` capped at 400 chars in the rule.
4. The history view renders with the existing Tailwind tokens.
5. Component tests for the sheet and the history view pass.

### Test plan
- Unit tests for the date-id helper, enum validation, history rollup.
- Component test for the sheet (validation, save flow).
- Component test for the history view (renders N rows of sparkline from
  fixture data).
- Rule test: second same-day create fails; overlong note fails; invalid
  side effect fails.
- Manual: 14 days of synthetic check-ins renders cleanly.

### Out of scope
- Correlating check-ins to specific strains. That's a **follow-up PR** that
  consumes the data this PR writes; we do not let it creep into scope.

---

## PR 7 — "Why This Strain" Reasoning Trace

**Branch:** `feat/patient/why-this-strain`
**Tier:** 5 (AI surface + UI)
**Blocks:** None (consumes PR 1, PR 3, PR 4 outputs; not blocked by them
  in code, but should land last for the cleanest story)
**Android mirror:** `feat/android/why-this-strain` (follow-up PR)

### Scope
Render an auditable "evidence ledger" alongside Dr. Kaya's recommendation
prose. Each item in the ledger is one short clause, one icon, and one source
link. Example:

> ✓ Matches your saved condition **insomnia** (ReliefLog: 4/5 on similar strains) ·
> ✓ Below your stated 22% THC ceiling ·
> ✓ Sedating-leaning terpene profile (myrcene, linalool — sourced from
>   `terpeneLibrary`) ·
> ✓ 2 community notes on sleep.

The AI's JSON contract (PR 3) gains a top-level `evidence: Array<{
  claim: string, kind: "personal" | "ceiling" | "terpene" | "cannabinoid" |
  "community" | "interaction" | "clinical", citationId?: string }>` field.
The frontend maps each `kind` to a small icon and resolves `citationId`
against the existing `citations[]` from PR 3 plus the new
`terpeneLibrary` / `cannabinoidLibrary` / `interactionLibrary` from PR 1
and PR 2.

The evidence ledger renders on the strain detail page (below the AI
description) and inside the compare results panel.

### Files
- `functions/src/index.ts` — extend the shared `KAYA_CORE` block (and each
  callable's prompt) to require the `evidence[]` field; update the JSON
  contract docs.
- `functions/src/types.ts` — add `Evidence` type and the new field on
  `StrainAnalysis` / `StrainComparison` / `StrainRecommendation`.
- `src/lib/strain-api.ts` — propagate the new field to the typed wrappers.
- `src/components/strain/EvidenceLedger.tsx` (new) — UI renderer.
- `src/components/compare/AnalysisPanel.tsx` — embed the ledger.
- `src/components/strain/StrainDescription.tsx` — embed the ledger below
  the description.

### Acceptance criteria
1. The `evidence[]` field is non-empty for ≥ 90% of recommend calls in the
  golden test fixtures.
2. Each `evidence[]` item has a `kind` from the closed enum.
3. `citationId` resolves to either a `citations[]` entry (PR 3) or a
  library entry (PR 1 / PR 2). Unresolved `citationId` renders as a
  muted "(source not found)" — never throws.
4. The ledger never invents sources; if a `kind` would need a library
  lookup that fails, the entry is dropped (golden test enforces this).
5. App component tests pass; functions tests pass.

### Test plan
- Golden-prompt test: stub Groq, assert the new prompt requires the
  `evidence[]` field and that the extraction accepts the new shape.
- Unit tests for the `EvidenceLedger` renderer: empty state, mixed-kind
  rendering, unresolved citation.
- Component test: the ledger shows up below the strain description.
- Manual: run on a real account with relief logs; confirm the "personal"
  kind actually resolves to the user's own logs.

### Out of scope
- Inline clicking to "fix" a wrong evidence item. Out of scope; logged as
  a follow-up.

---

## Execution plan

For each PR, the working order is:

1. Open the feature branch off `main`.
2. Implement the scope, run `bun test --serial` from `functions/` and the
   app's test command for the touched surface, run `npm run build` in
   `functions/`, run `npm run lint` at the repo root.
3. Update `firestore.rules` and run the rule tests via the Firestore
   emulator.
4. Write the PR description using the conventional template in
   `AGENTS.md` — link to this spec, list the test commands and their
   results, paste the manual scenario checklist.
5. Push and open the PR. Each PR is reviewed and merged before the next
   starts; we do not stack.

If the user wants me to start, I begin with **PR 1** and report back at
the green-tests gate before opening the PR.

## Risks and explicit non-goals

- **Clinical claims.** PRs 1, 2, 3 do not produce clinical advice. Every
  library record says "discuss with your prescriber" and the UI surfaces
  that line. We add a content review pass in PR 1 / PR 2 to a clinician
  before each library ships.
- **LLM hallucination on citations.** The `citations[]` and `evidence[]`
  fields are the highest-leverage place a hallucination could land. PR 3
  and PR 7 enforce "drop, don't invent" in the prompt and in the frontend
  resolver. We do not paper over this with a generic disclaimer.
- **Personal data in the clinician report.** The report is generated on
  the client from the client's own data; nothing leaves the browser except
  the one Groq call for the summary paragraph, which already follows the
  existing AI callables' data minimization.
- **Android parity.** Each PR names a follow-up Android mirror. The
  Android port is its own 13-PR sequence; we mirror rather than block.

## Out of scope (not in any of the 7 PRs)

- A real admin UI for vetting Reddit threads (operator uses a CLI).
- Server-side PDF generation.
- Drug-drug-drug interaction checks.
- Correlating check-ins to specific strains.
- Strain detail "Why might this work" UI that doesn't go through the
  evidence ledger.
