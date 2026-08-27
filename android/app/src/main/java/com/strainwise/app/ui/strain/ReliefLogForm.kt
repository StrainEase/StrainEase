package com.strainwise.app.ui.strain

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.strainwise.app.data.ReliefFit
import com.strainwise.app.data.ReliefLog
import com.strainwise.app.data.ReliefLogStore
import com.strainwise.app.data.SavedAilmentsStore
import com.strainwise.app.models.StrainProfile
import com.strainwise.app.ui.components.SWCard
import com.strainwise.app.ui.components.SWChip
import com.strainwise.app.ui.components.SWField
import com.strainwise.app.ui.components.SWFlowRow
import com.strainwise.app.ui.components.SWPrimaryButton
import com.strainwise.app.ui.components.SectionLabel
import kotlinx.coroutines.launch

/**
 * "How did it work for you?" form on the strain detail page.
 * Direct port of the iOS `ReliefLogForm` after PR-A14 brought
 * the Android `ReliefLog` shape in line with iOS:
 *  - 3-option `fit` chip row (Too weak / Just right / Too strong)
 *  - 1-5 `relief` slider
 *  - optional `note` text field (max 400 chars)
 *  - conditions are seeded from the user's saved ailments, with
 *    an optional extra-condition field for ad-hoc use
 *
 * The strain slug is computed once so the iOS Detail page can
 * filter the per-strain relief history without a name match.
 */
@Composable
fun ReliefLogForm(
    strain: StrainProfile,
    relief: ReliefLogStore,
    savedAilments: SavedAilmentsStore,
    modifier: Modifier = Modifier,
) {
    var open by remember { mutableStateOf(false) }
    var fit by remember { mutableStateOf(ReliefFit.JustRight) }
    var reliefValue by remember { mutableStateOf(4f) }
    var note by remember { mutableStateOf("") }
    var extraCondition by remember { mutableStateOf("") }
    val ailments by savedAilments.ailmentsFlow.collectAsState(initial = emptyList())
    val scope = rememberCoroutineScope()
    val isBusy = relief.log.size.let { false } // no separate busy flag on Android yet

    SWCard(modifier = modifier) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            SectionLabel(title = "How did it work for you?", index = 6)
            Text(
                text = "Your note is shared across all your devices. Helps the Find prompt tailor the next set of recommendations.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                SWPrimaryButton(
                    title = if (open) "Cancel" else "Log how this went",
                    enabled = !isBusy,
                    onClick = { open = !open },
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            if (open) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        text = "Potency",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    SWFlowRow {
                        ReliefFit.entries.forEach { option ->
                            SWChip(
                                title = option.label,
                                selected = fit == option,
                                onClick = { fit = option },
                            )
                        }
                    }
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(
                            text = "Relief ${reliefValue.toInt()}/5",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Slider(
                            value = reliefValue,
                            onValueChange = { reliefValue = it },
                            valueRange = 1f..5f,
                            steps = 3,
                            colors = SliderDefaults.colors(
                                thumbColor = MaterialTheme.colorScheme.primary,
                                activeTrackColor = MaterialTheme.colorScheme.primary,
                                inactiveTrackColor = MaterialTheme.colorScheme.outline,
                            ),
                        )
                    }
                    SWField(
                        value = note,
                        onValueChange = { note = it.take(400) },
                        placeholder = "Optional note — e.g. slept 6 hours",
                        label = "Note",
                        multiLine = true,
                    )
                    if (ailments.isEmpty()) {
                        SWField(
                            value = extraCondition,
                            onValueChange = { extraCondition = it.take(79) },
                            placeholder = "What did you use it for? (e.g. insomnia)",
                            label = "Condition",
                        )
                    } else {
                        Text(
                            text = "Conditions (from your saved ailments): ${ailments.joinToString(", ")}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    SWPrimaryButton(
                        title = "Save log",
                        enabled = !isBusy,
                        onClick = {
                            val merged = buildList<String> {
                                addAll(ailments)
                                val extra = extraCondition.trim()
                                if (extra.isNotEmpty() && none { it.equals(extra, ignoreCase = true) }) {
                                    add(extra)
                                }
                            }.take(6)
                            scope.launch {
                                relief.add(
                                    ReliefLog(
                                        id = "",
                                        strainName = strain.name,
                                        strainSlug = strain.slug,
                                        conditions = merged,
                                        fit = fit,
                                        relief = reliefValue.toInt().coerceIn(1, 5),
                                        note = note.trim().take(400),
                                        createdAt = System.currentTimeMillis(),
                                    ),
                                )
                                open = false
                                note = ""
                                extraCondition = ""
                                reliefValue = 4f
                                fit = ReliefFit.JustRight
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }
        }
    }
}
