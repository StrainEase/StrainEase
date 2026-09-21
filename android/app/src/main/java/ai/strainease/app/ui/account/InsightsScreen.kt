package ai.strainease.app.ui.account

import ai.strainease.app.data.ReliefLog
import ai.strainease.app.data.ReliefLogStore
import ai.strainease.app.data.SavedAilmentsStore
import ai.strainease.app.data.SavedStrainsStore
import ai.strainease.app.ui.components.MeshBackground
import ai.strainease.app.ui.components.SWCard
import ai.strainease.app.ui.components.SectionLabel
import ai.strainease.app.ui.strain.StrainPersonalInsight
import ai.strainease.app.ui.theme.StrainEaseTypography
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

/**
 * Mirrors `src/components/saved/JournalPanel.tsx` (PR-W1) +
 * `InsightsPanel.swift` (PR-i1). PR-W1 puts the Insights entry as a
 * top-header circular button between Favorites and Library; iOS /
 * Android put the same surface as a sub-page from Account.
 */
@Composable
fun InsightsScreen(
    relief: ReliefLogStore,
    savedStrains: SavedStrainsStore,
    ailments: SavedAilmentsStore,
    onBack: () -> Unit,
    onViewAll: () -> Unit,
    modifier: Modifier = Modifier,
) {
    LaunchedEffect(Unit) { relief.refresh() }
    val log by relief.logFlow.collectAsState(initial = relief.log)
    val saved by savedStrains.savedFlow.collectAsState(initial = emptyList())
    val ailmentsList by ailments.ailmentsFlow.collectAsState(initial = emptyList())

    Box(modifier = modifier.fillMaxSize()) {
        MeshBackground()
        Column(modifier = Modifier.fillMaxSize()) {
            subPageHeader(title = "Insights", onBack = onBack)
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 20.dp, vertical = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                Text(
                    text = if (log.isEmpty()) {
                        "Log a strain after you try it and we'll surface what's working for you."
                    } else {
                        "Based on ${log.size} session${if (log.size == 1) "" else "s"} across your saved strains."
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                val perStrain = remember(log, saved) { perStrainCards(log, saved.map { it.name }) }
                if (perStrain.isEmpty() && log.isNotEmpty()) {
                    SWCard {
                        Text(
                            text = "Not enough data yet — log each strain at least 3 times to see a personal hit-rate chip.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurface,
                        )
                    }
                } else {
                    perStrain.forEach { entry ->
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            SectionLabel(title = entry.strain, index = 4)
                            StrainPersonalInsight(
                                logs = entry.logs,
                                savedConditions = ailmentsList,
                            )
                        }
                    }
                }
                if (log.isNotEmpty()) {
                    SWCard(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onViewAll() },
                    ) {
                        Text(
                            text = "View all ${log.size} sessions",
                            style = StrainEaseTypography.titleSmall,
                            color = MaterialTheme.colorScheme.primary,
                        )
                    }
                }
            }
        }
    }
}

private const val MIN_LOGS = 3

private data class PerStrain(val strain: String, val logs: List<ReliefLog>)

private fun perStrainCards(log: List<ReliefLog>, savedNames: List<String>): List<PerStrain> {
    val target = if (savedNames.isEmpty()) log.map { it.strainName }.toSet()
    else savedNames.toSet()
    return target.mapNotNull { name ->
        val per = log.filter { it.strainName == name }.sortedByDescending { it.loggedAt }
        if (per.size < MIN_LOGS) null else PerStrain(name, per)
    }.sortedBy { it.strain }
}
