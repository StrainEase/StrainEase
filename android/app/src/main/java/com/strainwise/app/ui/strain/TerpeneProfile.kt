package com.strainwise.app.ui.strain

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.strainwise.app.models.Terpene
import com.strainwise.app.ui.components.SWCard
import com.strainwise.app.ui.theme.StrainWiseTypography

/**
 * One-tap row in the strain-detail "Terpenes" section. Tapping
 * flips the row into the full TerpeneDetailView. Direct port
 * of the iOS TerpeneProfile / TerpeneDetailView pair, scoped
 * down to a single inline expansion to keep PR-A9 manageable.
 */
@Composable
fun TerpeneProfile(
    terpene: Terpene,
    expanded: Boolean,
    onToggle: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val card = MaterialTheme.colorScheme.surface
    val border = MaterialTheme.colorScheme.outline
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(card)
            .border(1.dp, border, RoundedCornerShape(14.dp))
            .clickable(onClick = onToggle)
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Row {
            Text(
                text = terpene.name,
                style = StrainWiseTypography.titleSmall,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.weight(1f),
            )
            Text(
                text = if (expanded) "−" else "+",
                style = StrainWiseTypography.titleMedium,
                color = MaterialTheme.colorScheme.primary,
            )
        }
        Text(
            text = terpene.profile,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        if (expanded) {
            TerpeneDetailView(terpene = terpene)
        }
    }
}

@Composable
private fun TerpeneDetailView(terpene: Terpene) {
    // The iOS source renders a full Sheet with a long-form
    // description + "Found in" list. PR-A9 ships the same
    // shape inline (toggled by the +/− affordance above);
    // PR-A10 will swap to a Material BottomSheet when the
    // Compare tray lands.
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            text = "Common effects",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            text = effectsFor(terpene.name),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface,
        )
    }
}

private fun effectsFor(name: String): String = when (name.lowercase()) {
    "myrcene" -> "Earthy, musky, herbal. Often associated with relaxing and sedating effects."
    "caryophyllene" -> "Pepper, spice, wood. The only terpene known to also act on CB2 receptors; often associated with anti-inflammatory effects."
    "pinene" -> "Pine, fresh, sharp. Associated with alertness and memory retention."
    "limonene" -> "Citrus. Associated with mood elevation and stress relief."
    "linalool" -> "Floral, lavender. Associated with calming and anxiolytic effects."
    "humulene" -> "Hops, earthy. Associated with appetite suppression and anti-inflammatory effects."
    "terpinolene" -> "Piney, floral, herbal. Associated with uplifting effects in some cultivars."
    "ocimene" -> "Sweet, herbal, woody. Associated with decongestant and anti-inflammatory effects."
    else -> "Effects vary by strain and individual response. Tap a strain's medical uses for what patients report."
}
