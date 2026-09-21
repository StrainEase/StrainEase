# Session-journal roadmap: PR-W2 through PR-W9 plus iOS / Android ports

**Date:** 2026-09-21
**Spec:** brainstorm from PR-W1 review (10 ideas, 3 already shipped, 1 already partially shipped, 6 planned, 1 deferred)
**Goal:** Ship 7 more features × 3 platforms = 21 PRs (one dropped, one deferred). Source of truth for the remaining work after PR-W1 lands.

## Status as of 2026-09-21

| # | Feature | Status |
|---|---------|--------|
| 1 | Session journal + longitudinal insight | **DONE** — PR #324 (web). iOS + Android pending. |
| 2 | Drug-interaction badges in recommendation cards | Pending. |
| 3 | Shareable compare URLs | Pending. |
| 4 | App lock / biometric | Pending. Web n/a (no FaceID in browser). |
| 5 | "Too high" helper card | Pending. |
| 6 | "Report outdated info" → cache bust | Pending. |
| 7 | Doctor-share bundle | Deferred — come back to later. |
| 8 | Tolerance / experience-level preference | **DONE** — `thcSensitivity` already exists in `src/lib/research-prefs.ts` + `src/lib/thc-sensitivity.ts`, wired into AI prompts in `functions/src/index.ts`. Skipped from this roadmap. |
| 9 | Per-condition "works for me" stats | Pending. Depends on the session journal shipped in PR-W1. |
| 10 | State-aware legal copy + dispensary finder | Not on this roadmap. Defer until #7 review. |

## Scope

**In scope — 20 PRs across 3 platforms**

- **Web** (7 PRs): W2, W3, W5, W6, W9. Skip W4 (no biometric on web).
- **iOS** (7 PRs): i1, i2, i3, i4, i5, i6, i9. PR-i1 first, others follow.
- **Android** (7 PRs): A1, A2, A3, A4, A5, A6, A9. Mirrors iOS per the 13-PR plan.

**Out of scope**

- #7 (doctor-share bundle) — needs a fresh look at the `functions-report` PDF pipeline before committing.
- #10 (state-aware legal copy) — separate effort that intersects with compliance review.
- Any change to the existing `reliefLogs` / `checkIns` / `strainReviews` data model beyond what PR-W1 already landed.

## PR sequence and dependencies

```
W1 ✓ done
  ↓
i1 → A1                              (session journal port)
  ↓
W2 → i2 → A2                         (drug-interaction badges)
W3 → i3 → A3                         (shareable compare URLs)
i4 → A4                              (app lock / biometric — native only)
W5 → i5 → A5                         ("too high" helper card)
W6 → i6 → A6                         ("report outdated info" → cache bust)
W9 → i9 → A9                         (per-condition "works for me")
```

