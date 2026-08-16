# Compare-from-search: persistent floating tray

**Date:** 2026-08-16
**Scope:** `strain-finder` web app (`src/`) **and** SwiftUI iOS companion (`ios/StrainWise/`)
**Status:** Approved by JC. Awaiting implementation plan.

## Problem

The web app and the iOS app both already let users run a side-by-side strain comparison, but the only ergonomic entry point is the patient-research tool (`StrainFinder` on web, `FindView` on iOS). On every other surface a strain appears (search results, popular grid, saved strains, strain detail page), there is no quick way to multi-select strains and compare them directly.

Worse, on the web the directory's per-card "Compare" button just hops to compare mode with a single strain — users can't accumulate selections across cards. The iOS app is missing the affordance entirely outside `FindView`.

## Goal

Add an "easy way to compare strains from search," available everywhere a strain card shows up, with two equivalent paths:

- **Direct path:** multi-select strains from any discovery surface, then run a side-by-side comparison with one tap.
- **Patient-research-tool path:** the existing `StrainFinder` / `FindView` flow keeps working, and its selections feed the same shared selection so users can keep browsing elsewhere without losing them.

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
- `src/components/compare/CompareToggleButton.tsx` — small icon button (lucide `GitCompareArrows`) with three visual states: idle (outline), selected (primary tint + `Check` icon), full (disabled, tooltip "Compare is full (3 strains)"). `aria-pressed` reflects state. **Calls `e.preventDefault()` + `e.stopPropagation()` on click** so it never triggers the parent `<Link>` navigation in `StrainPoster` (which is a `<Link>`).
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
- **`startCompareFromFinder` (lines 294–302):** unchanged. It calls `handleCompare(names, focus)` and the hook now keeps `selection.names` in sync with the URL.
- **`handleCompare` (lines 236–273):** unchanged in signature. Reads `selection.names` instead of `selectedNames` via the alias. The tray's "Compare (N)" CTA invokes this same function — single run path.
- **Mount `<CompareTray />`** once at the Dashboard root (after the `<main>` opens), outside the mode-tab divs so it floats above every tab. Pass `selection` and `handleCompare` as props.

#### Other surfaces

| Surface | Change |
| --- | --- |
| `StrainPoster.tsx` | Accepts new optional props `inCompareSelection: (name: string) => boolean` and `onToggleCompare: (name: string) => void`. When both are provided, renders `<CompareToggleButton />` overlaid top-right on the photo. Otherwise unchanged. |
| `StrainGrid.tsx` (Home, Browse) | Wires the two new props through to each `StrainPoster` from props passed in by the caller. |
| `AilmentCarousel.tsx` (Home tab, lines 103–110 — renders `StrainPoster` directly) | Wires the same two new props through. Otherwise unchanged. |
| `StrainDirectory.tsx` | The current per-card `<Button asChild><Link to="…?mode=compare&strains=NAME">Compare</Link></Button>` is replaced with `<CompareToggleButton />`. Heading gains a small "N selected · Clear" inline hint when `count > 0`, positioned just below the existing `<h1>` (Directory.tsx:174–180). |
| `SavedStrainsPanel.tsx` | Each saved-strain row gets a `<CompareToggleButton />` next to the existing actions. Wires through the hook (acquired via `useCompareSelection()` since the panel is inside the Dashboard). |
| `Strain.tsx` (detail page — public route, **not** wrapped in `RequireAuth`) | New primary "Add to compare" button alongside "Save". On click, navigates to `/dashboard?strains=<name>`. **The button is rendered regardless of auth state** — `RequireAuth` will redirect unauthenticated users to `/auth?returnTo=/dashboard?strains=...`, which preserves the selection. Existing "vs {saved}" block stays. |
| `StrainFinder.tsx` | No internal changes — its `onAddToCompare` / `inCompareSelection` / `compareAtCap` props already abstract the parent's selection. Dashboard passes the hook's `toggle`, `isIn`, `atCap` (single-line change per prop in Dashboard.tsx:415–423). |
| `Dashboard.tsx`'s existing `handleCompare` calls | Unchanged. `applyQuickPick` (line 281), `startCompareFromFinder` (line 301), and the Compare tab's "Compare strains" button (line 685) all keep working because they call `handleCompare(names, focus)` which reads `selection.names` via the alias. |

### URL semantics

