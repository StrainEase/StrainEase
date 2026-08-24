package com.strainwise.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp

/**
 * The StrainWise card. Two nested rounded rectangles (an outer
 * "tray" at 26dp + an inner "surface" at 22dp), borders only, no
 * drop shadows. Mirrors the iOS `SWCard` view exactly.
 *
 *  - Outer hairline tray: muted at 0.45 alpha + border at 0.7 alpha
 *  - Inner surface: card color, border at 0.45 alpha (emphasized) or
 *    full border (default)
 *  - Content padding: 18dp inside, 5dp between inner + outer
 *
 * The `emphasized` flag bumps the inner border opacity to 0.45 and
 * uses the primary color, used for "active" cards (e.g. the selected
 * compare entry).
 */
@Composable
fun SWCard(
    modifier: Modifier = Modifier,
    emphasized: Boolean = false,
    contentPaddingDp: Int = 18,
    content: @Composable () -> Unit,
) {
    val card = MaterialTheme.colorScheme.surface
    val muted = MaterialTheme.colorScheme.surfaceVariant
    val borderColor = MaterialTheme.colorScheme.outline
    val primary = MaterialTheme.colorScheme.primary
    val innerBorder = if (emphasized) primary.copy(alpha = 0.45f) else borderColor
    val innerBorderWidth = if (emphasized) 1.2.dp else 1.dp
    val outerCorner = RoundedCornerShape(26.dp)
    val innerCorner = RoundedCornerShape(22.dp)

    androidx.compose.foundation.layout.Box(
        modifier = modifier
            .clip(outerCorner)
            .background(muted.copy(alpha = 0.45f))
            .border(1.dp, borderColor.copy(alpha = 0.7f), outerCorner)
            .padding(5.dp)
            .clip(innerCorner)
            .background(card)
            .border(innerBorderWidth, innerBorder, innerCorner)
            .padding(contentPaddingDp.dp),
    ) {
        content()
    }
}
