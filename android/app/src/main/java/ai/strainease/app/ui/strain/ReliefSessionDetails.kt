@file:OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)

package ai.strainease.app.ui.strain

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import ai.strainease.app.data.ConsumeForm
import ai.strainease.app.data.SessionSideEffect
import ai.strainease.app.data.SessionTimeOfDay



/**
 * Disclosure that mirrors web's `Add session details` block — six
 * optional session-journal fields layered on top of the basic
 * rating + notes form. Collapsed by default so the quick path
 * stays fast (PR-W1 parity).
 */
@Composable
fun ReliefSessionDetails(
    form: ConsumeForm?,
    onFormChange: (ConsumeForm?) -> Unit,
    doseText: String,
    onDoseChange: (String) -> Unit,
    timeOfDay: SessionTimeOfDay?,
    onTimeOfDayChange: (SessionTimeOfDay?) -> Unit,
    onsetText: String,
    onOnsetChange: (String) -> Unit,
    selectedEffects: Set<SessionSideEffect>,
    onToggleEffect: (SessionSideEffect) -> Unit,
    wouldRepeat: Boolean?,
    onWouldRepeatChange: (Boolean?) -> Unit,
    modifier: Modifier = Modifier,
) {
    var expanded by remember { mutableStateOf(false) }

    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 0.dp,
    ) {
        Column {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { expanded = !expanded }
                    .padding(horizontal = 14.dp, vertical = 12.dp),
            ) {
                Text(
                    text = "Add session details",
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.weight(1f),
                )
                Icon(
                    imageVector = Icons.Filled.ArrowDropDown,
                    contentDescription = if (expanded) "Collapse" else "Expand",
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier
                        .size(20.dp)
                        .let { if (expanded) it else it },
                )
            }
            if (expanded) {
                Column(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 14.dp)
                        .padding(bottom = 14.dp),
                ) {
                    ChipSection(
                        title = "Form",
                        options = ConsumeForm.entries.map { it to it.label() },
                        isOn = { form == it },
                        onToggle = { f -> onFormChange(if (form == f) null else f) },
                    )
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        NumberField(
                            label = "THC dose (mg)",
                            value = doseText,
                            onChange = onDoseChange,
                            placeholder = "e.g. 10",
                            modifier = Modifier.weight(1f),
                        )
                        NumberField(
                            label = "Onset (min)",
                            value = onsetText,
                            onChange = onOnsetChange,
                            placeholder = "e.g. 8",
                            modifier = Modifier.weight(1f),
                        )
                    }
                    ChipSection(
                        title = "Time of day",
                        options = SessionTimeOfDay.entries.map { it to it.label() },
                        isOn = { timeOfDay == it },
                        onToggle = { t -> onTimeOfDayChange(if (timeOfDay == t) null else t) },
                    )
                    ChipSection(
                        title = "Side effects (optional)",
                        options = SessionSideEffect.entries.map { it to it.label() },
                        isOn = { selectedEffects.contains(it) },
                        onToggle = { e -> onToggleEffect(e) },
                    )
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(
                            text = "Would you reach for it again?",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            VerdictChip(
                                label = "Yes",
                                selected = wouldRepeat == true,
                                onClick = { onWouldRepeatChange(if (wouldRepeat == true) null else true) },
                            )
                            VerdictChip(
                                label = "No",
                                selected = wouldRepeat == false,
                                onClick = { onWouldRepeatChange(if (wouldRepeat == false) null else false) },
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun <T : Any> ChipSection(
    title: String,
    options: List<Pair<T, String>>,
    isOn: (T) -> Boolean,
    onToggle: (T) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(
            text = title,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            options.forEach { (value, label) ->
                SelectableChip(
                    label = label,
                    isOn = isOn(value),
                    onClick = { onToggle(value) },
                )
            }
        }
    }
}

@Composable
private fun NumberField(
    label: String,
    value: String,
    onChange: (String) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier,
) {
    Column(
        verticalArrangement = Arrangement.spacedBy(4.dp),
        modifier = modifier,
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        OutlinedTextField(
            value = value,
            onValueChange = { next -> if (next.all { it.isDigit() }) onChange(next) },
            placeholder = { Text(placeholder) },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
private fun SelectableChip(label: String, isOn: Boolean, onClick: () -> Unit) {
    val bg = if (isOn) MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)
        else MaterialTheme.colorScheme.surface
    val fg = if (isOn) MaterialTheme.colorScheme.primary
        else MaterialTheme.colorScheme.onSurface
    Surface(
        shape = RoundedCornerShape(50),
        color = bg,
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .clickable { onClick() },
    ) {
        Text(
            text = label,
            color = fg,
            style = MaterialTheme.typography.labelMedium,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
        )
    }
}

@Composable
private fun VerdictChip(label: String, selected: Boolean, onClick: () -> Unit) {
    val bg = if (selected) MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)
        else MaterialTheme.colorScheme.surface
    val fg = if (selected) MaterialTheme.colorScheme.primary
        else MaterialTheme.colorScheme.onSurface
    Surface(
        shape = RoundedCornerShape(50),
        color = bg,
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .clickable { onClick() },
    ) {
        Text(
            text = label,
            color = fg,
            style = MaterialTheme.typography.labelMedium,
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
        )
    }
}

private fun ConsumeForm.label(): String = when (this) {
    ConsumeForm.flower -> "Flower"
    ConsumeForm.cart -> "Cart"
    ConsumeForm.edible -> "Edible"
    ConsumeForm.tincture -> "Tincture"
}

private fun SessionTimeOfDay.label(): String = when (this) {
    SessionTimeOfDay.morning -> "Morning"
    SessionTimeOfDay.afternoon -> "Afternoon"
    SessionTimeOfDay.evening -> "Evening"
    SessionTimeOfDay.night -> "Night"
}

private fun SessionSideEffect.label(): String = when (this) {
    SessionSideEffect.anxiety -> "Anxiety"
    SessionSideEffect.paranoia -> "Paranoia"
    SessionSideEffect.`dry-mouth` -> "Dry mouth"
    SessionSideEffect.drowsiness -> "Drowsiness"
    SessionSideEffect.`racing-heart` -> "Racing heart"
    SessionSideEffect.nausea -> "Nausea"
    SessionSideEffect.headache -> "Headache"
}
