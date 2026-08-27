package ai.strainease.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ai.strainease.app.ui.theme.StrainEaseTypography

/**
 * Pill-shaped chip used for filters, ailments, time-of-day toggles,
 * and the "Quick add" buttons. Mirrors the iOS `SWChip` view.
 *
 *  - Selected: primary background + primaryForeground text + primary border
 *  - Unselected: card @ 0.55 alpha + mutedForeground text + border
 */
@Composable
fun SWChip(
    title: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val primary = MaterialTheme.colorScheme.primary
    val onPrimary = MaterialTheme.colorScheme.onPrimary
    val card = MaterialTheme.colorScheme.surface
    val mutedFg = MaterialTheme.colorScheme.onSurfaceVariant
    val border = MaterialTheme.colorScheme.outline
    val (bg, fg, stroke) = if (selected) {
        Triple(primary, onPrimary, primary)
    } else {
        Triple(card.copy(alpha = 0.55f), mutedFg, border)
    }
    Text(
        text = title,
        style = StrainEaseTypography.labelMedium.copy(fontSize = 13.sp),
        color = fg,
        modifier = modifier
            .clip(RoundedCornerShape(50))
            .background(bg)
            .border(1.dp, stroke, RoundedCornerShape(50))
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 8.dp),
    )
}