- **Key: `strains` — same as the existing legacy deep-link key.** No new URL param is introduced.
- **Value:** comma-separated strain names, URL-encoded.
- **Examples:**
  - `/dashboard?strains=Blue%20Dream,OG%20Kush` → two pre-selected; tray visible across all tabs.
  - `/dashboard?mode=compare&strains=Blue%20Dream,OG%20Kush` → opens Compare tab with the same selection (existing legacy behavior preserved).
  - `/dashboard?strains=Blue%20Dream` → one pre-selected; tray visible but the Compare button is disabled until a second is added (matches existing `handleCompare` early-return at Dashboard.tsx:240).
- **When the selection becomes empty, the param is removed entirely** (no `?strains=` left dangling).
- **Precedence:** when both `?strains=` and a future `?compare=` are ever present, the hook reads only `?strains=`. (This is moot now since we kept one key, but documented for posterity.)
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

- `ios/StrainWise/Compare/CompareSelectionStore.swift` — `@Observable @MainActor final class CompareSelectionStore`. Public surface:
  - `var names: [String]` (case-preserving, deduped, capped at 3).
  - `func add(_:)`, `func remove(_:)`, `func toggle(_:) -> Bool`.
  - `func setNames(_:)` — batch set used by quick-pick flows.
  - `func clear()`.
  - `func isIn(_:) -> Bool`, `var atCap: Bool`, `var count: Int`, `let cap = 3`.
  - `var canRunCompare: Bool { count >= 2 }`.
  - **Run path lives here too:** `var comparison: StrainComparison?`, `var isComparing: Bool`, `var compareError: String?`, `func runCompare(api:conditions:prefs:reliefSummary:) async`. The single point of truth for the comparison result on both the Find tab (renders inline) and the tray (presents a sheet).
  - Case-insensitive dedup uses `String.caseInsensitiveCompare(_:)`, matching `FindModel`'s existing helpers.
- `ios/StrainWise/Compare/CompareTrayBar.swift` — overlay view rendered in `MainTabView`. Hidden when `names.isEmpty`. Hidden when `nav.tab == .find` to avoid a duplicate CTA on that tab (FindModel+FindView continue to handle the result inline as today). Contents: a horizontal scroll of chips per name (each with a close button), primary "Compare N strains" button, secondary "Clear" button. Sits above the tab bar with `safeAreaInset(edge: .bottom)` plus an explicit keyboard observer so it never hides under the keyboard. Animates in/out via SwiftUI transition (`.move(edge: .bottom).combined(with: .opacity)`). When `store.comparison` becomes non-nil, presents a sheet containing a reusable `CompareResultsView(comparison:)` extracted from FindView.
- `ios/StrainWise/Compare/CompareToggleButton.swift` — small `Button` (SF symbol `arrow.left.arrow.right` idle / `arrow.left.arrow.right.circle.fill` selected) with the three visual states. Uses `.buttonStyle(.borderless)` plus `.contentShape(Rectangle())` for tap interception in `NavigationLink`-wrapped parents. `accessibilityLabel` and `accessibilityHint` mirror the web tooltip.
- `ios/StrainWise/Compare/CompareResultsView.swift` — extracted from `FindView`'s existing inline results section (FindView.swift:369–430). Renders the comparison result with the same layout. Reused by both FindView (inline) and the tray's sheet.
- `ios/StrainWiseTests/CompareSelectionStoreTests.swift` — XCTest for add / remove / toggle / dedup / cap / clear / canRunCompare / setNames.

### Project.yml / xcodegen note

`ios/project.yml` uses a `path: StrainWise` source glob, so the new `Compare/` directory will be picked up automatically by `xcodegen generate`. **No project.yml edits are required.** The implementer runs `xcodegen generate` once after adding the files.

### Wiring

