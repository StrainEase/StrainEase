package com.strainwise.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.strainwise.app.ui.theme.StrainWiseTheme

/**
 * Single-activity entry point. Mirrors the iOS `RootView` gate which
 * decides between the age gate, sign-in, and main tab content.
 *
 * Subsequent PRs will replace [RootPlaceholder] with the real
 * age-gate + sign-in + tab shell — see the PR-A5 ("App shell + Tabs")
 * task in AGENTS.md.
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            StrainWiseTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background,
                ) {
                    RootPlaceholder()
                }
            }
        }
    }
}

@Composable
private fun RootPlaceholder() {
    androidx.compose.foundation.layout.Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
    ) {
        androidx.compose.material3.Text(
            text = "StrainEase",
            style = MaterialTheme.typography.displaySmall,
            color = MaterialTheme.colorScheme.onBackground,
        )
    }
}
