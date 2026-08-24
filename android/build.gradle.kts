// Top-level build file. All shared plugin versions live in
// `gradle/libs.versions.toml`; the modules apply them with
// `alias(libs.plugins.xxx)` so a single version bump updates them all.

plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.android.library) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.serialization) apply false
    alias(libs.plugins.ksp) apply false
}
