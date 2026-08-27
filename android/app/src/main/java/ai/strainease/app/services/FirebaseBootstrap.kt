package ai.strainease.app.services

import android.content.Context
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions

/**
 * Firebase init that mirrors the iOS `FirebaseBootstrap.swift` so the
 * same project, the same API key, and the same Google client ID are
 * shared between Android, iOS, and the web client. The Android SDK
 * rejects web `GOOGLE_APP_ID` values (those end in `:web:`); we use
 * the Android variant registered for the iOS bundle id
 * `ai.strainease.app` since they share the Firebase project.
 *
 * PR-A4 will replace [configure] with a real `google-services.json`
 * lookup; until then, we fall back to the inline options so the app
 * boots without crashing on launch.
 *
 * Usage is a one-liner in [ai.strainease.app.StrainEaseApplication]:
 *   `FirebaseBootstrap.configure(this)`
 */
object FirebaseBootstrap {
    // Values match `android/app/google-services.json` for the
    // `ai.strainease.app` Android client registered against the
    // shared `strainfinder-84a9b` Firebase project.
    const val API_KEY = "AIzaSyAPKxwr0P4xLYijch3cFa2g0ldhqelc0aA"
    const val PROJECT_ID = "strainfinder-84a9b"
    const val GCM_SENDER_ID = "89734321536"
    const val GOOGLE_APP_ID = "1:89734321536:android:279b629e98727a43e31d65"
    const val GOOGLE_CLIENT_ID = "89734321536-l42t2nlfigvngag1so9stlok42cbp8o2.apps.googleusercontent.com"
    const val STORAGE_BUCKET = "strainfinder-84a9b.firebasestorage.app"

    @Volatile
    var isConfigured: Boolean = false
        private set

    fun configure(context: Context) {
        if (FirebaseApp.getApps(context).isNotEmpty()) {
            isConfigured = true
            return
        }
        val options = FirebaseOptions.Builder()
            .setApiKey(API_KEY)
            .setApplicationId(GOOGLE_APP_ID)
            .setProjectId(PROJECT_ID)
            .setGcmSenderId(GCM_SENDER_ID)
            .setStorageBucket(STORAGE_BUCKET)
            .build()
        FirebaseApp.initializeApp(context, options)
        isConfigured = FirebaseApp.getApps(context).isNotEmpty()
    }
}
