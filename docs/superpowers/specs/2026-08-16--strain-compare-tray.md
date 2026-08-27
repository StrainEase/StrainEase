# Compare-from-search: persistent floating tray

**Date:** 2026-08-16
**Scope:** `strain-finder` web app (`src/`) **and** SwiftUI iOS companion (`ios/StrainEase/`)
**Status:** Approved by JC. Awaiting implementation plan.

## Problem

The web app and the iOS app both already let users run a side-by-side strain comparison, but the only ergonomic entry point is the patient-research tool (`StrainFinder` on web, `FindView` on iOS). The strain detail page (`Strain.tsx` on web, `StrainDetailView.swift` on iOS) has no "Add to compare" affordance, and on the web the directory's per-card "Compare" button just hops to compare mode with a single strain — users can't accumulate selections across cards. The iOS app is missing the affordance entirely outside `FindView`.

## Goal

Add an "easy way to compare strains from search," available with minimal friction, with two equivalent paths:

- **Detail-page path:** every strain detail page gets an "Add to compare" toggle. The persistent floating tray accumulates selections across detail pages so users can browse a few strains and then run a comparison with one tap.
- **Patient-research-tool path:** the existing `StrainFinder` / `FindView` flow keeps working, and its selections feed the same shared selection so users can keep browsing elsewhere without losing them.

The toggle lives only on the **strain detail page** — not on grid cards in Home, Browse, Saved, or anywhere else. The reason: the detail page is the natural home for "compare this strain against X," and the tray already covers the multi-select accumulation UX. Putting a toggle on every card would clutter the grid without adding much value.

Both paths land on the existing `compareStrains` Cloud Function. No backend changes.

## High-level architecture

Each platform gets a single source of truth for the compare selection, plus a floating tray that surfaces it across every tab/view that shows strain cards.

