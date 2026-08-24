package com.strainwise.app

import android.app.Application
import coil.Coil
import coil.ImageLoader
import com.strainwise.app.services.FirebaseBootstrap
import com.strainwise.app.services.ImageCache

/**
 * App entry point. Mirrors the iOS `StrainWiseApp.init()` which calls
 * `FirebaseBootstrap.configure()` and `StrainImageCache.configure()`
 * before any UI is shown.
 *
 * Firebase is configured with the same project (`strainfinder-84a9b`)
 * and the same Android client values the iOS app uses, so the same
 * Auth users / Firestore docs / Functions callables are shared.
 *
 * Coil's `ImageLoader` is built up-front so the first image load
 * doesn't pay the cache-init cost.
 */
class StrainWiseApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        FirebaseBootstrap.configure(this)
        // Register the StrainEase-tuned ImageLoader as the process-wide
        // default. Components use `coil.compose.AsyncImage` without
        // any custom factory; Coil picks this loader up automatically.
        Coil.setImageLoader(ImageCache.get(this))
    }
}
