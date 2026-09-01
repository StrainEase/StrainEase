package ai.strainease.app.ui.checkin

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ai.strainease.app.data.CheckIn
import ai.strainease.app.data.CheckInMetrics
import ai.strainease.app.data.CheckInStore
import kotlinx.coroutines.launch

/**
 * Form for today's check-in. Four 1-5 scales, optional note,
 * and a "Clear" affordance so the patient can wipe the day if
 * they logged by mistake. Direct port of the iOS
 * `CheckInForm.swift` shape and the web `CheckInForm.tsx`.
 *
 * Reads the current entry from the provided [today] prop so
 * the form can hydrate without a second DataStore read; the
 * parent is responsible for keeping it in sync with the
 * [CheckInStore] flow.
 *
 * The form owns the local `metrics` and `note` state so the
 * save callback can be wired directly to the [store] without
 * round-tripping through the parent.
 */
@Composable
fun CheckInForm(
    today: CheckIn?,
    store: CheckInStore,
    modifier: Modifier = Modifier,
) {
    var metrics by remember { mutableStateOf(CheckInStore.defaultMetrics) }
    var note by remember { mutableStateOf("") }
    var isSaving by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(today?.date, today?.updatedAt) {
        if (today != null) {
            metrics = today.metrics
            note = today.note
        } else {
            metrics = CheckInStore.defaultMetrics
            note = ""
        }
    }

    val scales = listOf(
        ScaleSpec(label = "Mood", hint = "1 = awful, 5 = great", highIsGood = true),
        ScaleSpec(label = "Sleep", hint = "1 = none, 5 = fully rested", highIsGood = true),
        ScaleSpec(label = "Pain", hint = "1 = none, 5 = severe", highIsGood = false),
        ScaleSpec(label = "Anxiety", hint = "1 = calm, 5 = severe", highIsGood = false),
    )

    Column(verticalArrangement = Arrangement.spacedBy(16.dp), modifier = modifier) {
        scales.forEach { scale ->
            scaleRow(scale, metrics, onPick = { value ->
                metrics = when (scale.label) {
                    "Mood" -> metrics.copy(mood = value)
                    "Sleep" -> metrics.copy(sleep = value)
                    "Pain" -> metrics.copy(pain = value)
                    "Anxiety" -> metrics.copy(anxiety = value)
                    else -> metrics
                }
            })
        }

        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(
                "Note (optional)",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            OutlinedTextField(
                value = note,
                onValueChange = { v -> if (v.length <= CheckInStore.CHECK_IN_NOTE_MAX) note = v },
                placeholder = { Text("Anything to remember?") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 3,
                colors = fieldColors(),
            )
            Text(
                "${note.length} / ${CheckInStore.CHECK_IN_NOTE_MAX}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        Row(
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            SaveButton(
                isLoading = isSaving,
                onClick = {
                    if (isSaving) return@SaveButton
                    isSaving = true
                    scope.launch {
                        store.upsert(metrics, note)
                        isSaving = false
                    }
                },
                modifier = Modifier.weight(1f),
            )
            if (today != null) {
                ClearButton(
                    onClick = {
                        if (isSaving) return@ClearButton
                        isSaving = true
                        scope.launch {
                            store.delete(CheckInStore.todayKey())
                            metrics = CheckInStore.defaultMetrics
                            note = ""
                            isSaving = false
                        }
                    },
                )
            }
        }
    }
}

private data class ScaleSpec(
    val label: String,
    val hint: String,
    val highIsGood: Boolean,
)

@Composable
private fun scaleRow(
    scale: ScaleSpec,
    metrics: CheckInMetrics,
    onPick: (Int) -> Unit,
) {
    val current = when (scale.label) {
        "Mood" -> metrics.mood
        "Sleep" -> metrics.sleep
        "Pain" -> metrics.pain
        "Anxiety" -> metrics.anxiety
        else -> 3
    }
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(
                scale.label,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.SemiBold,
            )
            Box(Modifier.weight(1f))
            Text(
                scale.hint,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            (1..5).forEach { i ->
                val selected = current == i
                Box(
                    modifier = Modifier
                        .size(38.dp)
                        .clip(CircleShape)
                        .background(
                            if (selected) scaleColor(i, scale.highIsGood) else MaterialTheme.colorScheme.surface
                        )
                        .border(1.dp, MaterialTheme.colorScheme.outline, CircleShape)
                        .clickable { onPick(i) },
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        "$i",
                        color = if (selected) Color.White else MaterialTheme.colorScheme.onSurface,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
        }
    }
}

private fun scaleColor(value: Int, highIsGood: Boolean): Color {
    val goodEnd = if (highIsGood) 5 else 1
    val distance = kotlin.math.abs(value - goodEnd)
    return when {
        distance <= 1 -> Color(0xFF22C55E) // emerald-500
        distance <= 2 -> Color(0xFFF59E0B) // amber-500
        else -> Color(0xFFEF4444) // rose-500
    }
}

@Composable
private fun fieldColors() = OutlinedTextFieldDefaults.colors(
    focusedContainerColor = MaterialTheme.colorScheme.surface,
    unfocusedContainerColor = MaterialTheme.colorScheme.surface,
    focusedBorderColor = MaterialTheme.colorScheme.outline,
    unfocusedBorderColor = MaterialTheme.colorScheme.outline,
    focusedTextColor = MaterialTheme.colorScheme.onSurface,
    unfocusedTextColor = MaterialTheme.colorScheme.onSurface,
    cursorColor = MaterialTheme.colorScheme.primary,
)

@Composable
private fun SaveButton(
    isLoading: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(50))
            .background(MaterialTheme.colorScheme.primary)
            .clickable(enabled = !isLoading, onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (isLoading) {
            CircularProgressIndicator(
                modifier = Modifier.size(16.dp),
                strokeWidth = 2.dp,
                color = MaterialTheme.colorScheme.onPrimary,
            )
        } else {
            Icon(
                imageVector = Icons.Default.Check,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onPrimary,
                modifier = Modifier.size(16.dp),
            )
        }
        Text(
            "  Save",
            color = MaterialTheme.colorScheme.onPrimary,
            fontWeight = FontWeight.SemiBold,
            fontSize = 14.sp,
        )
    }
}

@Composable
private fun ClearButton(
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(50))
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            imageVector = Icons.Default.Delete,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.size(16.dp),
        )
        Text(
            "  Clear",
            color = MaterialTheme.colorScheme.onSurface,
            fontWeight = FontWeight.Medium,
            fontSize = 14.sp,
        )
    }
}
