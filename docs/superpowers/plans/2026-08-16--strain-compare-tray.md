# Compare-from-search: implementation plan

**Date:** 2026-08-16
**Spec:** `docs/superpowers/specs/2026-08-16--strain-compare-tray.md`
**Goal:** Persistent floating compare tray on web + iOS, with the toggle living only on the strain detail page.

## Scope

**In scope**

- Web (`src/`):
  - `useCompareSelection` hook (URL-driven, reuses `?strains=`)
  - `<CompareTray />`, `<CompareToggleButton />`
  - Dashboard.tsx refactor (state → hook, remove redundant effect, mount tray)
  - "Add to compare" button on `Strain.tsx`
  - Remove `StrainDirectory.tsx`'s per-card "Compare" link
  - Tests for the hook and components
- iOS (`ios/StrainWise/`):
  - `CompareSelectionStore`, `CompareToggleButton`, `CompareTrayBar`, `CompareResultsView`
  - `MainTabView` owns + injects the store
  - Wire up `FindView.compareTray` (currently dead) into the body
  - Add `CompareResultsView` inline mount on Find tab
  - Toolbar button on `StrainDetailView.swift`
  - `FindModel.swift` delegates to the store
  - XCTest for the store

**Out of scope** (intentionally — JC's refinement)

- No toggle on grid cards anywhere (Home, Browse, Saved, AilmentCarousel, StrainRail)
- No new Firebase callables, no backend changes, no Firestore rules changes
- No changes to the Compare tab's analysis UI (`<AnalysisPanel />`, `<StrainDetailCard />`)
- No new env vars, no deploy workflow changes
- No bulk "compare all saved" flow

## Recommended approach

Two parallel tracks — web and iOS. Both share the spec but no runtime code. Within each track, build bottom-up: foundation → UI primitives → wire-in → smoke.

### Why bottom-up

The hook/store has the highest logical density (URL serialization, dedup, cap, hydration). Building it first with unit tests means every later layer is a thin consumer with easy-to-spot bugs. The tray and toggle are pure presentation and trivial to test once the foundation is solid. The wire-in step is a mechanical port of existing call sites; it's the most likely place to introduce regressions, so it goes last with a full smoke test.

### Why parallel tracks

The web hook and iOS store are independent. Two implementers (or one implementer doing both serially) can pick either track without blocking on the other. The only shared gate is the acceptance smoke test (each platform runs independently).

## Work breakdown

### Web track

#### W1 · Foundation — `useCompareSelection` hook

- Create `src/hooks/use-compare-selection.ts`. Read/write `?strains=` via `useSearchParams`.
- Public API: `names`, `add`, `remove`, `toggle`, `setNames`, `clear`, `isIn`, `atCap`, `count`, `cap`.
- Hook hydrates from URL on mount and re-syncs on every `searchParams` change. Every mutation writes back. `clear()` removes the param entirely.
- Create `src/hooks/use-compare-selection.test.ts`:
  - `parse(serialize(names)) == names` (round-trip, case-insensitive).
  - dedup (different cases collapse).
  - cap enforced on `add` and `setNames`.
  - `clear()` removes the URL param.
  - `setNames(names)` wipes previous selection, dedupes, caps, drops URL param on empty.

**Gate:** `bun test src/hooks/use-compare-selection.test.ts` passes.

#### W2 · UI primitives

- Create `src/components/compare/CompareToggleButton.tsx`. Three visual states. `aria-pressed`. `e.preventDefault() + e.stopPropagation()` on click.
- Create `src/components/compare/CompareTray.tsx`. Sticky bottom bar (`fixed inset-x-0 bottom-0 z-50`), framer-motion enter/exit, `pb-[env(safe-area-inset-bottom)]`, `bg-background/85 backdrop-blur-md`, hidden when empty. Receives `selection` and `handleCompare` as props.
- Tests:
  - `CompareToggleButton.test.tsx` — three states, click toggles, click on full is a no-op, click does not navigate (no Link in this surface, but defensive).
  - `CompareTray.test.tsx` — empty renders nothing, populated renders chips + buttons, chip × calls hook's `remove`, "Compare (N)" calls `handleCompare`, "Clear" calls `clear()`.

**Gate:** `bun test src/components/compare/` passes.

#### W3 · Dashboard refactor

Edit `src/pages/Dashboard.tsx`:

- Replace `const [selectedNames, setSelectedNames] = useState<string[]>([])` with `const selection = useCompareSelection()`. Alias `names = selection.names`.
- Delete the redundant `useEffect` at lines 151–160 (reads `?strains=`).
- Re-point mutations:
  - `toggleStrainName` (line 196) → `selection.toggle(name)`.
  - `addCustomStrain` (line 207) → calls `selection.toggle(name)`, clears query.
  - `applyQuickPick` (line 276) → `selection.setNames(pick.strains)`.
  - `resetComparison` (line 287) → `selection.clear()`.
  - `startCompareFromFinder` (line 296) → `selection.setNames(names)`.
- Reads (`selectedNames.some(...)`, `selectedNames.length`) stay as-is via the alias.
- `handleCompare` reads `selection.names` via the alias.
- Mount `<CompareTray selection={selection} onCompare={handleCompare} />` once at the Dashboard root, outside the mode-tab divs.
- Wire `StrainFinder.tsx` props at lines 415–423: `onAddToCompare={selection.toggle}`, `inCompareSelection={selection.isIn}`, `compareAtCap={selection.atCap}`.

**Gate:** Web dev server boots, no console errors, existing flows still work (Find → "Compare the top picks", Compare tab picker, QUICK_PICKS).

#### W4 · Detail-page toggle

Edit `src/pages/Strain.tsx`:

- Add a primary "Add to compare" button alongside the existing "Save"-equivalent (this page has no Save; see `SavedStrainNotes` block).
- On click, navigates to `/dashboard?strains=<name>`. Button rendered regardless of auth — `RequireAuth` handles redirect with `?returnTo=`.
- Update existing "vs {saved}" block at lines 216–240: keep the per-saved-strain "vs NAME" buttons (they already navigate to `?mode=compare&strains=NAME1,NAME2` and the hook handles this).

Edit `src/components/directory/StrainDirectory.tsx`:

- Remove the per-card "Compare" button (lines 378–389). Keep "View" only.

**Gate:** Manual smoke:
1. Open `/strain/blue-dream`, tap "Add to compare" — redirected to `/auth` (if signed out) → on return, tray shows "Blue Dream (1/3)".
2. Tap "Add to compare" again on the same strain — tray chip toggles off.
3. Open a second strain, tap "Add to compare" — tray now has 2.
4. Open third strain, tap "Add to compare" — tray has 3; toggle is disabled.
5. Tap "Compare (3)" in tray → `handleCompare` runs → result renders identically to today's Compare tab.

#### W5 · Optional polish

- Run `bun run lint` and fix any new lint warnings.
- Run `bun run build` to verify production build.

### iOS track

#### I1 · Foundation — `CompareSelectionStore`

- Create `ios/StrainWise/Compare/CompareSelectionStore.swift`. `@Observable @MainActor final class`.
- Public API: `names`, `cap = 3`, `add`, `remove`, `toggle`, `setNames`, `clear`, `isIn`, `atCap`, `count`, `canRunCompare`, `comparison`, `isComparing`, `compareError`, `runCompare(api:conditions:prefs:reliefSummary:)`.
- Case-insensitive dedup uses `String.caseInsensitiveCompare(_:)`.
- `runCompare` sets `isComparing = true`, calls `api.compare(...)`, sets `comparison` on success or `compareError` on failure, clears `isComparing` in `defer`.
- Create `ios/StrainWiseTests/CompareSelectionStoreTests.swift`:
  - add, remove, toggle, dedup, cap, clear, canRunCompare threshold, setNames.
  - `runCompare` sets `comparison` on success and clears `isComparing`/`compareError`.

**Gate:** `xcodebuild test -scheme StrainWise -destination 'platform=iOS Simulator,name=iPhone 15'` passes.

#### I2 · UI primitives

- Create `ios/StrainWise/Compare/CompareResultsView.swift`. Parameterized: `comparison: StrainComparison`, `onSelectProfile: (StrainProfile) -> Void`. Renders the same layout as the existing `compareResults(_:)` helper at FindView.swift:369–430 (for, key differences, common ground, cautions, strain list). All `path.append($0)` calls become `onSelectProfile($0)`.
- Create `ios/StrainWise/Compare/CompareToggleButton.swift`. `Button` with the three states via SF symbols. Used only as a `ToolbarItem` in `StrainDetailView` — no card overlay use.
- Create `ios/StrainWise/Compare/CompareTrayBar.swift`. Floating overlay. Hidden when `names.isEmpty` OR when bound `nav.tab == .find`. Animates via `.move(edge: .bottom).combined(with: .opacity)`. Owns its own `@State private var trayPath: [StrainProfile] = []`. Presents a sheet that wraps `NavigationStack { CompareResultsView(comparison: store.comparison, onSelectProfile: { trayPath.append($0) }) }` plus `.navigationDestination(for: StrainProfile.self) { StrainDetailView(profile: $0) }`. Has explicit keyboard observer for `keyboardWillChangeFrameNotification`.

**Gate:** Xcode build clean. (No test for the views themselves; manual smoke covers it.)

#### I3 · `MainTabView` + `FindView` wire-up

Edit `ios/StrainWise/App/MainTabView.swift`:

- Add `@State private var compareStore = CompareSelectionStore()`.
- Inject via `.environment(compareStore)`.
- Render `<CompareTrayBar compareStore: compareStore />` as an overlay; tray reads `nav.tab` to hide on Find.

Edit `ios/StrainWise/Find/FindModel.swift`:

- Remove `compareNames`, `isComparing`, `comparison`, `compareError` stored properties.
- Add `@Environment(CompareSelectionStore.self) private var compareStore: CompareSelectionStore?` — **note**: `@Environment` on `@Observable` classes is fine for read but mutation is best done via the store directly. Consider passing the store explicitly in `init` from the view instead.
- Re-point methods:
  - `addToCompare` → `store?.add(name) ?? false`
  - `removeFromCompare` → `store?.remove(name)`
  - `toggleCompare` → `store?.toggle(name) ?? false`
  - `isInCompare` → `store?.isIn(name) ?? false`
  - `compareAtCap` → `store?.atCap ?? false`
  - `canCompare` → `(store?.canRunCompare ?? false) && !(store?.isComparing ?? false)`
  - `compareSelected` → `await store?.runCompare(api: api, conditions: ailments, prefs: prefs, reliefSummary: reliefSummary.isEmpty ? nil : reliefSummary)`
  - `reset` keeps its existing clears + adds `store?.clear()` and `store?.comparison = nil` (does not touch `isComparing`/`compareError` mid-run).

**Implementation note:** since `FindModel` is created with `@State` in `MainTabView` (line 5), and `@Environment` doesn't propagate to `@State`-created models the way it does to views, the cleanest path is to pass the store in `init`: `init(api: any StrainServicing = LiveStrainAPI(), compareStore: CompareSelectionStore? = nil)`. Update `MainTabView` line 5 to pass `compareStore`.

Edit `ios/StrainWise/Find/FindView.swift`:

- Wire `compareTray` (currently dead at lines 322–367) into the body between `prefs` and `recommendations`. Re-point all its references: `model.compareNames` → `compareStore?.names ?? []`, `model.removeFromCompare(name)` → `compareStore?.remove(name)`, `model.canCompare` → `(compareStore?.canRunCompare ?? false) && !(compareStore?.isComparing ?? false)`, `model.isComparing` → `compareStore?.isComparing ?? false`, `model.compareSelected(...)` → the new delegation through `compareStore?.runCompare(...)`.
- Add a new sibling block at the body level (next to `if let result = model.result`): `if let comparison = compareStore?.comparison { CompareResultsView(comparison: comparison, onSelectProfile: { path.append($0) }).id(comparison.headline) }`.
- Remove the dead `compareResults(_:)` helper at lines 369–430.

**Gate:** Xcode build clean.

#### I4 · Detail-page toggle

Edit `ios/StrainWise/Strain/StrainDetailView.swift`:

- In the existing `ToolbarItem` block at lines 90–103, add a second `ToolbarItem(placement: .topBarLeading)` with `CompareToggleButton`.
- `arrow.left.arrow.right` (idle) / `arrow.left.arrow.right.circle.fill` (selected). Selected state reads from `compareStore?.isIn(profile.name)`.
- Action: `compareStore?.toggle(profile.name)`.

**Gate:** Manual smoke:
1. Open a strain on Browse → tap detail → tap toolbar compare button → tray updates (back on Browse tab the tray shows the chip).
2. Tap toggle on detail page for the same strain again → tray chip removed.
3. Open two more strains, tap toggle on each → tray shows 3.
4. On Browse tab, tap "Compare 3 strains" in tray → sheet opens with result; sheet has its own NavigationStack so drilling into a strain detail works.
5. Switch to Find tab → tray hidden; in-tab `compareTray` chips and CTA visible and work.
6. Sign out / sign in cycle preserves tray selection (env store is in-memory but persists during the session).

#### I5 · Optional polish

- Run `xcodegen generate` once to refresh the project (no project.yml edits needed — the new `Compare/` directory is auto-globbed).
- Verify the generated pbxproj includes the new files (`grep "CompareSelectionStore" StrainWise.xcodeproj/project.pbxproj`).

## Order of operations

Build **W1 → W2 → W3 → W4 → W5** on the web track in series. Build **I1 → I2 → I3 → I4 → I5** on the iOS track in series. Run both tracks in parallel if you have two implementers; otherwise, do web first (smaller blast radius, faster smoke test) and iOS second.

Within each track, do not advance to the next step until the previous step's gate passes.

## Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| `useSearchParams.set` write-back causes render loops under React 19 StrictMode | Medium | High | W1's hook tests cover the round-trip. If it loops, guard writes with a `useRef` to skip the first sync. |
| FindModel `@Environment(CompareSelectionStore.self)` doesn't work because `@Observable` requires explicit injection at the model layer | High | Medium | The plan resolves this via `init(compareStore:)`, not `@Environment`. If `@Environment` is preferred, the smoke test catches it. |
| Wiring `compareTray` (currently dead) into FindView breaks its existing layout | Medium | Medium | `compareTray` already has the right shape (chips + CTA) — it just wasn't rendered. Smoke test on the Find tab will catch any layout regressions. |
| `MainTabView` already injects other stores (`AuthSession`, `SavedStrainsStore`, etc.) via environment; adding a 4th store collides with Preview helpers that don't include it | Medium | Low | The preview helpers (`PreviewStrainAPI`, `DelayedPreviewAPI`) don't need the compare store. `MainTabView` only injects it on the live path. Previews that need it can add `.environment(CompareSelectionStore())` at the preview site. |
| `useCompareSelection` URL writes trigger re-fetches in any effect that depends on `searchParams` | Low | Medium | W1 tests + Dashboard smoke test (no infinite re-render in dev tools) catch this. |
| The legacy `?strains=` emitters (`Strain.tsx:231`, `StrainDirectory.tsx:384`) silently break after the Dashboard effect removal | Low | High | The hook replaces the effect; both emitters navigate to URLs the hook reads. Manual smoke in W3 verifies. |
| Tray sheet's internal `NavigationStack` causes a duplicate sheet-stacked-on-sheet on iOS | Low | Low | W3 / I3 smoke test. If it occurs, present the tray result as a `fullScreenCover` instead of `sheet`. |

## Critical files / systems / interfaces

### Web

- `src/hooks/use-compare-selection.ts` — new
- `src/components/compare/CompareTray.tsx` — new
- `src/components/compare/CompareToggleButton.tsx` — new
- `src/pages/Dashboard.tsx` — refactor (state → hook, remove redundant effect, mount tray)
- `src/pages/Strain.tsx` — add "Add to compare" button
- `src/components/directory/StrainDirectory.tsx` — remove per-card Compare link

### iOS

- `ios/StrainWise/Compare/CompareSelectionStore.swift` — new
- `ios/StrainWise/Compare/CompareToggleButton.swift` — new
- `ios/StrainWise/Compare/CompareTrayBar.swift` — new
- `ios/StrainWise/Compare/CompareResultsView.swift` — new
- `ios/StrainWise/App/MainTabView.swift` — inject store, mount tray
- `ios/StrainWise/Find/FindModel.swift` — refactor (delegate to store)
- `ios/StrainWise/Find/FindView.swift` — wire `compareTray` into body, add `CompareResultsView` inline, remove dead `compareResults(_:)`
- `ios/StrainWise/Strain/StrainDetailView.swift` — toolbar button

### Untouched

- `functions/` — no changes
- `firestore.rules` — no changes
- All other surfaces (Home, Browse, Saved, AilmentCarousel, StrainRail, StrainGrid, etc.) — no changes

## Verification / acceptance bar

**Web**

1. `bun test` — all new tests pass; no regressions.
2. `bun run build` — production build clean.
3. Manual smoke (against the dev server):
   - Strain detail page shows "Add to compare" button. Tapping it navigates to dashboard with the strain in the tray.
   - Tray floats above every Dashboard tab (Find, Compare, Saved, History, Browse).
   - Tray hides when selection is empty (after Clear or chip removal).
   - Tapping "Compare (N)" in the tray runs `handleCompare` and renders the result identically to today's Compare tab.
   - `/dashboard?strains=Blue%20Dream,OG%20Kush` deep link loads with both pre-selected.
   - Reloading `/dashboard?strains=...` restores the selection.
   - Pressing browser Back removes the param.
   - Unauthenticated tap on "Add to compare" on the strain page redirects to `/auth?returnTo=/dashboard?strains=...` and preserves the selection.
   - All existing flows still work: Finder "Compare the top picks", Compare tab picker, QUICK_PICKS, "vs {saved}" buttons on Strain.tsx.

**iOS**

1. `xcodebuild test -scheme StrainWise` — `CompareSelectionStoreTests` passes.
2. `xcodebuild build -scheme StrainWise` — Xcode build clean after `xcodegen generate`.
3. Manual smoke (against iPhone simulator):
   - Open a strain on Browse → tap detail → tap toolbar compare button → selection updates in the env store.
   - Tap toolbar compare on the same strain again → removed.
   - Open two more strains, add each → tray on Browse shows 3.
   - On Browse tab, tap "Compare 3 strains" in tray → sheet opens with result; drilling into a strain detail works via the sheet's internal NavigationStack.
   - Switch to Find tab → tray hidden; `compareTray` chips and CTA visible and functional; result renders inline.
   - Switch back to Browse tab → tray reappears with the same 3 selections.
   - Sign out / sign in preserves the in-session selection (resets only on app restart).

**Cross-platform**

- Both apps share the same Firebase project. Verify the `compareStrains` Cloud Function accepts 2–3 strain names and returns the expected shape. No deployment needed (`compareStrains` is unchanged).
- No new env vars, no deploy workflow changes.

## Next step

JC approves the spec (already given) and this plan. Then: start **W1** (or **I1**, if doing iOS first). Both tracks can run in parallel. Report back after each gate.
