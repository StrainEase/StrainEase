package ai.strainease.app.ui.checkin

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import ai.strainease.app.data.CheckIn
import ai.strainease.app.data.CheckInStore
import ai.strainease.app.ui.components.MeshBackground
import ai.strainease.app.ui.components.SWCard
import ai.strainease.app.ui.components.SectionLabel
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

/**
 * Full check-in history screen. The form on top (so the
 * patient can log today without scrolling) plus the 14-day
 * trend below, matching the Account web experience. Mirrors
 * the web `CheckInPanel.tsx` shell and the iOS
 * `CheckInHistoryView`.
 */
@Composable
fun CheckInHistoryView(
    store: CheckInStore,
    modifier: Modifier = Modifier,
) {
    LaunchedEffect(Unit) { store.refresh() }
    val checkIns by store.checkInsFlow.collectAsState(initial = store.checkIns)

    Box(modifier = modifier.fillMaxSize()) {
        MeshBackground()
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            SWCard {
                CheckInPanel(store = store)
            }

            if (checkIns.isNotEmpty()) {
                SWCard {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        SectionLabel(title = "Recent check-ins")
                        checkIns.take(14).forEachIndexed { index, entry ->
                            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text(
                                    formatDate(entry.date),
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.SemiBold,
                                )
                                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    MetricChip("Mood", entry.metrics.mood)
                                    MetricChip("Sleep", entry.metrics.sleep)
                                    MetricChip("Pain", entry.metrics.pain)
                                    MetricChip("Anxiety", entry.metrics.anxiety)
                                }
                                if (entry.note.isNotEmpty()) {
                                    Text(
                                        entry.note,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                            if (index < checkIns.take(14).lastIndex) {
                                HorizontalDivider(color = MaterialTheme.colorScheme.outline)
                            }
                        }
                    }
                }
            }

            Box(modifier = Modifier.fillMaxWidth().padding(bottom = 24.dp))
        }
    }
}

@Composable
private fun MetricChip(label: String, value: Int) {
    Column(verticalArrangement = Arrangement.spacedBy(1.dp)) {
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            "$value/5",
            style = MaterialTheme.typography.bodySmall,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

private fun formatDate(key: String): String {
    val parts = key.split("-").mapNotNull { it.toIntOrNull() }
    if (parts.size != 3) return key
    val cal = java.util.Calendar.getInstance(TimeZone.getTimeZone("UTC"))
    cal.set(parts[0], parts[1] - 1, parts[2], 0, 0, 0)
    cal.set(java.util.Calendar.MILLISECOND, 0)
    val fmt = SimpleDateFormat("MMM d, yyyy", Locale.getDefault())
    fmt.timeZone = TimeZone.getTimeZone("UTC")
    return fmt.format(cal.time)
}
