package ai.strainease.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ai.strainease.app.ui.theme.StrainEaseTypography

/**
 * Primary call-to-action button. Mirrors the iOS `SWPrimaryButton`
 * view used on the sign-in screen, the age-gate confirm button, the
 * Find submit, the Save buttons in account, and the Compare tray
 * "Compare" action.
 *
 *  - Background: linear gradient primary → primary @ 0.82 (top-left
 *    to bottom-right)
 *  - Shape: pill
 *  - Layout: spinner (when busy) + title on the left, circular icon
 *    disc on the right. Title is shown in both idle and busy states
 *    so callers can swap the visible label (e.g. the current research
 *    step) while research is in flight.
 */
@Composable
fun SWPrimaryButton(
    title: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: ImageVector = Icons.Filled.AutoAwesome,
    isBusy: Boolean = false,
    enabled: Boolean = true,
) {
    val primary = MaterialTheme.colorScheme.primary
    val onPrimary = MaterialTheme.colorScheme.onPrimary

    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(52.dp)
            .clip(RoundedCornerShape(50))
            .background(
                Brush.linearGradient(
                    colors = listOf(primary, primary.copy(alpha = 0.82f)),
                ),
            )
            .clickable(enabled = enabled && !isBusy, onClick = onClick)
            .padding(start = 22.dp, end = 8.dp, top = 8.dp, bottom = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        if (isBusy) {
            CircularProgressIndicator(
                modifier = Modifier.size(20.dp),
                color = onPrimary,
                strokeWidth = 2.dp,
            )
        }
        Text(
            text = title,
            style = StrainEaseTypography.titleSmall.copy(
                fontSize = if (isBusy) 14.sp else 16.sp,
            ),
            color = onPrimary,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f, fill = false),
        )
        Spacer(Modifier.weight(1f))
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = onPrimary,
            modifier = Modifier
                .size(32.dp)
                .clip(CircleShape)
                .background(onPrimary.copy(alpha = 0.16f))
                .padding(7.dp),
        )
    }
}
