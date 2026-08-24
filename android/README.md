# StrainEase Android

Native Jetpack Compose companion for the StrainEase web app
([strainease.ai](https://strainease.ai)) and the iOS app
(`ios/StrainWise`). Same Firebase project (`strainfinder-84a9b`),
same accounts, same AI callables — three surfaces, one backend.

This module is the **Android port** of the iOS app, broken into a
series of stacked PRs (`feat/android/<feature>`) so each slice is
reviewable in isolation. See the root `AGENTS.md` for the PR plan
and current status.

## Build

```bash
cd android
./gradlew assembleDebug          # debug APK at app/build/outputs/apk/debug/
./gradlew installDebug           # install on a connected device / emulator
./gradlew test                   # unit tests
```

Prerequisites:

- JDK 17 (matches the `org.gradle.java.installations.paths` hint in
  `gradle.properties`)
- Android SDK with platform 34 + build-tools 34.0.0
- The first build will download Gradle 8.7 + AGP 8.5.2

## Run

1. Open the project in Android Studio Koala (2024.1.1) or later
2. Pick the `app` run configuration
3. Hit ▶ — the app boots straight into the `RootPlaceholder`
   (real screens land in PR-A5+)

## Layout

```
android/
├── app/                          # only module today
│   ├── build.gradle.kts          # AGP + Compose + Firebase wiring
│   └── src/main/
│       ├── AndroidManifest.xml   # permissions + activity entry
│       ├── java/com/strainwise/app/
│       │   ├── StrainWiseApplication.kt   # FirebaseBootstrap.configure()
│       │   ├── MainActivity.kt            # setContent { StrainWiseTheme { ... } }
│       │   ├── services/
│       │   │   └── FirebaseBootstrap.kt   # shared Firebase init (iOS parity)
│       │   └── ui/theme/
│       │       ├── Color.kt       # Palette token-by-token port of iOS Palette.swift
│       │       ├── Type.kt        # Material 3 typography (serif headline)
│       │       └── Theme.kt       # MaterialTheme + ColorScheme wiring
│       └── res/                  # strings, colors, themes, icons
├── build.gradle.kts               # top-level plugin aliases
├── settings.gradle.kts            # root project + module includes
├── gradle.properties              # JVM + AndroidX + Kotlin defaults
├── gradle/
│   ├── libs.versions.toml         # all dependency versions in one place
│   └── wrapper/                   # gradle-wrapper.jar (Gradle 8.7)
├── gradlew, gradlew.bat
└── README.md                      # this file
```

## iOS parity

The Android app targets the same Firebase project, the same callable
function names, and the same data shapes as the iOS app. The shared
contracts are:

- **Auth** — Firebase Auth, same user pool, Google sign-in
  (`VITE_GOOGLE_CLIENT_ID` ↔ `GOOGLE_CLIENT_ID`)
- **Strain API** — Cloud Functions callables: `recommendStrainsForConditions`,
  `compareStrains`, `searchStrain`, `popularStrains`, `findDoctors`,
  `describeStrainForUser`, `elaborateSection`
- **Firestore** — `users/{uid}` + `users/{uid}/savedStrains/{strainId}`
  (see root `firestore.rules`)
- **Age gate** — local-only verification, 30-day TTL; the same
  `src/lib/age-policy.ts` regions/minimum ages are mirrored in
  `com.strainwise.app.compliance.AgePolicy` (PR-A4)
- **Brand** — `Palette` tokens are a 1:1 port of iOS `Palette.swift`
  so the same light + dark themes ship on both surfaces

## What is and isn't here

This is **PR 1 of 13** (`feat/android/scaffold`). All it ships is:

- A buildable Android project with the right AGP / Kotlin / Compose
  / Firebase / Coil / DataStore dependencies
- The brand `Palette` + `StrainWiseTheme` so subsequent PRs can pull
  colors / typography from `MaterialTheme.colorScheme.*`
- A `RootPlaceholder` `Text("StrainEase")` inside
  `MainActivity.setContent` so the app boots end-to-end

Everything else — the age gate, the sign-in screen, the four tabs,
the strain detail, the compare tray, account, doctors, AI callables
— lands in PR-A2 through PR-A13. See root `AGENTS.md` for the full
plan and the active worktrees.
