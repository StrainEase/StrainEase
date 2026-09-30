package ai.strainease.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import ai.strainease.app.app.RootView
import ai.strainease.app.auth.ProvideAuthSession
import ai.strainease.app.ui.theme.StrainEaseTheme

/**
 * Single-activity entry point. Owns the
 * [ai.strainease.app.StrainEaseApplication.authSession] +
 * [ai.strainease.app.StrainEaseApplication.ageStore] instances
 * and exposes them through the
 * [ai.strainease.app.auth.ProvideAuthSession] / `RootView`
 * boundary, mirroring the iOS `StrainEaseApp` → `RootView`
 * wiring.
 *
 * The whole tree is wrapped in [StrainEaseTheme] so every
 * screen reads colors + typography from the same place.
 *
 * The activity uses `Theme.StrainEase` directly (no splash) so
 * the system splash with the app label is never shown — the
 * activity window paints the app's own background immediately
 * while Compose boots.
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val app = application as StrainEaseApplication
        setContent {
            StrainEaseTheme {
                ProvideAuthSession(session = app.authSession) {
                    Surface(
                        modifier = Modifier.fillMaxSize(),
                        color = MaterialTheme.colorScheme.background,
                    ) {
                        RootView(ageStore = app.ageStore)
                    }
                }
            }
        }
    }
}
