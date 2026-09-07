package ai.strainease.app.ui.strain

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Lock
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
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ai.strainease.app.data.ReliefLog
import ai.strainease.app.data.ReliefLogStore
import ai.strainease.app.ui.components.SWCard
import ai.strainease.app.ui.components.SWField
import ai.strainease.app.ui.components.SectionLabel
import ai.strainease.app.ui.theme.StrainEaseTypography
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
    var intensity by remember { mutableStateOf(0) }
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
            // Rating (stars) and Intensity (dots) recorded separately,
            // two centered columns — mirrors the iOS/web forms.
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(24.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.weight(1f),
                ) {
                    Text(
                        text = "Rating",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        (1..5).forEach { i ->
                            Text(
                                text = "★",
                                style = StrainEaseTypography.titleLarge.copy(
                                    color = if (i <= rating) MaterialTheme.colorScheme.primary
                                    else MaterialTheme.colorScheme.outline,
                                ),
                                modifier = Modifier
                                    .clickable { rating = i },
                            )
                        }
                    }
                }
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.weight(1f),
                ) {
                    Text(
                        text = "Intensity",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        (1..5).forEach { i ->
                            Box(
                                modifier = Modifier
                                    .size(18.dp)
                                    .clip(CircleShape)
                                    .background(
                                        if (i <= intensity) MaterialTheme.colorScheme.primary
                                        else MaterialTheme.colorScheme.outline.copy(alpha = 0.35f),
                                    )
                                    .clickable { intensity = i },
                            )
                        }
                    }
                }
            }
            // Notes textbox (1fr) | privacy lock (auto) | Save (auto) on
            // one line — same spacing as the web SavedStrainNotes row.
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                SWField(
                    value = notes,
                    onValueChange = { notes = it },
                    placeholder = "What did you notice?",
                    modifier = Modifier.weight(1f),
                )
                // Privacy indicator: relief notes always stay on this
                // device, so the lock is informational, not a toggle.
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(
                            MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.08f),
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = Icons.Filled.Lock,
                        contentDescription = "Private — stays on this device",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(16.dp),
                    )
                }
                Text(
                    text = "Save",
                    style = StrainEaseTypography.labelMedium.copy(
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                    ),
                    color = MaterialTheme.colorScheme.onPrimary,
                    modifier = Modifier
                        .alpha(if (rating > 0 && intensity > 0 && notes.isNotBlank()) 1f else 0.45f)
                        .clip(RoundedCornerShape(50))
                        .background(MaterialTheme.colorScheme.primary)
                        .clickable(enabled = rating > 0 && intensity > 0 && notes.isNotBlank()) {
                            scope.launch {
                                relief.append(
                                    ReliefLog(
                                        strainName = strainName,
                                        strainSlug = strainSlug,
                                        notes = notes,
                                        rating = rating,
                                        intensity = intensity,
                                        loggedAt = System.currentTimeMillis(),
                                    ),
                                )
                                notes = ""
                                rating = 0
                                intensity = 0
                            }
                        }
                        .padding(horizontal = 16.dp, vertical = 10.dp),
                )
            }
        }
    }
}