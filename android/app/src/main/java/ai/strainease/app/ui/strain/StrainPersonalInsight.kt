package ai.strainease.app.ui.strain

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.QueryStats
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ai.strainease.app.data.ReliefLog

/**
 * Patient-specific "works for X" chip on the strain detail page.
 *
 * Mirrors `src/components/saved/StrainPersonalInsight.tsx` from PR-W1:
 * shows once the patient has logged this strain at least 3 times,
 * tries saved conditions first, then falls back to any condition
 * present in logs. Stays silent when there isn't enough data.
 */
@Composable
fun StrainPersonalInsight(
    logs: List<ReliefLog>,
    savedConditions: List<String>,
    modifier: Modifier = Modifier,
) {
    val snapshot = remember(logs, savedConditions) {
        snapshot(logs, savedConditions)
    }
    if (snapshot != null) {
        Surface(
            modifier = modifier
                .fillMaxWidth()
                .border(
                    width = 1.dp,
                    color = MaterialTheme.colorScheme.primary.copy(alpha = 0.25f),
                    shape = RoundedCornerShape(50),
                ),
            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.08f),
            shape = RoundedCornerShape(50),
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 10.dp),
            ) {
                Icon(
                    imageVector = Icons.Filled.QueryStats,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.padding(end = 8.dp),
                )
                Text(
                    text = labelFor(snapshot),
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurface,
                )
            }
        }
    }
}

private const val MIN_LOGS = 3

private data class Snapshot(val condition: String, val hits: Int, val total: Int)

private fun snapshot(logs: List<ReliefLog>, saved: List<String>): Snapshot? {
    if (logs.size < MIN_LOGS) return null
    val helpful = logs.filter { it.rating >= 4 }
    val hits = helpful.size
    val total = logs.size
    val condition = bestCondition(helpful, saved) ?: return null
    return Snapshot(condition, hits, total)
}

private fun bestCondition(
    helpful: List<ReliefLog>,
    saved: List<String>,
): String? {
    val candidates = helpful.flatMap { it.notes.split(",", ";").map(String::trim) }
    val savedLower = saved.map { it.lowercase() }
    val match = savedLower.firstOrNull { saved ->
        candidates.any { it.lowercase().contains(saved) }
    }
    if (match != null) return saved.first { it.lowercase() == match }
    return helpful.firstOrNull()?.notes?.split(",", ";")?.firstOrNull()?.trim()
}

private fun labelFor(snap: Snapshot): String {
    val head = "Helpful for ${snap.condition}"
    val tail = "${snap.hits} of ${snap.total} sessions hit the mark"
    return "$head · $tail"
}
