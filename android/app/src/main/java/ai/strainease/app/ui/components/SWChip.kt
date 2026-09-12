package ai.strainease.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ai.strainease.app.ui.theme.StrainEaseTypography

/**
 * Pill-shaped chip used for filters, ailments, time-of-day toggles,
 * and the "Quick add" buttons. Mirrors the iOS `SWChip` view.
 *
 *  - Selected: primary background @ 0.18 alpha + primaryForeground text +
 *    primary border. Light tint with a colored outline so the chip reads
 *    as "on" against a near-white card.
 *  - Unselected: surface background + mutedForeground text + outline border.
 *    Lighter than the card surface so the chip reads as a button.
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
    val surface = MaterialTheme.colorScheme.surface
    val mutedFg = MaterialTheme.colorScheme.onSurfaceVariant
    val outline = MaterialTheme.colorScheme.outline
    val (bg, fg, stroke) = if (selected) {
        Triple(primary.copy(alpha = 0.18f), primary, primary)
    } else {
        Triple(surface, mutedFg, outline)
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

/**
 * Pill-shaped chip with a trailing X icon that removes the chip.
 * Used for the Saved Medications list on the Account sheet, where the
 * iOS Medication chip shows "Name ×" so the patient can remove a
 * single medication without retyping everything.
 *
 * Tapping the chip body calls [onClick] (e.g. for editing the
 * medication); tapping the X calls [onRemove] and removes the chip
 * without firing the body tap.
 */
@Composable
fun SWChipWithRemove(
    title: String,
    onRemove: () -> Unit,
    onClick: () -> Unit = {},
    modifier: Modifier = Modifier,
) {
    val primary = MaterialTheme.colorScheme.primary
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(50))
            .background(primary.copy(alpha = 0.12f))
            .border(1.dp, primary, RoundedCornerShape(50))
            .clickable(onClick = onClick)
            .padding(start = 14.dp, end = 4.dp, top = 4.dp, bottom = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = title,
            style = StrainEaseTypography.labelMedium.copy(fontSize = 13.sp),
            color = primary,
            modifier = Modifier.padding(vertical = 4.dp),
        )
        Icon(
            imageVector = Icons.Filled.Close,
            contentDescription = "Remove $title",
            tint = primary,
            modifier = Modifier
                .size(24.dp)
                .clip(RoundedCornerShape(50))
                .clickable(onClick = onRemove)
                .padding(4.dp),
        )
    }
}
