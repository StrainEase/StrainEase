package com.strainwise.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.strainwise.app.ui.components.Eyebrow
import com.strainwise.app.ui.components.IntensityBar
import com.strainwise.app.ui.components.MeshBackground
import com.strainwise.app.ui.components.SWChip
import com.strainwise.app.ui.components.SWCard
import com.strainwise.app.ui.components.SWErrorBanner
import com.strainwise.app.ui.components.SWFlowRow
import com.strainwise.app.ui.components.SWPrimaryButton
import com.strainwise.app.ui.components.SectionLabel
import com.strainwise.app.ui.components.TypeBadge
import com.strainwise.app.ui.theme.StrainWiseTheme
import com.strainwise.app.models.StrainType

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

/**
 * Visual smoke test for the brand theme + components. Each PR can
 * iterate on this screen to confirm a new component or token renders
 * correctly before wiring it into a real screen. PR-A5 (App shell)
 * replaces this with the age-gate → sign-in → tab root flow.
 */
@Composable
private fun RootPlaceholder() {
    Box(modifier = Modifier.fillMaxSize()) {
        MeshBackground()
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(PaddingValues(horizontal = 20.dp, vertical = 32.dp)),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            Eyebrow(text = "Brand")
            Text(
                text = "StrainEase",
                style = MaterialTheme.typography.displaySmall,
                color = MaterialTheme.colorScheme.onBackground,
            )
            Text(
                text = "Strain discovery, grounded in your symptoms.",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            SectionLabel(title = "Components smoke test", index = 1)
            SWCard {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        text = "Strain type badges",
                        style = MaterialTheme.typography.titleSmall,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    SWFlowRow {
                        TypeBadge(type = StrainType.Indica)
                        TypeBadge(type = StrainType.Sativa)
                        TypeBadge(type = StrainType.Hybrid)
                        TypeBadge(type = null)
                    }
                    Text(
                        text = "Filters",
                        style = MaterialTheme.typography.titleSmall,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    SWFlowRow {
                        SWChip("Insomnia", selected = true, onClick = {})
                        SWChip("Chronic pain", selected = false, onClick = {})
                        SWChip("Anxiety", selected = true, onClick = {})
                    }
                    Text(
                        text = "Effect intensity",
                        style = MaterialTheme.typography.titleSmall,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    IntensityBar(value = 4)
                    Spacer(Modifier.height(4.dp))
                    SWPrimaryButton(title = "Get recommendations", onClick = {})
                    SWErrorBanner(
                        message = "Couldn't reach the server. Check your connection and try again.",
                    )
                }
            }
            Spacer(Modifier.height(16.dp))
            Text(
                text = "PR-A2 · Theme + Components",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.align(Alignment.CenterHorizontally),
            )
        }
    }
}
