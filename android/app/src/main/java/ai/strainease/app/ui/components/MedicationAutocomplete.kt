package ai.strainease.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp

/**
 * Autocomplete chip input for medications.
 * Shows a text field with saved-suggestions dropdown and
 * renders selected medications as dismissible chips.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun MedicationAutocomplete(
    medications: List<String>,
    onMedicationsChange: (List<String>) -> Unit,
    suggestions: List<String>,
    modifier: Modifier = Modifier,
) {
    var draft by remember { mutableStateOf("") }
    var showDropdown by remember { mutableStateOf(false) }
    val focusManager = LocalFocusManager.current

    val matches = remember(draft, suggestions, medications) {
        if (draft.isBlank()) emptyList()
        else suggestions.filter { s ->
            s.lowercase().contains(draft.lowercase()) &&
            !medications.any { it.lowercase() == s.lowercase() }
        }.take(5)
    }

    Column(modifier = modifier) {
        // Selected chips
        if (medications.isNotEmpty()) {
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                medications.forEach { name ->
                    Row(
                        modifier = Modifier
                            .background(
                                MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                                RoundedCornerShape(50)
                            )
                            .border(
                                MaterialTheme.colorScheme.primary.copy(alpha = 0.4f),
                                RoundedCornerShape(50)
                            )
                            .padding(horizontal = 12.dp, vertical = 7.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        Text(
                            text = name,
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.primary,
                        )
                        Box(
                            modifier = Modifier
                                .size(16.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.7f))
                                .clickable { onMedicationsChange(medications.filter { it != name }) },
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                text = "×",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onPrimary,
                            )
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Input field
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(modifier = Modifier.weight(1f)) {
                OutlinedTextField(
                    value = draft,
                    onValueChange = {
                        draft = it
                        showDropdown = it.isNotBlank()
                    },
                    placeholder = { Text("Add medication") },
                    singleLine = true,
                    shape = RoundedCornerShape(50),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = MaterialTheme.colorScheme.surface,
                        unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                        focusedBorderColor = MaterialTheme.colorScheme.outline,
                        unfocusedBorderColor = MaterialTheme.colorScheme.outline,
                        focusedTextColor = MaterialTheme.colorScheme.onSurface,
                        unfocusedTextColor = MaterialTheme.colorScheme.onSurface,
                    ),
                    keyboardOptions = KeyboardOptions(
                        capitalization = KeyboardCapitalization.Words,
                        imeAction = ImeAction.Done,
                    ),
                    keyboardActions = KeyboardActions(
                        onDone = {
                            addItem(draft, medications, onMedicationsChange)
                            draft = ""
                            showDropdown = false
                            focusManager.clearFocus()
                        },
                    ),
                    modifier = Modifier.fillMaxWidth(),
                )

                // Suggestions dropdown
                DropdownMenu(
                    expanded = showDropdown && matches.isNotEmpty(),
                    onDismissRequest = { showDropdown = false },
                    modifier = Modifier.fillMaxWidth(0.9f),
                ) {
                    matches.forEach { match ->
                        DropdownMenuItem(
                            text = { Text(match) },
                            onClick = {
                                onMedicationsChange(medications + match)
                                draft = ""
                                showDropdown = false
                            },
                        )
                    }
                }
            }

            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(
                        if (draft.isNotBlank())
                            MaterialTheme.colorScheme.primary
                        else
                            MaterialTheme.colorScheme.primary.copy(alpha = 0.45f)
                    )
                    .clickable(enabled = draft.isNotBlank()) {
                        addItem(draft, medications, onMedicationsChange)
                        draft = ""
                        showDropdown = false
                        focusManager.clearFocus()
                    },
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Filled.Add,
                    contentDescription = "Add medication",
                    tint = MaterialTheme.colorScheme.onPrimary,
                )
            }
        }
    }
}

private fun addItem(
    draft: String,
    current: List<String>,
    onChange: (List<String>) -> Unit,
) {
    val trimmed = draft.trim()
    if (trimmed.isBlank()) return
    if (!current.any { it.lowercase() == trimmed.lowercase() }) {
        onChange(current + trimmed)
    }
}