| Surface | Change |
| --- | --- |
| `MainTabView.swift` | Owns `@State private var compareStore = CompareSelectionStore()`. Injects via `.environment(compareStore)`. Renders `<CompareTrayBar />` as a `.safeAreaInset(edge: .bottom)` overlay above the `TabView`. Tray is bound to `nav.tab` so it can hide when `nav.tab == .find`. |
| `StrainPoster.swift` | Gains optional `compareStore: CompareSelectionStore?` parameter; when set, overlays `CompareToggleButton` on the photo using `.overlay(alignment: .topTrailing)`. |
| `StrainRail.swift` | Picks up `compareStore` from `@Environment(CompareSelectionStore.self)` and forwards to each `StrainPoster`. |
| `HomeView.swift`, `DirectoryView.swift`, `SavedStrainsView.swift` | All three pick up `compareStore` from the environment and forward to their `StrainPoster` instances. No new parameters on these views themselves. |
| `StrainDetailView.swift` | Toolbar gains a second trailing item. Because the heart already lives in `.topBarTrailing`, the new button goes in `.topBarLeading` (alongside the existing "Favorites" toolbar heart from `AppChromeModifier`) — **or** in a dedicated trailing position when the chrome toolbar isn't applied. The button is a `Button` with `arrow.left.arrow.right` (idle) / `arrow.left.arrow.right.circle.fill` (selected), wired to `compareStore.toggle(profile.name)`. `accessibilityLabel` mirrors the web tooltip. |
| `FindModel.swift` | `compareNames`, `isComparing`, `comparison`, and `compareError` are removed and replaced with reads/writes through `@Environment(CompareSelectionStore.self) compareStore`. The `addToCompare`, `removeFromCompare`, `toggleCompare`, `isInCompare`, `compareAtCap`, `canCompare`, `compareSelected`, `reset` methods delegate to the store. **Specifically:** `addToCompare` → `store.add`, `removeFromCompare` → `store.remove`, `toggleCompare` → `store.toggle`, `isInCompare` → `store.isIn`, `compareAtCap` → `store.atCap`, `canCompare` → `store.canRunCompare && !store.isComparing`, `compareSelected` → `await store.runCompare(...)`, `reset` calls `store.clear()` and `store.comparison = nil`. |
| `FindView.swift` | Reads the shared store via `@Environment(CompareSelectionStore.self) compareStore`. Renders inline `CompareResultsView(comparison: store.comparison)` inside its existing results section (extracted view). The in-tab "Compare N strains" CTA stays but its action is now `await compareStore.runCompare(...)`. **Tray is hidden on this tab** (the tray reads `nav.tab`), so there's exactly one Compare CTA visible. |

### Tap propagation

- Inside a `Button` (StrainRail, DirectoryView's plain-Button row): `CompareToggleButton` with `.buttonStyle(.borderless)` plus `.contentShape(Rectangle())` reliably intercepts taps on iOS 17+.
- Inside a `NavigationLink` (SavedStrainsView): same — verified pattern. If a future iOS regression surfaces, fall back to `.simultaneousGesture(TapGesture().onEnded { ... })` on the toggle and disable the parent via `.buttonStyle(.plain)`.
- Manual test during implementation: tap the toggle on a Saved strain; assert no push onto the navigation stack.

### Run path

When the tray's "Compare N strains" is tapped (on Browse, Saved, or Home tabs):

1. Tray calls `await compareStore.runCompare(api: api, conditions: [], prefs: .empty, reliefSummary: nil)`. (Conditions and prefs default to empty on the tray path; the Find tab passes the real values.)
2. On success, `store.comparison` is set. The tray observes this and presents `<CompareResultsView />` as a sheet.
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
- **Rapid double-tap on the same card** — `useSearchParams.set` is synchronous and the hook enforces the cap on every write. iOS `store.add` is synchronous on `@MainActor`. No race.
- **Browser Back button after adding a strain** — the URL becomes `/dashboard?strains=…`; the tray reflects the selection. Going Back again removes the param.
- **iOS hydrate-race** — tapping the toggle on a card whose profile is mid-network-fetch is safe; the store keys on the strain name (a string) and never on the profile object, so the toggle and the hydration are decoupled.

---

## Out of scope

- No changes to the `compareStrains` Cloud Function.
- No new Firebase callables.
- No changes to the Compare tab's analysis UI (`<AnalysisPanel />`, `<StrainDetailCard />`) or to FindView's existing comparison UI (it gets extracted into `CompareResultsView` but visually identical).
- No persistence across logged-out sessions (URL/env store is enough for this slice).
- No bulk "compare all saved" — that's a different feature.
- No reordering of the selection order (it's a set, not an ordered list, until we run).
- iOS does not introduce a new comparison-result view from scratch; it reuses what FindView already shows.

---

## Testing

### Web

- `use-compare-selection.test.ts` — URL parse/serialize/dedup/cap; round-trip property `parse(serialize(names)) == names`; `clear()` removes the param.
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
