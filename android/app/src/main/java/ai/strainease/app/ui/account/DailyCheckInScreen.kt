package ai.strainease.app.ui.account

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
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
import androidx.compose.ui.unit.dp
import ai.strainease.app.data.CheckInStore
import ai.strainease.app.ui.checkin.CheckInPanel
import ai.strainease.app.ui.components.MeshBackground
import ai.strainease.app.ui.components.SWCard
import ai.strainease.app.ui.components.SectionLabel

/**
 * Full-screen Daily check-in. The form on top (so the patient
 * can log today without scrolling) plus the 14-day trend below,
 * matching the iOS `CheckInHistoryView`. Mirrors the iOS
 * NavigationLink destination in `AccountView.swift`.
 *
 * Reached from the Account sheet's "Daily check-in" row card.
 */
@Composable
fun DailyCheckInScreen(
    store: CheckInStore,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    LaunchedEffect(Unit) { store.refresh() }
    val checkIns by store.checkInsFlow.collectAsState(initial = store.checkIns)
    Box(modifier = modifier.fillMaxSize()) {
        MeshBackground()
        Column(modifier = Modifier.fillMaxSize()) {
            subPageHeader(title = "Daily check-in", onBack = onBack)
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 20.dp)
                    .padding(top = 4.dp, bottom = 32.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp),
            ) {
                SWCard {
                    CheckInPanel(store = store, compact = false)
                }
                if (checkIns.isNotEmpty()) {
                    SWCard {
                        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            SectionLabel(title = "Recent check-ins")
                            checkIns.take(14).forEach { entry ->
                                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Text(
                                        text = formatCheckInDate(entry.date),
                                        style = MaterialTheme.typography.titleSmall,
                                        color = MaterialTheme.colorScheme.onSurface,
                                    )
                                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                        CheckInMetric("Mood", entry.metrics.mood)
                                        CheckInMetric("Sleep", entry.metrics.sleep)
                                        CheckInMetric("Pain", entry.metrics.pain)
                                        CheckInMetric("Anxiety", entry.metrics.anxiety)
                                    }
                                    if (entry.note.isNotBlank()) {
                                        Text(
                                            text = entry.note,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CheckInMetric(label: String, value: Int) {
    Column(verticalArrangement = Arrangement.spacedBy(1.dp)) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            text = "$value/5",
            style = MaterialTheme.typography.titleSmall,
            color = MaterialTheme.colorScheme.onSurface,
        )
    }
}

@Composable
internal fun subPageHeader(title: String, onBack: () -> Unit) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 8.dp, vertical = 8.dp),
    ) {
        Surface(
            shape = CircleShape,
            color = MaterialTheme.colorScheme.surface,
            border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
            modifier = Modifier
                .size(40.dp)
                .clickable(onClick = onBack),
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = MaterialTheme.colorScheme.onSurface,
                )
            }
        }
        Text(
            text = title,
            style = MaterialTheme.typography.titleLarge,
            color = MaterialTheme.colorScheme.onBackground,
            modifier = Modifier.padding(start = 12.dp),
        )
    }
}

private fun formatCheckInDate(key: String): String {
    val parts = key.split("-").mapNotNull { it.toIntOrNull() }
    if (parts.size != 3) return key
    val cal = java.util.Calendar.getInstance(java.util.TimeZone.getTimeZone("UTC"))
    cal.set(parts[0], parts[1] - 1, parts[2], 0, 0, 0)
    cal.set(java.util.Calendar.MILLISECOND, 0)
    val format = java.text.SimpleDateFormat("MMM d, yyyy", java.util.Locale.getDefault())
    return format.format(cal.time)
}
