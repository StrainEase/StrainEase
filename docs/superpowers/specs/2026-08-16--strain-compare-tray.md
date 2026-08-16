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

| Platform | Single source of truth | Tray rendering |
| --- | --- | --- |
| Web | URL search param `?compare=NAME1,NAME2` driven by a `useCompareSelection()` hook | `<CompareTray />` mounted inside `Dashboard.tsx` |
| iOS | `@Observable @MainActor final class CompareSelectionStore` injected via SwiftUI environment at `MainTabView` | `<CompareTrayBar />` rendered as an overlay above the tab bar |

Selection rules are identical on both platforms:

- Cap at **3** strains (matches the existing `compareStrains` cap).
- **Case-insensitive dedup** by name.
- Empty selection → tray hidden entirely (no chrome clutter).
- Removing the last strain → param/store cleared, not left empty.

## Web (React) design

### New files

- `src/hooks/use-compare-selection.ts` — reads/writes the URL `?compare=` param via `useSearchParams`. Exposes `names`, `add(name)`, `remove(name)`, `toggle(name)`, `clear()`, `isIn(name)`, `atCap`, `cap`. Pure logic — unit-tested.
- `src/components/compare/CompareTray.tsx` — sticky bottom bar, hidden when `names.length === 0`. Chips for each name (with `×` to remove), primary "Compare (N)" button, secondary "Clear" button. Animates in/out via `framer-motion`. Mobile: chips wrap, primary CTA full-width. Honors project rules: borders only (no shadows), no nested cards, `bg-background/85 backdrop-blur-md` to match the existing header pattern.
- `src/components/compare/CompareToggleButton.tsx` — small icon button (lucide `GitCompareArrows`) with three visual states: idle (outline), selected (primary tint + `Check` icon), full (disabled, tooltip "Compare is full (3 strains)"). `aria-pressed` reflects state. Stops click propagation so the underlying card link doesn't navigate.
- `src/components/compare/CompareToggleButton.test.tsx` and `CompareTray.test.tsx` — RTL tests for the three states and the empty/populated tray.
- `src/hooks/use-compare-selection.test.ts` — URL parsing / serialization / dedup / cap unit tests.

### Wiring

