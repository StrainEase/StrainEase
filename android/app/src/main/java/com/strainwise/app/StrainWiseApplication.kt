package com.strainwise.app

import android.app.Application
import coil.Coil
import com.strainwise.app.data.LiveStrainAPI
import com.strainwise.app.data.StrainAPI
import com.strainwise.app.data.StrainCatalog
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
 *
 * The merged [StrainCatalog] is warmed up here too so the Home
 * rails (PR-A6) have data ready before the first render.
 */
class StrainWiseApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        FirebaseBootstrap.configure(this)
        Coil.setImageLoader(ImageCache.get(this))
        StrainCatalog.init(this)
        // Eagerly resolve the live API so the first screen doesn't
        // pay Firebase init cost on the UI thread.
        strainAPI = LiveStrainAPI()
    }

    companion object {
        /** Process-wide [StrainAPI] instance. Previews and tests
         *  swap this out via [setStrainAPI] in their setup hooks. */
        lateinit var strainAPI: StrainAPI
            private set

        fun setStrainAPI(api: StrainAPI) {
            strainAPI = api
        }
    }
}
