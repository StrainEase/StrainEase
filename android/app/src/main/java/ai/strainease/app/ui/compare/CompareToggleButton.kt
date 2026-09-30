package ai.strainease.app.ui.compare

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Compare
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp

/**
 * Top-bar "Compare" toggle button on the strain detail page.
 * Direct port of the iOS `CompareToggleButton`. Filled when
 * the strain is in the selection, outlined otherwise.
 */
@Composable
fun CompareToggleButton(
    isInSelection: Boolean,
    atCap: Boolean,
    onToggle: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val primary = MaterialTheme.colorScheme.primary
    val onPrimary = MaterialTheme.colorScheme.onPrimary
    val card = MaterialTheme.colorScheme.surface
    val border = MaterialTheme.colorScheme.outline
    val containerColor = if (isInSelection) primary else card
    val contentColor = if (isInSelection) onPrimary else MaterialTheme.colorScheme.onSurface
    val strokeColor = if (isInSelection) primary else border

    Icon(
        imageVector = if (isInSelection) Icons.Filled.Check else Icons.Filled.Compare,
        contentDescription = if (isInSelection) "Remove from compare" else "Add to compare",
        tint = contentColor,
        modifier = modifier
            .clip(CircleShape)
            .background(containerColor)
            .border(1.dp, strokeColor, CircleShape)
            .clickable(enabled = !atCap || isInSelection, onClick = onToggle)
            .padding(8.dp),
    )
}
