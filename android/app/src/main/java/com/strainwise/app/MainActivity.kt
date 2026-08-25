package com.strainwise.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import com.strainwise.app.app.RootView
import com.strainwise.app.auth.ProvideAuthSession
import com.strainwise.app.ui.theme.StrainWiseTheme

/**
 * Single-activity entry point. Owns the
 * [com.strainwise.app.StrainWiseApplication.authSession] +
 * [com.strainwise.app.StrainWiseApplication.ageStore] instances
 * and exposes them through the
 * [com.strainwise.app.auth.ProvideAuthSession] / `RootView`
 * boundary, mirroring the iOS `StrainWiseApp` → `RootView`
 * wiring.
 *
 * The whole tree is wrapped in [StrainWiseTheme] so every
 * screen reads colors + typography from the same place.
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val app = application as StrainWiseApplication
        val session = app.authSession
        val ageStore = app.ageStore

        setContent {
            StrainWiseTheme {
                ProvideAuthSession(session = session) {
                    Surface(
                        modifier = Modifier.fillMaxSize(),
                        color = MaterialTheme.colorScheme.background,
                    ) {
                        RootView(ageStore = ageStore)
                    }
                }
            }
        }
    }
}
