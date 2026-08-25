# StrainEase Android

Native Jetpack Compose companion to the StrainEase web app
([strainease.ai](https://strainease.ai)) and the iOS app
(`ios/StrainWise`). Same Firebase project (`strainfinder-84a9b`),
same accounts, same AI callables — three surfaces, one backend.

The port is shipped as 13 sequential PRs (`feat/android/<feature>`),
each reviewable on its own. See the bottom of this file for the
PR list and the root `AGENTS.md` "Android port" section for the
full plan.

## Build

```bash
cd android
./gradlew assembleDebug          # debug APK at app/build/outputs/apk/debug/
./gradlew installDebug           # install on a connected device / emulator
./gradlew test                   # JVM unit tests
./gradlew connectedAndroidTest   # instrumented Compose UI tests
```

Prerequisites:

- JDK 17 (matches the `org.gradle.java.installations.paths` hint in
  `gradle.properties`)
- Android SDK with platform 34 + build-tools 34.0.0
- The first build will download Gradle 8.7 + AGP 8.5.2

## Run

1. Open the project in Android Studio Koala (2024.1.1) or later
2. Pick the `app` run configuration
3. Hit ▶ — the app boots into the age gate → sign-in → tab root flow
4. To test the full flow locally, you can either:
   - Run the Firebase Auth emulator + populate the callables with
     the same `functions/` the web client uses
   - Point `FirebaseBootstrap` at a custom project via
     `local.properties` (see "Configuration" below)

## Configuration

The PR-A1 scaffold ships a `local.properties` template (the actual
`local.properties` is gitignored). The template points AGP at the
system Android SDK. The current `FirebaseBootstrap` builds the
`FirebaseOptions` inline from constants that match the iOS
`FirebaseBootstrap.swift` exactly, so the app boots without a
`google-services.json`. PR-A4 swaps that for a real
`google-services.json` plus the Google sign-in Activity.

## Layout

```
android/
├── app/                              # only module today
│   ├── build.gradle.kts              # AGP + Compose + Firebase wiring
│   ├── src/main/
│   │   ├── AndroidManifest.xml       # permissions + activity entry
│   │   ├── assets/
│   │   │   └── strain-directory.json # bundled Leafly + Weedmaps catalog
│   │   ├── java/com/strainwise/app/
│   │   │   ├── StrainWiseApplication.kt   # FirebaseBootstrap + Coil + catalog
│   │   │   ├── MainActivity.kt            # setContent { StrainWiseTheme { RootView } }
│   │   │   ├── app/
│   │   │   │   ├── AppNavigation.kt
│   │   │   │   ├── MainTabView.kt          # 4 tabs + CompareTrayBar slot
│   │   │   │   └── RootView.kt            # age gate → sign-in → tabs
│   │   │   ├── auth/
│   │   │   │   ├── AuthSession.kt         # email + Google (no Apple)
│   │   │   │   └── SignInView.kt
│   │   │   ├── compliance/
│   │   │   │   ├── AgeRegion.kt
│   │   │   │   ├── AgeVerificationStore.kt
│   │   │   │   └── AgeGateView.kt
│   │   │   ├── data/
│   │   │   │   ├── ImageCache.kt          # Coil ImageLoader (32 MB / 256 MB)
│   │   │   │   ├── LiveStrainAPI.kt       # Firebase Functions
│   │   │   │   ├── PreviewData.kt
│   │   │   │   ├── PreviewStrainAPI.kt
│   │   │   │   ├── RecentlyViewedStore.kt
│   │   │   │   ├── ReliefLogStore.kt
│   │   │   │   ├── SavedAilmentsStore.kt
│   │   │   │   ├── SavedMedicationsStore.kt
│   │   │   │   ├── SavedStrainsStore.kt
│   │   │   │   └── StrainCatalog.kt       # curated + bundled JSON
│   │   │   ├── models/                    # StrainProfile + RecommendationResult
│   │   │   │   └── ...
│   │   │   ├── services/
│   │   │   │   ├── FirebaseBootstrap.kt   # matches iOS bootstrap constants
│   │   │   │   └── ImageCache.kt
│   │   │   └── ui/
│   │   │       ├── components/            # SWCard, SWChip, SWField, etc.
│   │   │       ├── theme/                 # Palette + TypeStyle + Theme
│   │   │       ├── home/                  # HomeView + HomeModel + AilmentCarousel
│   │   │       ├── find/                  # FindView + FindModel
│   │   │       ├── browse/                # DirectoryView + DirectoryFilter
│   │   │       ├── strain/                # StrainDetailView + terpenes
│   │   │       ├── compare/               # CompareSelectionStore + tray + results
│   │   │       ├── account/               # AccountView
│   │   │       └── doctors/               # DoctorsView + LocationProvider
│   │   └── res/                          # strings, colors, themes, icons
│   └── src/test/                         # JVM unit tests (PR-A13 scaffolds)
├── build.gradle.kts                       # top-level plugin aliases
├── settings.gradle.kts                    # root project + module includes
├── gradle.properties                      # JVM + AndroidX + Kotlin defaults
├── gradle/
│   ├── libs.versions.toml                 # all dependency versions in one place
│   └── wrapper/                           # gradle-wrapper.jar (Gradle 8.7)
├── gradlew, gradlew.bat
└── README.md                              # this file
```

## iOS parity

The Android app targets the same Firebase project, the same
callable function names, and the same data shapes as the iOS
app. The shared contracts are:

- **Auth** — Firebase Auth, same user pool, Google sign-in
  (`VITE_GOOGLE_CLIENT_ID` ↔ `GOOGLE_CLIENT_ID`). Sign in
  with Apple is intentionally NOT supported on Android.
- **Strain API** — Cloud Functions callables: `recommendStrainsForConditions`,
  `compareStrains`, `searchStrain`, `popularStrains`, `findDoctors`,
  `describeStrainForUser`, `elaborateSection`.
- **Firestore** — `users/{uid}` + `users/{uid}/savedStrains/{strainId}`
  (see root `firestore.rules`).
- **Age gate** — local-only verification, 30-day TTL; the same
  `src/lib/age-policy.ts` regions/minimum ages are mirrored in
  `com.strainwise.app.compliance.AgeRegion`.
- **Brand** — `Palette` tokens are a 1:1 port of iOS `Palette.swift`
  so the same light + dark themes ship on both surfaces.

## Conventions

- **Stack:** Kotlin 1.9 + AGP 8.5 + Jetpack Compose + Material 3,
  Firebase Android SDK (Auth, Firestore, Functions, Storage,
  Play Services Auth + Location), Coil for image loading,
  DataStore for local preferences, kotlinx-serialization for
  the bundled `strain-directory.json`. No Hilt — manual DI
  keeps the surface small and matches the iOS pattern of
  `@State` + `@Environment`.
- **Bundle id:** `com.strainwise.app` — same identifier iOS uses,
  so Firebase Auth + Firestore user records are shared.
- **minSdk 26, target/compile SDK 34** — same effective coverage as
  the iOS app's iOS 17 floor.
- **Theming:** brand colors live in `ui/theme/Color.kt` as a
  `Palette` object. Always go through `MaterialTheme.colorScheme.*`;
  never reach into the palette directly from a screen.
- **No shadows. Borders only. No nested cards. No skeletons** —
  same rules as the web app. Use Material 3's
  `CircularProgressIndicator` for loading states.
- **Auth:** email + Google only. Sign in with Apple is iOS-only;
  the Android sign-in screen does not render the Apple button.

## The 13 PRs

| # | Branch | Scope |
| - | ------ | ----- |
| 1  | `feat/android/scaffold`   | Gradle, AGP, Kotlin, Compose, Firebase deps; brand `Palette`; `StrainWiseTheme`; `RootPlaceholder` |
| 2  | `feat/android/theme`      | Full `Palette` + `TypeStyle` + `MeshBackground` + reusable `Components` |
| 3  | `feat/android/models`     | All `StrainProfile` / `Recommendation` / `Doctor` Kotlin data classes; `LiveStrainAPI`; `strain-directory.json` resource; `PreviewData` |
| 4  | `feat/android/auth`       | `AuthSession` (email, Google); `AgeVerificationStore`; `AgeGateView`; `SignInView` |
| 5  | `feat/android/shell`      | `RootView` + `MainTabView` + `AppNavigation` |
| 6  | `feat/android/home`       | Home rails + ailment carousel + recents |
| 7  | `feat/android/find`       | Find tab + research prefs + saved ailments/meds/relief stores |
| 8  | `feat/android/browse`     | Directory tab + filter + strain-directory catalog screen |
| 9  | `feat/android/strain`     | Strain detail + terpenes + relief log |
| 10 | `feat/android/compare`    | Compare results + tray + selection store |
| 11 | `feat/android/account`    | Account + Saved + Relief/Research history |
| 12 | `feat/android/doctors`    | Doctors tab + location provider |
| 13 | `feat/android/polish`     | This README + test scaffold + final resource polish |
