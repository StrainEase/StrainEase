package com.strainwise.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.strainwise.app.ui.theme.StrainWiseTypography

/**
 * Section label with an optional numeric index, e.g.
 *   "01 / POPULAR"
 *   "AILMENTS"
 *
 * Mirrors the iOS `SectionLabel` view. 11pt semibold, +1.4 letter
 * spacing, uppercase, mutedForeground color; the index (when
 * present) is primary at 0.7 alpha.
 */
@Composable
fun SectionLabel(
    title: String,
    modifier: Modifier = Modifier,
    index: Int? = null,
) {
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        if (index != null) {
            Text(
                text = "%02d".format(index),
                style = StrainWiseTypography.labelSmall.copy(fontSize = 11.sp, letterSpacing = 1.4.sp),
                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.7f),
            )
        }
        Text(
            text = title.uppercase(),
            style = StrainWiseTypography.labelSmall.copy(fontSize = 11.sp, letterSpacing = 1.4.sp),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
