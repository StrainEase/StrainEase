package ai.strainease.app.ui.account

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import ai.strainease.app.data.ReliefLog
import ai.strainease.app.data.ReliefLogStore
import ai.strainease.app.ui.components.MeshBackground
import ai.strainease.app.ui.components.SWCard
import ai.strainease.app.ui.components.SectionLabel
import ai.strainease.app.ui.theme.StrainEaseTypography

/**
 * Full-screen Relief history. Lists the user's full relief log
 * (newest first), one row per logged strain. Mirrors the iOS
 * `ReliefHistoryView` and the NavigationLink destination in the
 * iOS `AccountView.swift`. Reached from the Account sheet's
 * "Relief history" row card.
 */
@Composable
fun ReliefHistoryScreen(
    store: ReliefLogStore,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    LaunchedEffect(Unit) { store.refresh() }
    val log by store.logFlow.collectAsState(initial = store.log)
    Box(modifier = modifier.fillMaxSize()) {
        MeshBackground()
        Column(modifier = Modifier.fillMaxSize()) {
            subPageHeader(title = "Relief history", onBack = onBack)
            if (log.isEmpty()) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 20.dp, vertical = 32.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    SWCard {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(
                                text = "No relief logs yet",
                                style = StrainEaseTypography.titleMedium,
                                color = MaterialTheme.colorScheme.onSurface,
                            )
                            Text(
                                text = "After you log a strain's effect, it lands here so you can revisit what actually worked.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxSize(),
                ) {
                    items(items = log.sortedByDescending { it.loggedAt }, key = { it.strainName + it.loggedAt }) { entry ->
                        ReliefLogRow(entry)
                    }
                }
            }
        }
    }
}

@Composable
private fun ReliefLogRow(entry: ReliefLog) {
    SWCard(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = entry.strainName,
                    style = StrainEaseTypography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    text = "★".repeat(entry.rating.coerceIn(0, 5)),
                    style = StrainEaseTypography.titleSmall,
                    color = MaterialTheme.colorScheme.primary,
                )
            }
            Text(
                text = "${entry.rating}/5 help · ${formatReliefTimestamp(entry.loggedAt)}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (entry.intensity > 0) {
                Text(
                    text = "Intensity ${entry.intensity}/5",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.primary,
                )
            }
            if (entry.notes.isNotBlank()) {
                Text(
                    text = entry.notes,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                )
            }
        }
    }
}

private fun formatReliefTimestamp(millis: Long): String {
    if (millis <= 0) return ""
    val date = java.util.Date(millis)
    val format = java.text.SimpleDateFormat("MMM d, yyyy", java.util.Locale.getDefault())
    return format.format(date)
}
