package com.strainwise.app.ui.compare

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.strainwise.app.StrainWiseApplication
import com.strainwise.app.data.SavedAilmentsStore
import com.strainwise.app.data.SavedMedicationsStore
import com.strainwise.app.data.StrainAPI
import com.strainwise.app.data.StrainAILanguage
import com.strainwise.app.models.ResearchPrefs
import com.strainwise.app.ui.components.SWCard
import com.strainwise.app.ui.components.SWErrorBanner
import com.strainwise.app.ui.components.SWPrimaryButton
import com.strainwise.app.ui.theme.StrainWiseTypography
import kotlinx.coroutines.launch

/**
 * Floating bottom tray that surfaces the compare selection.
 * 1:1 port of the iOS `CompareTrayBar`. Renders the picked
 * strain chips, a "Compare" button that fires the
 * `compareStrains` callable, the inline error banner, and
 * the "Clear" affordance.
 */
@Composable
fun CompareTrayBar(
    store: CompareSelectionStore,
    api: StrainAPI,
    savedAilments: SavedAilmentsStore,
    savedMedications: SavedMedicationsStore,
    researchHistory: com.strainwise.app.data.ResearchHistoryStore,
    modifier: Modifier = Modifier,
) {
    val names by store.names.collectAsState()
    val error by store.errorMessage.collectAsState()
    val comparison by store.comparison.collectAsState()
    val scope = rememberCoroutineScope()
    var isRunning by remember { mutableStateOf(false) }

    AnimatedVisibility(visible = names.isNotEmpty()) {
        Column(
            modifier = modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            error?.let { SWErrorBanner(message = it) }
            SWCard {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            text = "Compare",
                            style = StrainWiseTypography.titleSmall,
                            color = MaterialTheme.colorScheme.onSurface,
                            modifier = Modifier.weight(1f),
                        )
                        Text(
                            text = "${names.size}/3",
                            style = StrainWiseTypography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Spacer(Modifier.size(8.dp))
                        Icon(
                            imageVector = Icons.Filled.Close,
                            contentDescription = "Clear selection",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier
                                .clip(RoundedCornerShape(50))
                                .clickable { store.clear() }
                                .padding(6.dp),
                        )
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        names.forEach { name ->
                            ChipPill(name = name, onRemove = { store.toggle(name) })
                        }
                    }
                    SWPrimaryButton(
                        title = "Compare",
                        isBusy = isRunning,
                        enabled = !isRunning && names.size in 2..3,
                        onClick = {
                            scope.launch {
                                isRunning = true
                                store.setError(null)
                                try {
                                    val result = api.compare(
                                        strainNames = names,
                                        conditions = savedAilments.ailments,
                                        prefs = ResearchPrefs(
                                            medications = savedMedications.names.joinToString(", "),
                                        ),
                                        reliefSummary = null,
                                        language = StrainAILanguage.English,
                                    )
                                    store.setComparison(result)
                                    // Persist a Past-research row so the
                                    // user can re-open this exact run
                                    // from the Account sheet. Mirrors
                                    // the iOS CompareTrayBar's
                                    // `history.remember(compare:)` call.
                                    researchHistory.remember(
                                        compare = result,
                                        names = names,
                                        conditions = savedAilments.ailments,
                                    )
                                } catch (t: Throwable) {
                                    store.setError(t.localizedMessage ?: "Couldn't compare.")
                                } finally {
                                    isRunning = false
                                }
                            }
                        },
                    )
                }
            }
        }
    }
}

@Composable
private fun ChipPill(name: String, onRemove: () -> Unit) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f))
            .border(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.4f), RoundedCornerShape(50))
            .padding(start = 12.dp, end = 4.dp, top = 4.dp, bottom = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = name,
            style = StrainWiseTypography.labelMedium,
            color = MaterialTheme.colorScheme.primary,
        )
        Spacer(Modifier.size(2.dp))
        Icon(
            imageVector = Icons.Filled.Close,
            contentDescription = "Remove $name",
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier
                .clip(RoundedCornerShape(50))
                .clickable(onClick = onRemove)
                .padding(4.dp)
                .size(16.dp),
        )
    }
}
