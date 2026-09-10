package ai.strainease.app.ui.components

import ai.strainease.app.data.StrainCatalog
import ai.strainease.app.data.TriedStrain
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
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusManager
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp

/**
 * Autocomplete chip input for tried strains.
 * Shows a text field with strain catalog suggestions and
 * renders selected strains as dismissible chips.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun StrainAutocomplete(
    strains: List<TriedStrain>,
    onStrainsChange: (List<TriedStrain>) -> Unit,
    modifier: Modifier = Modifier,
) {
    var draft by remember { mutableStateOf("") }
    var showDropdown by remember { mutableStateOf(false) }
    val focusManager = LocalFocusManager.current

    val catalog = remember { StrainCatalog.all }
    val matches = remember(draft, catalog, strains) {
        if (draft.isBlank()) emptyList()
        else catalog.filter { s ->
            s.name.lowercase().contains(draft.lowercase()) &&
            !strains.any { it.name.lowercase() == s.name.lowercase() }
        }.take(5)
    }

    Column(modifier = modifier) {
        // Selected chips
        if (strains.isNotEmpty()) {
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                strains.forEach { strain ->
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
                            text = strain.name,
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.primary,
                        )
                        Box(
                            modifier = Modifier
                                .size(16.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.7f))
                                .clickable { onStrainsChange(strains.filter { it.id != strain.id }) },
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
                    placeholder = { Text("Add strain") },
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
                            addCustomItem(draft, strains, onStrainsChange)
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
                    matches.forEach { profile ->
                        DropdownMenuItem(
                            text = {
                                Column {
                                    Text(
                                        text = profile.name,
                                        style = MaterialTheme.typography.labelMedium,
                                    )
                                    profile.thcRange?.let { thc ->
                                        Text(
                                            text = thc,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                }
                            },
                            onClick = {
                                val slug = profile.slug
                                val item = TriedStrain(
                                    id = slug,
                                    name = profile.name,
                                    type = profile.type?.rawValue ?: "",
                                    thc = profile.thcRange ?: "",
                                    addedAt = System.currentTimeMillis(),
                                )
                                onStrainsChange(strains + item)
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
                        addCustomItem(draft, strains, onStrainsChange)
                        draft = ""
                        showDropdown = false
                        focusManager.clearFocus()
                    },
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Filled.Add,
                    contentDescription = "Add strain",
                    tint = MaterialTheme.colorScheme.onPrimary,
                )
            }
        }
    }
}

private fun addCustomItem(
    draft: String,
    current: List<TriedStrain>,
    onChange: (List<TriedStrain>) -> Unit,
) {
    val trimmed = draft.trim()
    if (trimmed.isBlank()) return
    if (!current.any { it.name.lowercase() == trimmed.lowercase() }) {
        val slug = trimmed.lowercase().replace(" ", "-")
        val item = TriedStrain(
            id = slug,
            name = trimmed,
            type = "",
            thc = "",
            addedAt = System.currentTimeMillis(),
        )
        onChange(current + item)
    }
}