**Why web first within each feature.** Web is the source of truth for backend wiring (new callables land here first), and iOS / Android consume from there. App lock (#4) is the only feature that's native-only, so it skips the web step.

**Why W9 last.** The per-condition "works for me" chip on saved strains reads from the session journal data that PR-W1 landed. Shipping it after i1/A1 means every platform has a working journal first.

## PR-W2: drug-interaction badges in recommendation cards (web)

**Problem.** `getDrugInteractions` exists as a callable in `functions/src/index.ts:883` but isn't wired into the recommendation flow. A patient on SSRIs who asks for anxiety-relief strains gets no warning that a high-THC recommendation may interact.

**Approach.**

- Backend: extend `recommendStrainsForConditions` (`functions/src/index.ts:1745`) to accept the patient's `medications` (already on `users/{uid}`) and a new `flagInteractions: boolean` flag (default true). Internally call `getDrugInteractions` with the recommended strains and the patient's meds; for each strain with a flagged interaction, add `interactionFlag: { drugClass, severity, summary }` to the response.
- Frontend: new `<InteractionFlag />` component (border + icon + drug-class name + one-line summary). Renders below the strain card on `<ComparableStrainPoster />` + `<FindResults />` whenever the field is set.
- `useMedications` already exists; thread its `names` into the `recommendStrainsForConditions` payload.
- One new SHIPPED type field per recommendation; no Firestore rule changes; no client-side Firestore writes.

**Acceptance.**

- `bun test` covers the InteractionFlag component and the recommendation-mapper.
- `bunx tsc -b --noEmit` clean.
- Manual smoke: sign in as a patient with `medications: ["sertraline"]`, run a Find for anxiety, see at least one strain with a flagged interaction badge. Same patient with no meds → no badges anywhere.
- Cache behavior unchanged: `recommendStrainsForConditions` is cached via `ai-cache.ts`; key inputs already include conditions + meds, no key change.

**Parity delta for i2 / A2.** Same component shape (`InteractionFlag`), same response shape from the AI callable. iOS consumes `interactionFlag` from `LiveStrainAPI`; Android mirrors iOS per the 13-PR plan.

## PR-W3: shareable compare URLs (web)

**Problem.** Compare results live only in the in-memory `useCompareSelection` store. Patients can't text a doctor or budtender a link.

**Approach.**

- `useCompareSelection` (`src/hooks/use-compare-selection.ts`) already serializes/deserializes via URL params per the recent test additions; verify and lean on that.
- New `<CompareUrlShareButton />` (small icon button + copy-to-clipboard using `navigator.clipboard.writeText`) lives on the existing `<AnalysisPanel />` toolbar (or wherever Compare results live — confirm by reading the Compare page).
- Toast on copy: "Link copied. Paste it anywhere."
- Add a `?strains=a,b,c` URL param parser in `main.tsx` so a cold visit to `/compare?strains=blue-dream,og-kush` opens the same view with the comparison pre-loaded. Pre-loading should skip the running analysis if the same selection is already in flight.
- Validation: each `?strains=` token must be a slugified strain name (lowercase, dashes, < 80 chars); drop invalid tokens silently and toast once if any were dropped.

**Acceptance.**

- `bun test src/hooks/use-compare-selection.test.ts` covers the param parser (round-trips selection ↔ URL, drops invalid tokens, dedupes, caps at 4).
- Manual: open compare with 3 strains, copy URL, paste in incognito, see the same comparison.
- Empty `?strains=` is a no-op (no error, no compare).

**Parity delta for i3 / A3.** Mobile platforms can't directly share a URL the same way. Acceptable MVP: iOS / Android render the URL as a tappable deep link in a share sheet (`UIActivityViewController` on iOS, `ACTION_SEND` on Android). The web PR is the contract.

## PR-i4 / PR-A4: app lock / biometric (native only)

**Problem.** Cannabis apps live in pockets next to family, doctors, and coworkers. No lock today.

**Approach (iOS first, Android mirrors per the 13-PR plan).**

- iOS: `AppLockGate` SwiftUI view wrapping `RootView` behind a `LocalAuthentication` `LAContext` evaluate-policy call (`deviceOwnerAuthenticationWithBiometrics`). Fallback to device passcode. Store the toggle in a new `AppLockStore` (UserDefaults-backed). Default off; first run prompts to enable after sign-in. Auto-lock on background → foreground after 30 seconds.
- Android: equivalent using `BiometricPrompt` (`androidx.biometric`). New `AppLockRepository` in DataStore. Same auto-lock window.
- Settings entry: toggle + "Lock now" button, gated behind auth, in the Account section.

**Acceptance.**

- iOS: `swift test` covers `AppLockStore` (toggle persistence, default off, opt-in flow). Manual on device: enable, background the app, foreground, see the lock.
- Android: JUnit tests for `AppLockRepository`. Manual: same as iOS.
- No web equivalent. Note in PR description.

**Out of scope.** Face ID prompt copy. The system default ("Face ID for StrainEase") is fine.

## PR-W5: "too high" helper card (web)

**Problem.** Every consumer cannabis app surfaces "what strain should I try?" but none surface "I went too far, what now?" That's a real safety net, especially for medical patients.

**Approach.**

- New `<TooHighHelperCard />` component (collapsible "Too high?" button at the bottom of the Find and Home pages, also a full-card variant on a dedicated `/too-high` route). Renders five tips with framer-motion fade-in:
  1. Hydrate (water, juice — not alcohol).
  2. Black pepper (chew or smell). Cites the terpene β-caryophyllene mechanism in one sentence.
  3. CBD — note that the evidence is mixed but it's a low-risk suggestion if you have it.
  4. Lie down in a quiet, dim room.
  5. Breathe — 4-7-8 cycle.
- Bottom: "If symptoms persist or feel medical, contact a doctor." Link to `findDoctors()` route. (This is the only callout that links to product; tone is medical, not promotional.)
- New route `/too-high` in `src/main.tsx` with full-screen variant of the card.
- "Too high?" entry point: a small bottom-of-screen pill button visible on every authenticated page, opacity 0.6 by default. Tapping opens the card inline. Long-press / explicit tap goes to the full-screen route. Honors `prefers-reduced-motion`.
- No backend. No Firestore. No tracking — the page doesn't record that you opened it.

**Acceptance.**

- `bun test` covers the card render + the breath-cycle countdown component.
- Manual: open any page, see the "Too high?" pill, tap it, see the card expand.
- The `/too-high` route renders the same card full-screen.

**Parity delta for i5 / A5.** iOS renders as a SwiftUI sheet; Android uses Material 3 bottom sheet. Web is the source of truth for copy.

## PR-W6: "report outdated info" → cache bust (web)

**Problem.** AI descriptions cache for 14 days (`functions/src/ai-cache.ts`). On popular strains that get re-scraped by Leafly / Weedmaps / Allbud, the AI description can drift from reality for up to two weeks. Patients can't flag it.

**Approach.**

- New `bustStrainDescriptionCache` callable in `functions/src/index.ts`. Gated by `request.auth`. Reads `descriptionCache/{key}`, deletes it. Returns `{ ok: true, slug }`.
- Web client: small "Report outdated info" link under each strain's AI description (`<StrainDescriptionView />`). On click, opens a one-line confirmation dialog, then calls the callable + toasts "Thanks — we'll refresh the description." Optimistically appends `(refreshing)` to the description until the next render.
- Frontend `useTailoredDescription` (`src/hooks/use-tailored-description.ts`) needs a `version` token it can bump to force a re-fetch. Bump on successful cache-bust response.
- Soft rate limit: one report per user per slug per day (client-side throttle + Firestore counter in `descriptionReports/{uid}_{slug}_{date}`). Server also enforces (callable checks the doc before deleting the cache).

**Acceptance.**

- `bun test` covers the cache-bust callable (rate limit, missing key, auth gate).
- Manual: open a strain, click "Report outdated info", confirm, see the description re-fetch (loading state → new text).
- Rate limit: clicking twice in a minute shows "Already reported today, try again tomorrow."

**Parity delta for i6 / A6.** Same call shape, same rate-limit doc. iOS / Android button lives in the same `StrainDescription` view.

## PR-W9: per-condition "works for me" stats (web)

**Problem.** The PR-W1 chip surfaces a personal hit rate for the *current* strain only. Patients want the same signal in their saved-strains list so they can see which strains they should reach for next.

**Approach.**

- Extend `<ComparableStrainPoster />` (the saved-strains grid cell) with a per-condition "works for me" badge using the same `personalHitRate` helper from PR-W1. Threshold 3+ logs per strain per condition. Conditions to try: first saved ailment, then any.
- Add a per-condition summary to `<ReliefInsightsPanel />` (the Journal dialog from PR-W1): "Across your saved strains, X works best for insomnia (3/4 sessions), Y for anxiety (2/3 sessions)." Group by condition, show the top strain per condition. Cap at 4 conditions.
- No backend. All computation client-side from existing `useReliefSummary` data.

**Acceptance.**

- `bun test` covers the per-condition grouping logic.
- Manual: sign in as a patient with 5+ logs across 3+ saved strains and 2+ ailments, open Insights, see the per-condition summary.
- No insights for patients with <3 logs in any condition.

**Parity delta for i9 / A9.** iOS shows the same summary on the `AccountView` "Insights" section + per-strain badge in `SavedStrainsView`. Android mirrors per the 13-PR plan.

## PR-i1 / PR-A1: session journal port

**Already specified in the PR-W1 description parity section.** Each platform port covers:

1. `ReliefLogForm` disclosure — collapsible "Add session details" section with the new field inputs.
2. `StrainPersonalInsight` chip — strain detail page, `>=3 logs` threshold, try ailments first.
3. **Insights header entry** — circular button between Favorites and Library/Search, auth-gated, opens a sheet mirroring `JournalPanel`.
4. Session journal sheet — chronological list with all session-journal fields rendered + per-entry delete.
5. Data shape — same field names verbatim.

iOS goes first (`feat/ios/session-journal`), Android mirrors (`feat/android/session-journal`) per the existing 13-PR plan. Both PRs should land before PR-W2 starts so the Insights header entry doesn't ship on web without its mobile counterparts.

## Recommended approach

Two anchor principles:

1. **Web is the contract.** New callables, response shapes, and data model edits ship on web first. iOS / Android consume from there.
2. **One (platform, feature) per PR.** Don't bundle a web + iOS + Android PR. Each PR is independently reviewable and roll-back-able.

Per-PR workflow (same as PR-W1):

1. Branch: `feat/{platform}/{slug}` (web: `feat/web/drug-interaction-badges`, etc.).
2. Build + lint + typecheck + new tests.
3. Commit + push + open PR against `main`.
4. Surface parity deltas in the PR description so the next PR knows what's already locked.
5. Pause for review before moving to the next platform for the same feature.

## Open questions for JC

- #4 app lock: should the toggle live in ProfileMenu or in the Account section of `/account`? (Defaulting to Account, easier to find on first run.)
- #5 too-high pill: bottom-of-every-page or only on Home + Find? (Defaulting to bottom-of-every-page; dismissible, reappears per session.)
- #6 cache bust rate limit: 1 per day per user-slug, or 3? (Defaulting to 1 — server-side counter, simple to enforce.)
- #9 per-condition summary cap: 4 conditions, or unbounded? (Defaulting to 4 — keeps the Insights dialog scannable.)
- Should the PRs in this roadmap be merged in declaration order, or can W3 (shareable URLs, frontend-only) ship first as a quick win? (Defaulting to declaration order to keep the Insights header entry consistent across platforms.)