| Platform | Single source of truth | Tray rendering | Run button |
| --- | --- | --- | --- |
| Web | URL search param `?strains=NAME1,NAME2` driven by a `useCompareSelection()` hook (reuses the existing key — no new param) | `<CompareTray />` mounted inside `Dashboard.tsx` | Calls the existing `handleCompare()` directly (same path as the Compare tab's "Compare strains" button) |
| iOS | `@Observable @MainActor final class CompareSelectionStore` injected via SwiftUI environment at `MainTabView` (also owns `comparison`, `isComparing`, and a single `runCompare(...)` method) | `<CompareTrayBar />` rendered as an overlay above the tab bar. **Hidden when `nav.tab == .find`** to avoid a duplicate CTA — the Find tab continues to render the result inline | Calls `store.runCompare(...)` and presents a sheet with the result on every tab except Find (Find renders inline as today) |

Selection rules are identical on both platforms:

- Cap at **3** strains (matches the existing `compareStrains` cap).
- **Case-insensitive dedup** by name.
- Empty selection → tray hidden entirely (no chrome clutter).
- Removing the last strain → param/store cleared, not left empty.

---

## Web (React) design

### New files

- `src/hooks/use-compare-selection.ts` — reads/writes the existing URL `?strains=` param via `useSearchParams`. Single source of truth for the compare selection across all Dashboard mode tabs. Public surface:
  - `names: string[]` — case-preserving, deduped, capped.
  - `add(name)`, `remove(name)`, `toggle(name) -> Bool` (returns new "is in" state).
  - `setNames(names)` — batch set used by `applyQuickPick` (replaces contents, dedupes, caps).
  - `clear()` — empty selection; URL param removed entirely when count hits 0.
  - `isIn(name)`, `atCap`, `count`, `cap`.
  - Hydrates from `?strains=` on mount and re-syncs on every `searchParams` change. Every mutation writes back through `setSearchParams` so URL and component state stay in lockstep.
- `src/hooks/use-compare-selection.test.ts` — pure URL parse/serialize/dedup/cap, plus the round-trip property `parse(serialize(names)) == names` (case-insensitive).
- `src/components/compare/CompareTray.tsx` — sticky bottom bar (`fixed inset-x-0 bottom-0 z-50`), hidden when `names.length === 0`. Contents: a row of chips for each name (each with a `×` to remove), a primary "Compare (N)" button that calls `handleCompare()` directly, and a secondary "Clear" button that calls `clear()`. Animates in/out via `framer-motion` (`initial/animate/exit`). Mobile: chips wrap, primary CTA full-width, `pb-[env(safe-area-inset-bottom)]` so iOS Safari's home indicator doesn't cover it. Honors project rules: borders only (no shadows), no nested cards, `bg-background/85 backdrop-blur-md` to match the existing header pattern at `Dashboard.tsx:318`.
- `src/components/compare/CompareToggleButton.tsx` — small icon button (lucide `GitCompareArrows`) with three visual states: idle (outline), selected (primary tint + `Check` icon), full (disabled, tooltip "Compare is full (3 strains)"). `aria-pressed` reflects state. **Calls `e.preventDefault()` + `e.stopPropagation()` on click** so it never triggers the parent `<Link>` navigation. **Used in only one place: the `Strain.tsx` detail page's "Add to compare" button (as a regular `<Button>`, not a card overlay).** The grid-card overlay use-case was cut for scope.
- `src/components/compare/CompareToggleButton.test.tsx` — renders the three states, click toggles, click on full is a no-op.
- `src/components/compare/CompareTray.test.tsx` — empty (renders nothing), populated (chips + buttons render), remove a chip, Compare button invokes `handleCompare`, Clear empties.

### Wiring — explicit enumeration

The Dashboard has many call sites that currently read or mutate `selectedNames`. Every one must be re-pointed at the hook.

#### `src/pages/Dashboard.tsx`

- **Replace state.** `const [selectedNames, setSelectedNames] = useState<string[]>([])` → `const selection = useCompareSelection()` with `names = selection.names`, etc.
- **Delete the redundant `useEffect` at lines 151–160** that reads `?strains=`. The hook now owns that responsibility; keeping the effect would cause two writers fighting for the same URL key.
- **Mutations re-pointed.** Every `setSelectedNames(...)` site becomes a hook call:
  - `applyQuickPick` (line 276): `setSelectedNames(pick.strains)` → `selection.setNames(pick.strains)`.
  - `resetComparison` (line 287): `setSelectedNames([])` → `selection.clear()`.
  - `toggleStrainName` (line 196): `setSelectedNames(prev => ...)` → `selection.toggle(name)`.
  - `addCustomStrain` (line 207): unchanged in shape; calls `selection.toggle(name)` and clears the search query.
- **Reads re-pointed.** Every `selectedNames.some((n) => ...)` and `selectedNames.length` site is unchanged in shape (they read `selection.names` via the alias).
- **`startCompareFromFinder` (lines 294–302):** signature unchanged; body updates to call `selection.setNames(names)` (line 296 currently calls `setSelectedNames(names)` and would no longer compile after the swap). `setCondition(focus)`, `setResult(null)`, `setQuery("")`, `setSearchOutcome(null)`, and the trailing `void handleCompare(names, focus)` stay as-is.
- **`handleCompare` (lines 236–273):** unchanged in signature. Reads `selection.names` instead of `selectedNames` via the alias. The tray's "Compare (N)" CTA invokes this same function — single run path.
- **Mount `<CompareTray />`** once at the Dashboard root (after the `<main>` opens), outside the mode-tab divs so it floats above every tab. Pass `selection` and `handleCompare` as props.

#### Other surfaces

| Surface | Change |
| --- | --- |
| `Strain.tsx` (detail page — public route, **not** wrapped in `RequireAuth`) | **This is the only web surface that gets the new toggle.** New primary "Add to compare" button alongside "Save". On click, navigates to `/dashboard?strains=<name>`. **The button is rendered regardless of auth state** — `RequireAuth` will redirect unauthenticated users to `/auth?returnTo=/dashboard?strains=...`, which preserves the selection. Existing "vs {saved}" block stays. |
| `StrainPoster.tsx` (and every consumer: `StrainGrid.tsx`, `AilmentCarousel.tsx`, `StrainDirectory.tsx`, `SavedStrainsPanel.tsx`) | **Unchanged.** No new props, no overlay button. Grid cards keep their existing "View" link. `StrainDirectory.tsx`'s per-card "Compare" link is **removed** (it sent only one strain at a time and is now obsolete — users add via the detail page instead). |
| `StrainFinder.tsx` | No internal changes — its `onAddToCompare` / `inCompareSelection` / `compareAtCap` props already abstract the parent's selection. Dashboard.tsx:415–423 explicitly wires: `onAddToCompare={selection.toggle}`, `inCompareSelection={selection.isIn}`, `compareAtCap={selection.atCap}`. |
| `Dashboard.tsx`'s existing `handleCompare` calls | Unchanged. `applyQuickPick` (line 281), `startCompareFromFinder` (line 301), and the Compare tab's "Compare strains" button (line 685) all keep working because they call `handleCompare(names, focus)` which reads `selection.names` via the alias. |

### URL semantics

- **Key: `strains` — same as the existing legacy deep-link key.** No new URL param is introduced.
- **Value:** comma-separated strain names, URL-encoded.
- **Examples:**
  - `/dashboard?strains=Blue%20Dream,OG%20Kush` → two pre-selected; tray visible across all tabs.
  - `/dashboard?mode=compare&strains=Blue%20Dream,OG%20Kush` → opens Compare tab with the same selection (existing legacy behavior preserved).
  - `/dashboard?strains=Blue%20Dream` → one pre-selected; tray visible but the Compare button is disabled until a second is added (matches existing `handleCompare` early-return at Dashboard.tsx:240).
- **When the selection becomes empty, the param is removed entirely** (no `?strains=` left dangling).
- **Pre-existing emitters continue to work:**
  - `StrainDirectory.tsx:384` — `?mode=compare&strains=NAME` still works.
  - `Strain.tsx:231` — `?mode=compare&strains=NAME1,NAME2` still works.
  - The hook absorbs the read so the existing `useEffect` at `Dashboard.tsx:151–160` is removed (no duplicate writers).

### Style rules honored

- No shadows, borders only.
- No nested cards.
- No skeletons (use `<Loader2 />` for any loading state if needed).
- Mobile responsive.
- Framer motion for tray enter/exit.
- `z-50` (above the header at `z-40`) so the tray floats above content but below modals.

---

## iOS (SwiftUI) design

### New files

- `ios/StrainEase/Compare/CompareSelectionStore.swift` — `@Observable @MainActor final class CompareSelectionStore`. Public surface:
  - `var names: [String]` (case-preserving, deduped, capped at 3).
  - `func add(_:)`, `func remove(_:)`, `func toggle(_:) -> Bool`.
  - `func setNames(_:)` — batch set used by quick-pick flows.
  - `func clear()`.
  - `func isIn(_:) -> Bool`, `var atCap: Bool`, `var count: Int`, `let cap = 3`.
  - `var canRunCompare: Bool { count >= 2 }`.
  - **Run path lives here too:** `var comparison: StrainComparison?`, `var isComparing: Bool`, `var compareError: String?`, `func runCompare(api:conditions:prefs:reliefSummary:) async`. The single point of truth for the comparison result on both the Find tab (renders inline) and the tray (presents a sheet).
  - Case-insensitive dedup uses `String.caseInsensitiveCompare(_:)`, matching `FindModel`'s existing helpers.
- `ios/StrainEase/Compare/CompareTrayBar.swift` — overlay view rendered in `MainTabView`. Hidden when `names.isEmpty`. Hidden when `nav.tab == .find` to avoid a duplicate CTA on that tab (FindModel+FindView continue to handle the result inline as today). Contents: a horizontal scroll of chips per name (each with a close button), primary "Compare N strains" button, secondary "Clear" button. Sits above the tab bar with `safeAreaInset(edge: .bottom)` plus an explicit keyboard observer so it never hides under the keyboard. Animates in/out via SwiftUI transition (`.move(edge: .bottom).combined(with: .opacity)`). When `store.comparison` becomes non-nil, presents a sheet containing a reusable `CompareResultsView(comparison:)` extracted from FindView.
- `ios/StrainEase/Compare/CompareToggleButton.swift` — small `Button` (SF symbol `arrow.left.arrow.right` idle / `arrow.left.arrow.right.circle.fill` selected) with the three visual states. `.buttonStyle(.borderless)` + `.contentShape(Rectangle())` not needed here because the toggle is only rendered as a `ToolbarItem` in `StrainDetailView`, not inside a card. `accessibilityLabel` and `accessibilityHint` mirror the web tooltip. **Used in only one place: the `StrainDetailView` toolbar.**
- `ios/StrainEase/Compare/CompareResultsView.swift` — **new view**, parameterized as `struct CompareResultsView: View { let comparison: StrainComparison; let onSelectProfile: (StrainProfile) -> Void }`. Renders the same comparison layout as the existing `compareResults(_:)` helper at FindView.swift:369–430, but takes an `onSelectProfile` callback so it works in any host (FindView's `NavigationStack(path: $path)` wraps it with `{ path.append($0) }`; the tray's sheet wraps it with a closure that pushes onto its own internal `NavigationStack`). The dead `compareResults(_:)` helper at FindView.swift:369–430 is **removed**; the dead `compareTray` helper at FindView.swift:322–367 is **wired up** into FindView's body (see Wiring table).
- `ios/StrainEaseTests/CompareSelectionStoreTests.swift` — XCTest for add / remove / toggle / dedup / cap / clear / canRunCompare / setNames.

### Project.yml / xcodegen note

`ios/project.yml` uses a `path: StrainEase` source glob, so the new `Compare/` directory will be picked up automatically by `xcodegen generate`. **No project.yml edits are required.** The implementer runs `xcodegen generate` once after adding the files.

### Wiring

| Surface | Change |
| --- | --- |
| `MainTabView.swift` | Owns `@State private var compareStore = CompareSelectionStore()`. Injects via `.environment(compareStore)`. Renders `<CompareTrayBar />` as a `.safeAreaInset(edge: .bottom)` overlay above the `TabView`. Tray is bound to `nav.tab` so it can hide when `nav.tab == .find`. |
| `StrainDetailView.swift` | **This is the only iOS surface that gets the new toggle.** Toolbar gains a second trailing item. `StrainDetailView` does **not** apply `.appChrome()` (verified — `grep -n "appChrome" StrainDetailView.swift` returns nothing), so the Favorites heart from `AppChromeModifier` is not present on this screen. The heart is at `StrainDetailView.swift:91–102` (`.topBarTrailing`). The new "Add to compare" button goes in `.topBarLeading` so it sits to the left of the heart without crowding the trailing slot. SF symbols: `arrow.left.arrow.right` (idle) / `arrow.left.arrow.right.circle.fill` (selected). Action: `compareStore.toggle(profile.name)`. `accessibilityLabel` mirrors the web tooltip. |
| `StrainPoster.swift` (and every consumer: `StrainRail`, `HomeView.swift`, `DirectoryView.swift`, `SavedStrainsView.swift`, `AilmentCarousel.swift`) | **Unchanged.** No new parameter on `StrainPoster`, no env wiring in consumers, no overlay button on cards. Grid cards keep their existing tap target. |
| `FindModel.swift` | `compareNames`, `isComparing`, `comparison`, and `compareError` are removed and replaced with reads/writes through `@Environment(CompareSelectionStore.self) compareStore`. The `addToCompare`, `removeFromCompare`, `toggleCompare`, `isInCompare`, `compareAtCap`, `canCompare`, `compareSelected`, `reset` methods delegate to the store. **Specifically:** `addToCompare` → `store.add`, `removeFromCompare` → `store.remove`, `toggleCompare` → `store.toggle`, `isInCompare` → `store.isIn`, `compareAtCap` → `store.atCap`, `canCompare` → `store.canRunCompare && !store.isComparing`, `compareSelected` → `await store.runCompare(api: conditions: prefs: reliefSummary:)`, `reset` keeps its existing behavior of clearing ailments, searched, result, prefs, potency, lookupQuery, lookupError, customAilment, **plus** delegates compare-side cleanup to `store.clear()` and `store.comparison = nil` (does not touch `store.isComparing` or `store.compareError` mid-run — those clear themselves when `runCompare` finishes). |
| `FindView.swift` | Reads the shared store via `@Environment(CompareSelectionStore.self) compareStore`. **Two structural changes to the body** (these are net-new, not refactors): (1) `compareTray` (FindView.swift:322–367, currently dead code) is **wired into the body** as a sibling block at the body level — it renders inside the existing `ScrollView` between `prefs` and `recommendations`. All of its references re-point: `model.compareNames` → `compareStore.names`, `model.removeFromCompare(name)` → `compareStore.remove(name)`, `model.canCompare` → `compareStore.canRunCompare && !compareStore.isComparing`, `model.isComparing` → `compareStore.isComparing`, `model.compareSelected(...)` → `await compareStore.runCompare(api: api, conditions: model.ailments, prefs: model.prefs, reliefSummary: relief.summary.isEmpty ? nil : relief.summary)`. (2) A new sibling block at the body level (next to the existing `if let result = model.result { results(result) }` at line 52) renders the inline comparison result: `if let comparison = compareStore.comparison { CompareResultsView(comparison: comparison) { path.append($0) }.id(comparison.headline) }`. **Tray is hidden on this tab** (`nav.tab == .find`), so there's exactly one Compare CTA visible. |

### Tap propagation

- **N/A for the toggle itself.** `CompareToggleButton` is now only used in `StrainDetailView`'s toolbar, where it lives as a sibling to other `ToolbarItem`s rather than nested inside a `Button`/`NavigationLink`. No special tap-interception configuration needed.

### Run path

When the tray's "Compare N strains" is tapped (on Browse, Saved, or Home tabs):

1. Tray calls `await compareStore.runCompare(api: api, conditions: [], prefs: ResearchPrefs(), reliefSummary: nil)`. (Conditions and prefs default to empty on the tray path; the Find tab passes the real values.)
2. On success, `store.comparison` is set. The tray observes this and presents a sheet. The sheet wraps its own `NavigationStack { CompareResultsView(comparison: store.comparison, onSelectProfile: { trayPath.append($0) }) }`, where `trayPath` is `@State private var trayPath: [StrainProfile] = []` declared on `CompareTrayBar`. The sheet also declares `.navigationDestination(for: StrainProfile.self) { StrainDetailView(profile: $0) }` so the user can drill into a strain detail from inside the sheet (mirroring FindView.swift:9, 102–104).
3. On failure, `store.compareError` is set. The tray surfaces via the existing `errorMessage` pattern + a `sensoryFeedback(.error)` haptic.

When FindView's "Compare N strains" is tapped:

1. Same call, same `store.runCompare(...)`. Because the tray is hidden on this tab, no sheet is presented.
2. The `store.comparison` change triggers FindView's inline `CompareResultsView` re-render.

Same store, same method, same result; presentation differs by tab. One source of truth.

### SwiftUI specifics

- **Environment injection:** `compareStore` is provided by `MainTabView` via `.environment(compareStore)` and read with `@Environment(CompareSelectionStore.self)`. No prop drilling. Matches the existing pattern (`RecentlyViewedStore`, `AppNavigation`, `SavedStrainsStore`).
- **Keyboard interaction:** tray uses `safeAreaInset(edge: .bottom)` plus an explicit `.onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillChangeFrameNotification))` observer to add bottom padding equal to the keyboard height. Prevents the tray from hiding under the keyboard on Find's lookup field or any other input.
- **No new dependencies.** Uses only `SwiftUI` and the existing `StrainAPI` protocol.

---

## Cross-platform parity

| Behavior | Web | iOS |
| --- | --- | --- |
| Cap | 3 | 3 |
| Dedup | Case-insensitive | Case-insensitive |
| Hidden when empty | Yes | Yes |
| Persists across nav | Yes (URL) | Yes (env store) |
| Finder path | Preserved | Preserved (delegates to shared store) |
| Run path | Single: `handleCompare()` | Single: `store.runCompare(...)` |
| Backend call | `compareStrains({strainNames,condition,prefs})` | `api.compare(strainNames:conditions:prefs:reliefSummary:)` |
| Empty-on-clear | URL param dropped | Store empty, URL param doesn't apply |
| Reload restores state | Yes | N/A (no URL) |
| Result presentation | Inline on Compare tab | Inline on Find tab; sheet on other tabs |

---

## Edge cases

- Adding the same strain twice (different case) → second click is a no-op toggle-off.
- Removing the last strain → URL param dropped (web); tray animates out.
- **Reload mid-selection (web)** → hook re-hydrates from `?strains=` on mount; tray re-renders.
- **Strain removed from `Saved` but still in URL** → the hook filters out names whose profiles are no longer in any current discovery surface only on `SavedStrainsPanel` render. The hook itself is dumb about this and just stores strings.
- **iOS tab-switch mid-selection** → preserved by env store; tray floats above the active tab (except Find).
- **Mobile safe-area respected on both platforms** — tray uses `pb-[env(safe-area-inset-bottom)]` on web, `safeAreaInset + keyboard observer` on iOS.
- **iOS keyboard** — Find's lookup input no longer hides the tray under the keyboard; observer adds padding.
- **Web auth on Strain.tsx** — "Add to compare" is rendered for everyone; unauthenticated users are redirected to `/auth?returnTo=/dashboard?strains=…` and the selection is preserved on the return trip.
- **Web deep-link routes** — `/find/:rid` and `/compare/:rid` (`main.tsx:108–109`) both mount `<Dashboard />` and the tray will show whenever `?strains=` is set or the user adds one. The hook handles the URL on these routes identically.
- **Rapid double-tap on the detail-page toggle** — `useSearchParams.set` is synchronous and the hook enforces the cap on every write. iOS `store.toggle` is synchronous on `@MainActor`. No race.
- **Browser Back button after adding a strain** — the URL becomes `/dashboard?strains=…`; the tray reflects the selection. Going Back again removes the param.
- **iOS hydrate-race on the detail page** — tapping the toggle on `StrainDetailView` while the profile is mid-network-fetch is safe; the store keys on the strain name (a string) and never on the profile object, so the toggle and the hydration are decoupled.

---

## Out of scope

- No changes to the `compareStrains` Cloud Function.
- No new Firebase callables.
- No changes to the Compare tab's analysis UI (`<AnalysisPanel />`, `<StrainDetailCard />`) or to FindView's existing comparison-result UI (it gets parameterized into `CompareResultsView` but stays visually identical).
- No persistence across logged-out sessions (URL/env store is enough for this slice).
- No bulk "compare all saved" — that's a different feature.
- No reordering of the selection order (it's a set, not an ordered list, until we run).
- iOS does not introduce a new comparison-result view from scratch; it reuses what FindView already shows.

---

## Testing

### Web

- `use-compare-selection.test.ts` — URL parse/serialize/dedup/cap; round-trip property `parse(serialize(names)) == names`; `clear()` removes the param; `setNames(names)` wipes previous selection, dedupes, caps, drops the URL param when the result is empty.
- `CompareToggleButton.test.tsx` — renders idle / selected / full states, click toggles, click on full is a no-op, click stops propagation (parent click handler is not called).
- `CompareTray.test.tsx` — empty (renders nothing), populated (chips + buttons render), remove a chip calls the hook, Compare button invokes the passed-in `handleCompare`, Clear empties.
- Manual smoke: pick strains from Directory and Saved, see tray across tab switches, run Compare from the tray, verify result renders identically to today's Compare tab.

### iOS

- `CompareSelectionStoreTests.swift` — add, remove, toggle, dedup, cap, clear, canRunCompare threshold, setNames, runCompare sets `comparison` and clears `isComparing` and `compareError`.
- Manual smoke: select a strain in Browse, switch to Find, see it in the tray-less Find tab's inline chips; run Compare from the tray on Browse, verify sheet renders the same UI as the Find tab's inline result; verify the tray does NOT show on the Find tab.

---

## Rollout notes

- Web is gated by the existing `RequireAuth` route guard — no extra auth work.
- iOS gating is implicit in the existing `MainTabView` (already behind sign-in via `AuthSession`).
- No new env vars, no deploy workflow changes, no Firebase rules changes.
- Feature is purely additive: if a user never taps the toggle, the URL and store stay empty and behavior is unchanged.
- iOS: `xcodegen generate` once after adding the new files (no project.yml edits).
- Web: build the functions as usual (no changes). Cloudflare Pages deploy unaffected.
