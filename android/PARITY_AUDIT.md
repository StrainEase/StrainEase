# Android/iOS Parity Audit Log

Last updated: 2026-08-27

## ✅ Parity verified

| iOS Screen/Feature | Android Status |
|---|---|
| HomeView hero + HomeHeadline (time-of-day) | ✅ Implemented (`HomeHeadline.kt` + `hero()` in `HomeView.kt`) |
| AilmentCarousel | ✅ Implemented in `HomeView.kt` |
| StrainRail (forYou, popular, sativa, hybrid, indica) | ✅ Implemented |
| StrainGridView | ✅ Implemented |
| FindView | ✅ Implemented |
| FindModel + recommendation + CompareResultsView | ✅ Implemented |
| DirectoryView (Browse tab) | ✅ Implemented |
| StrainDetailView header | ✅ Implemented |
| StrainDetailView effects chips | ✅ Implemented |
| StrainDetailView terpene rows | ✅ Implemented |
| StrainDetailView shop links | ✅ Implemented |
| StrainDetailView side effects | ✅ Implemented |
| ReliefLogForm | ✅ Implemented |
| TailoredDescriptionView + Ask Maya | ✅ Implemented (`TailoredDescriptionView.kt`) |
| CommunityVoicesSection (Leafly rating, Reddit/sites tabs) | ✅ Implemented (`CommunityVoicesSection.kt`) |
| SharedNotesView (Firestore community notes) | ✅ Implemented (`SharedNotesView.kt` + `PublicNotesStore.kt`) |
| CompareTrayBar | ✅ Implemented |
| CompareResultsView | ✅ Implemented |
| RedditThreadsView (in compare) | ✅ Implemented as `redditCard()` in `CompareResultsView.kt` |
| DoctorsView (results + empty state) | ✅ Implemented |
| SignInView (Google, Apple, email) | ✅ Implemented |
| AccountView (saved strains, ailments, meds, relief history) | ✅ Implemented |
| SavedAilmentsCard | ✅ Implemented |
| SavedMedicationsCard | ✅ Implemented |
| SavedStrainsStore + heart toggle | ✅ Implemented |
| SavedAilmentsStore sync to Home/Find | ✅ Implemented |
| CompareSelectionStore + CompareToggleButton | ✅ Implemented |
| Age gate | ✅ Implemented |
| Compliance footer | ✅ Implemented |

## Known Gaps (non-blocking)

| Gap | Severity | Notes |
|---|---|---|
| CompareTrayBar shows on Find tab (should be hidden per iOS) | Low | Inline compare exists on Find; tray at bottom doesn't conflict |
| ReliefHistoryView (Account): Android uses `rating + notes`, iOS uses `relief + fit + conditions + note + date` | Medium | Different data model (Android = DataStore, iOS = Firestore). Core structure present. |
| `SavedAilmentsStore` → Find sync is one-way | Low | Adding ailments in Account doesn't pre-check them in Find |
| CommunityNotes source attribution | Low | CommunityNote model has `source` field; detail UI shows it |

## Not yet ported (low priority)

| Feature | Status |
|---|---|
| RedditThreadsView as standalone screen | N/A — Reddit threads shown in `redditCard()` in CompareResultsView |
| `AILookView` in Find tab | Not in iOS A9-A13 PR scope |
