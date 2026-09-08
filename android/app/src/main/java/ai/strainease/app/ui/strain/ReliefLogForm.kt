package ai.strainease.app.ui.strain

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import ai.strainease.app.data.ReliefLog
import ai.strainease.app.data.ReliefLogStore
import ai.strainease.app.ui.components.SWCard
import ai.strainease.app.ui.components.SWField
import ai.strainease.app.ui.components.SWPrimaryButton
import ai.strainease.app.ui.components.SectionLabel
import kotlinx.coroutines.launch

/**
 * "How did it work for you?" form on the strain detail page.
 * Direct port of the iOS `ReliefLogForm`. Logs a rating +
 * free-text note to [ReliefLogStore]; the strain's
 * `triedNotes` rail on the same page reads the store for
 * past entries.
 */
@Composable
fun ReliefLogForm(
    strainName: String,
    strainSlug: String,
    relief: ReliefLogStore,
    modifier: Modifier = Modifier,
) {
    var rating by remember { mutableStateOf(0) }
    var notes by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()

    SWCard(modifier = modifier) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Icon(
                    imageVector = Icons.Filled.AutoAwesome,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(16.dp),
                )
                SectionLabel(title = "How'd this work for you?", index = 6)
            }
            Text(
                text = "Stays on this device. Helps the Find prompt tailor the next set of recommendations.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                text = "Relief $rating/5",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            SegmentedIntensityPicker(
                value = rating,
                label = "Relief",
                onValueChange = { rating = it },
            )
            SWField(
                value = notes,
                onValueChange = { notes = it },
                placeholder = "What did you notice?",
                label = "Notes",
                multiLine = true,
            )
            SWPrimaryButton(
                title = "Save",
                enabled = rating > 0 && notes.isNotBlank(),
                onClick = {
                    scope.launch {
                        relief.append(
                            ReliefLog(
                                strainName = strainName,
                                strainSlug = strainSlug,
                                notes = notes,
                                rating = rating,
                                loggedAt = System.currentTimeMillis(),
                            ),
                        )
                        notes = ""
                        rating = 0
                    }
                },
            )
        }
    }
}

@Composable
private fun SegmentedIntensityPicker(
    value: Int,
    label: String,
    onValueChange: (Int) -> Unit,
) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(2.dp),
        modifier = Modifier
            .fillMaxWidth()
            .semantics {
                contentDescription = "$label, $value out of 5"
            },
    ) {
        (1..5).forEach { segment ->
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(androidx.compose.foundation.shape.CircleShape)
                    .clickable { onValueChange(segment) }
                    .semantics {
                        contentDescription = "$label $segment out of 5"
                        role = Role.RadioButton
                        selected = segment == value
                    },
                contentAlignment = Alignment.Center,
            ) {
                Box(
                    modifier = Modifier
                        .size(14.dp)
                        .clip(androidx.compose.foundation.shape.CircleShape)
                        .background(
                            if (segment <= value) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.surface,
                        )
                        .border(
                            1.dp,
                            if (segment <= value) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.outline,
                            androidx.compose.foundation.shape.CircleShape,
                        ),
                )
            }
        }
    }
}
