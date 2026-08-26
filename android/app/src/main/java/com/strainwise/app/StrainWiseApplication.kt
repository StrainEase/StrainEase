package com.strainwise.app

import android.app.Application
import coil.Coil
import com.strainwise.app.auth.AuthSession
import com.strainwise.app.compliance.AgeVerificationStore
import com.strainwise.app.data.LiveStrainAPI
import com.strainwise.app.data.StrainAPI
import com.strainwise.app.services.FirebaseBootstrap
import com.strainwise.app.services.ImageCache

/**
 * App entry point. Mirrors the iOS `StrainWiseApp.init()` which
 * calls `FirebaseBootstrap.configure()` and
 * `StrainImageCache.configure()` before any UI is shown, and
 * also wires the `AuthSession` + `AgeVerificationStore` so the
 * SwiftUI equivalents are available as `@Environment` values.
 *
 * The Kotlin / Compose equivalents:
 *   - FirebaseAuth:    [AuthSession] (StateFlow<SessionStatus>)
 *   - UserDefaults:    DataStore<Preferences> via [AgeVerificationStore]
 *   - URLCache:        Coil's [ImageCache] (32 MB / 256 MB)
 *   - popularStrains:  [StrainCatalog] (curated + bundled JSON)
 */
class StrainWiseApplication : Application() {

    /** Process-wide AuthSession. The MainActivity attaches it via
     *  the [com.strainwise.app.auth.ProvideAuthSession] wrapper. */
    val authSession: AuthSession by lazy { AuthSession() }

    /** Process-wide AgeVerificationStore. Reads + writes the
     *  DataStore<Preferences> behind `strainease_age_verification`. */
    val ageStore: AgeVerificationStore by lazy { AgeVerificationStore(this) }

    override fun onCreate() {
        super.onCreate()
        FirebaseBootstrap.configure(this)
        Coil.setImageLoader(ImageCache.get(this))
        strainAPI = LiveStrainAPI()
        authSession.start()
    }

    companion object {
        lateinit var strainAPI: StrainAPI
            private set
    }
}
