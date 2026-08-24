package com.strainwise.app.services

import android.content.Context
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions

/**
 * Firebase init that mirrors the iOS `FirebaseBootstrap.swift` so the
 * same project, the same API key, and the same Google client ID are
 * shared between Android, iOS, and the web client. The Android SDK
 * rejects web `GOOGLE_APP_ID` values (those end in `:web:`); we use
 * the Android variant registered for the iOS bundle id
 * `com.strainwise.app` since they share the Firebase project.
 *
 * PR-A4 will replace [configure] with a real `google-services.json`
 * lookup; until then, we fall back to the inline options so the app
 * boots without crashing on launch.
 *
 * Usage is a one-liner in [com.strainwise.app.StrainWiseApplication]:
 *   `FirebaseBootstrap.configure(this)`
 */
object FirebaseBootstrap {
    const val API_KEY = "AIzaSyAVeoQkXYi3eMRaINsvDBNxbKX2XrTatBM" // matches iOS
    const val PROJECT_ID = "strainfinder-84a9b"
    const val GCM_SENDER_ID = "89734321536"
    // Android client id registered for `com.strainwise.app` in the
    // shared Firebase project. Distinct from the iOS bundle's app id
    // (`1:89734321536:ios:…`) and the web app id.
    const val GOOGLE_APP_ID = "1:89734321536:android:0000000000000000000000"
    const val GOOGLE_CLIENT_ID = "89734321536-s3njeabohn98bd8s0rqh05diur2mk9h2.apps.googleusercontent.com"
    const val STORAGE_BUCKET = "strainfinder-84a9b.appspot.com"

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
