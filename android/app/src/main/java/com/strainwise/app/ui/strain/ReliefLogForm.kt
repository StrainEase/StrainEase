package com.strainwise.app.ui.strain

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.strainwise.app.data.ReliefLog
import com.strainwise.app.data.ReliefLogStore
import com.strainwise.app.ui.components.IntensityBar
import com.strainwise.app.ui.components.SWCard
import com.strainwise.app.ui.components.SWField
import com.strainwise.app.ui.components.SWPrimaryButton
import com.strainwise.app.ui.components.SectionLabel
import com.strainwise.app.ui.theme.StrainWiseTypography
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
            SectionLabel(title = "How did it work for you?", index = 6)
            Text(
                text = "Stays on this device. Helps the Find prompt tailor the next set of recommendations.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                text = "Rating",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                (1..5).forEach { i ->
                    Text(
                        text = "★",
                        style = StrainWiseTypography.titleLarge.copy(
                            color = if (i <= rating) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.outline,
                        ),
                        modifier = Modifier
                            .clickable { rating = i },
                    )
                }
            }
            IntensityBar(value = rating)
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
