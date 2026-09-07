package ai.strainease.app.ui.checkin

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import ai.strainease.app.data.CheckInStore
import ai.strainease.app.data.buildCheckInTrend
import ai.strainease.app.ui.components.SectionLabel

/**
 * Daily check-in panel — form on top, 14-day sparkline +
 * averages below. Direct port of the web `CheckInPanel.tsx`
 * and the iOS `CheckInPanel.swift`. Used on the Account
 * screen and on a sheet from the strain detail "How are you
 * today?" CTA so the same UI works in both entry points.
 */
@Composable
fun CheckInPanel(
    store: CheckInStore,
    modifier: Modifier = Modifier,
    compact: Boolean = false,
) {
    val checkIns by store.checkInsFlow.collectAsState(initial = store.checkIns)
    val today = checkIns.firstOrNull { it.date == CheckInStore.todayKey() }
    val trend = buildCheckInTrend(checkIns)

    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(18.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            SectionLabel(title = "Daily check-in")
            Text(
                "How are you today?",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                "Four 1–5 scores plus an optional note. The 14-day trend below helps Dr. Kaya tailor future recommendations.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        CheckInForm(today = today, store = store)

        if (!compact || trend.loggedDays > 0) {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    SectionLabel(title = "14-day trend")
                    Box(Modifier.weight(1f))
                    trend.averages?.let { avg ->
                        Text(
                            "Mood %.1f · Sleep %.1f · Pain %.1f · Anxiety %.1f".format(
                                avg.mood.toFloat(),
                                avg.sleep.toFloat(),
                                avg.pain.toFloat(),
                                avg.anxiety.toFloat(),
                            ),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                if (trend.loggedDays == 0) {
                    Text(
                        "No check-ins yet — your trend will appear here after your first log.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                } else {
                    CheckInSparkline(points = trend.days)
                    Text(
                        "Logged ${trend.loggedDays} of ${trend.days.size} days",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}
