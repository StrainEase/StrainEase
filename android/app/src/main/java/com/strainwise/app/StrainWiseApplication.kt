package com.strainwise.app

import android.app.Application
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.strainwise.app.services.FirebaseBootstrap

/**
 * App entry point. Mirrors the iOS `StrainWiseApp.init()` which calls
 * `FirebaseBootstrap.configure()` before any UI is shown.
 *
 * Firebase is configured with the same project (`strainfinder-84a9b`)
 * and the same Android client values the iOS app uses, so the same
 * Auth users / Firestore docs / Functions callables are shared.
 */
class StrainWiseApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        FirebaseBootstrap.configure(this)
    }
}
