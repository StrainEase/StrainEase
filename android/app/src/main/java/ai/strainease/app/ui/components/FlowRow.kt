package ai.strainease.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Multi-line wrapping row. Direct port of the iOS `FlowLayout`
 * custom layout used by the strain-detail chip sections ("Commonly
 * used for", "Watch for"), the medical-uses chip rail on the
 * detail hero, and the Find prefs chips.
 *
 * Compose ships an experimental `FlowRow` in `androidx.compose.foundation`
 * that does the same thing; this is a thin wrapper that:
 *   1. opts into the experimental API
 *   2. fixes the default spacing to match the iOS
 *      `FlowLayout(spacing: 8)` so screens don't have to specify it
 *   3. exposes the wrapper as a stable named API (`FlowRow`) so a
 *      later swap to a fully custom layout is a one-file change
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun SWFlowRow(
    modifier: Modifier = Modifier,
    horizontalSpacing: Dp = 8.dp,
    verticalSpacing: Dp = 8.dp,
    content: @Composable () -> Unit,
) {
    FlowRow(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(horizontalSpacing),
        verticalArrangement = Arrangement.spacedBy(verticalSpacing),
    ) {
        content()
    }
}
