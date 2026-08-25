package com.strainwise.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.strainwise.app.ui.theme.StrainWiseTypography

/**
 * Inline error banner. Mirrors the iOS `SWErrorBanner` view used by
 * the floating `CompareTrayBar` and the Find compare tray to surface
 * a `compareError` instead of just an invisible error haptic.
 *
 *  - Icon: filled warning triangle in destructive color
 *  - Body text: 14pt, foreground color
 *  - Surface: destructive at 0.08 alpha
 *  - Border: destructive at 0.25 alpha, 16dp rounded corners
 */
@Composable
fun SWErrorBanner(
    message: String,
    modifier: Modifier = Modifier,
) {
    val destructive = MaterialTheme.colorScheme.error
    val foreground = MaterialTheme.colorScheme.onSurface
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(destructive.copy(alpha = 0.08f))
            .border(1.dp, destructive.copy(alpha = 0.25f), RoundedCornerShape(16.dp))
            .padding(14.dp),
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Icon(
            imageVector = Icons.Filled.Warning,
            contentDescription = null,
            tint = destructive,
            modifier = Modifier.size(20.dp),
        )
        Text(
            text = message,
            style = StrainWiseTypography.bodyMedium.copy(fontSize = 14.sp),
            color = foreground,
        )
    }
}
