package ai.strainease.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp

/**
 * 5-segment intensity bar used in the strain-detail effects list.
 * Mirrors the iOS `IntensityBar` view exactly.
 *
 *  - Filled segments: primary at 0.85 alpha
 *  - Empty segments: outline (border) color
 *  - Spacing: 3dp between segments
 *
 * `value` should be 0..5 (the iOS source uses
 * `StrainEffect.intensity: Int` which is always 0..5 in the catalog).
 */
@Composable
fun IntensityBar(
    value: Int,
    modifier: Modifier = Modifier,
    segments: Int = 5,
) {
    val primary = MaterialTheme.colorScheme.primary
    val border = MaterialTheme.colorScheme.outline
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(3.dp),
    ) {
        repeat(segments) { i ->
            androidx.compose.foundation.layout.Box(
                modifier = Modifier
                    .size(width = 10.dp, height = 6.dp)
                    .clip(RoundedCornerShape(50))
                    .background(
                        if (i < value) primary.copy(alpha = 0.85f) else border,
                    ),
            )
        }
    }
}
