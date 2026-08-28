package ai.strainease.app

import android.app.Application
import coil.Coil
import ai.strainease.app.auth.AuthSession
import ai.strainease.app.compliance.AgeVerificationStore
import ai.strainease.app.data.LiveStrainAPI
import ai.strainease.app.data.StrainAPI
import ai.strainease.app.services.FirebaseBootstrap
import ai.strainease.app.services.ImageCache

/**
 * App entry point. Mirrors the iOS `StrainEaseApp.init()` which
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
class StrainEaseApplication : Application() {

    /** Process-wide AuthSession. The MainActivity attaches it via
     *  the [ai.strainease.app.auth.ProvideAuthSession] wrapper. */
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