| Surface | Change |
| --- | --- |
| `Dashboard.tsx` | Replaces `selectedNames` local state with `useCompareSelection()`. Mounts `<CompareTray />` once at the Dashboard root (renders across all mode tabs). The existing `?mode=compare&strains=…` reader keeps working — when the tray's "Compare (N)" is tapped, we navigate to `?mode=compare&compare=…` and the existing effect reads it. |
| `StrainPoster.tsx` | Accepts new optional props `inCompareSelection` and `onToggleCompare`. When provided, renders `<CompareToggleButton />` overlaid top-right on the photo. Otherwise unchanged. |
| `StrainGrid.tsx` (Home, Browse) | Wires the two new props through to each `StrainPoster`. |
| `StrainDirectory.tsx` | The current per-card `<Button asChild><Link to="…?mode=compare&strains=NAME">Compare</Link></Button>` is replaced with `<CompareToggleButton />`. Heading gains a small "N selected" hint when count > 0. |
| `SavedStrainsPanel.tsx` | Each saved-strain row gets a `<CompareToggleButton />` next to the existing actions. Wires through the hook. |
| `Strain.tsx` (detail page) | New primary "Add to compare" button alongside "Save". On click, navigates to `/dashboard?compare=<name>` (the Dashboard's effect reads it and the tray appears). Existing "vs {saved}" block stays. |
| `StrainFinder.tsx` | Already accepts `onAddToCompare` / `inCompareSelection` / `compareAtCap` from the parent. The Dashboard now passes the URL-driven equivalents — single-line change per prop. |

### URL semantics

- Key: `compare`.
- Value: comma-separated strain names, URL-encoded.
- Examples:
  - `/dashboard?compare=Blue%20Dream,OG%20Kush` → two pre-selected.
  - `/dashboard?mode=compare&compare=Blue%20Dream,OG%20Kush` → opens in Compare mode with the same selection.
- When the selection becomes empty, the param is removed entirely (no `?compare=` left dangling).
- Mutations go through the hook so URL and component state stay in sync.

### Style rules honored

- No shadows, borders only.
- No nested cards.
- No skeletons (use `<Loader2 />` for any loading state if needed).
- Mobile responsive.
- Framer motion for tray enter/exit.

## iOS (SwiftUI) design

### New files

- `ios/StrainWise/Compare/CompareSelectionStore.swift` — `@Observable @MainActor final class CompareSelectionStore`. Public surface: `var names: [String]`, `let cap = 3`, `func add(_:)`, `func remove(_:)`, `func toggle(_:) -> Bool`, `func isIn(_:) -> Bool`, `func clear()`, `var canRunCompare: Bool { names.count >= 2 }`. Case-insensitive dedup matches `FindModel`'s existing helpers.
- `ios/StrainWise/Compare/CompareTrayBar.swift` — overlay view rendered in `MainTabView`. Hidden when `names.isEmpty`. Contents: a horizontal scroll of chips per name (each with a close button), primary "Compare N strains" button. Sits above the tab bar, respects `safeAreaInset` / `keyboardLayoutGuide`. Animates in/out via SwiftUI transition (`.move(edge: .bottom).combined(with: .opacity)`).
- `ios/StrainWise/Compare/CompareToggleButton.swift` — small `Button` (SF symbol `arrow.left.arrow.right`) with the same three visual states. Uses `.buttonStyle(.borderless)` so taps don't propagate to a parent `NavigationLink` or `Button`. `accessibilityLabel` and `accessibilityHint` mirror the web tooltip.
- `ios/StrainWiseTests/CompareSelectionStoreTests.swift` — XCTest for add / remove / toggle / dedup / cap.

### Wiring

| Surface | Change |
| --- | --- |
| `MainTabView.swift` | Owns a `@State private var compareStore = CompareSelectionStore()` and injects via `.environment(compareStore)`. Renders `<CompareTrayBar />` as an overlay above the `TabView` so it floats over every tab. |
| `StrainPoster.swift` | Gains optional `compareStore: CompareSelectionStore?` parameter; when set, overlays the toggle on the photo. |
| `StrainRail.swift`, `HomeView.swift` | Forward the `compareStore` from `MainTabView` down to each `StrainPoster`. |
| `DirectoryView.swift` (Browse tab) | Per-card `NavigationLink` wraps a `StrainPoster` with the toggle overlay. |
| `SavedStrainsView.swift` | Same: per-cell `NavigationLink` wraps a `StrainPoster` with the toggle overlay. |
| `StrainDetailView.swift` | Toolbar gains a second trailing button "Add to compare" (`plus`/`checkmark` SF symbol). Adds the current profile's name to the shared store. Existing heart button stays. |
| `FindModel.swift` | `compareNames` is replaced by a reference to the shared `CompareSelectionStore` (the model observes it via `@Environment`). `addToCompare`, `removeFromCompare`, `toggleCompare`, `isInCompare`, `compareAtCap` delegate to the store. The existing in-tab `CompareChip` row and "Compare N strains" button keep working — they just feed the shared store now, so the tray also updates. |
| `FindView.swift` | Reads the shared store via `@Environment(CompareSelectionStore.self)`. No new UI needed; the tab's existing chips become a view into the same selection. |

### Comparison run

When the tray's "Compare N strains" button is tapped:

1. Tray calls `api.compare(strainNames:conditions:prefs:reliefSummary:)` using the existing `LiveStrainAPI` (or its preview variant).
2. On success, the result is presented in the same comparison surface the Find tab already uses (sheet or pushed view — keep parity with the existing FindView behavior).
3. On failure, surface via the existing `errorMessage` pattern + a haptic `sensoryFeedback(.error)`.

This keeps iOS parity with the web, where the Compare tab already runs `compareStrains` and renders the result inline.

### SwiftUI specifics

- **Tap propagation:** `CompareToggleButton` is a `Button` with `.buttonStyle(.borderless)` placed in an `.overlay(alignment: .topTrailing)` on the `StrainPoster`'s photo. Borderless style prevents the parent `NavigationLink` from swallowing the tap on iOS 17+.
- **Trays above tab bar:** overlay pinned to bottom with `safeAreaInset(edge: .bottom)` plus extra padding so it doesn't collide with the system tab bar.
- **No new dependencies.** Uses only `SwiftUI` and the existing `StrainAPI` protocol.

## Cross-platform parity

The web and iOS implementations are deliberately parallel so the user has the same mental model on either device:

| Behavior | Web | iOS |
| --- | --- | --- |
| Cap | 3 | 3 |
| Dedup | Case-insensitive | Case-insensitive |
| Hidden when empty | Yes | Yes |
| Persists across nav | Yes (URL) | Yes (env store) |
| Finder path | Preserved | Preserved (delegates to shared store) |
| Backend call | `compareStrains({strainNames,condition,prefs})` | `api.compare(strainNames:conditions:prefs:reliefSummary:)` |

## Edge cases

- Adding the same strain twice (different case) → second click is a no-op toggle-off.
- Removing the last strain → URL param dropped entirely; tray animates out.
- Reload mid-selection (web) → state restored from URL.
- Strain removed from `Saved` but still in URL → tray silently drops it on next render.
- iOS: switching tabs mid-selection → preserved by env store; tray floats above the active tab.
- Mobile safe-area respected on both platforms.
- `aria-pressed` / `accessibilityLabel` mirror the visible state for screen readers.

## Out of scope

- No changes to the `compareStrains` Cloud Function.
- No new Firebase callables.
- No changes to the Compare tab's analysis UI (`<AnalysisPanel />`, `<StrainDetailCard />`).
- No persistence across logged-out sessions (URL/env store is enough for this slice).
- No bulk "compare all saved" — that's a different feature.
- No reordering of the selection order (it's a set, not an ordered list, until we run).
- iOS does not introduce a new comparison-result view; it reuses the existing Find tab flow.

## Testing

### Web

- `use-compare-selection.test.ts` — pure URL parse/serialize/dedup/cap.
- `CompareToggleButton.test.tsx` — renders idle / selected / full states, click toggles, click on full is no-op.
- `CompareTray.test.tsx` — empty (renders nothing), populated (chips + buttons render), remove a chip, Compare button navigates to `?mode=compare&compare=…`, Clear empties.

### iOS

- `CompareSelectionStoreTests.swift` — add, remove, toggle, dedup, cap, clear, canRunCompare threshold.
- Manual smoke: select a strain in Browse, switch to Find, see it in the tray; run Compare from the tray; verify result renders the same way the Find tab's button does.

## Rollout notes

- Web is gated by the existing `RequireAuth` route guard — no extra auth work.
- iOS gating is implicit in the existing `MainTabView` (already behind sign-in via `AuthSession`).
- No new env vars, no deploy workflow changes, no Firebase rules changes.
- Feature is purely additive: if a user never taps the toggle, the URL and store stay empty and behavior is unchanged.
