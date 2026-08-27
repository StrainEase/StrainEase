package com.strainwise.app.ui.account

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.strainwise.app.app.LocalAppNavigation
import com.strainwise.app.auth.LocalAuthSession
import com.strainwise.app.compliance.AgeVerificationStore
import com.strainwise.app.data.ReliefLog
import com.strainwise.app.data.ReliefLogStore
import com.strainwise.app.data.SavedAilmentsStore
import com.strainwise.app.data.SavedMedicationsStore
import com.strainwise.app.data.SavedStrain
import com.strainwise.app.data.SavedStrainsStore
import com.strainwise.app.models.Conditions
import com.strainwise.app.ui.components.Eyebrow
import com.strainwise.app.ui.components.MeshBackground
import com.strainwise.app.ui.components.SWCard
import com.strainwise.app.ui.components.SWChip
import com.strainwise.app.ui.components.SWErrorBanner
import com.strainwise.app.ui.components.SWFlowRow
import com.strainwise.app.ui.components.SWPrimaryButton
import com.strainwise.app.ui.components.SectionLabel
import com.strainwise.app.ui.components.TypeBadge
import com.strainwise.app.ui.home.StrainPoster
import com.strainwise.app.ui.theme.StrainWiseTypography
import kotlinx.coroutines.launch

/**
 * Account / Settings sheet. 1:1 port of the iOS
 * `AccountView`. Shows the user's display name, a sign-out
 * button, the saved ailments editor, the saved medications
 * editor, the saved strains list, the relief log history,
 * and the compliance footer with the "Reset age
 * verification" action.
 */
@Composable
fun AccountView(
    savedAilments: SavedAilmentsStore,
    savedMedications: SavedMedicationsStore,
    savedStrains: SavedStrainsStore,
    relief: ReliefLogStore,
    ageStore: AgeVerificationStore,
    researchHistory: com.strainwise.app.data.ResearchHistoryStore,
    onDismiss: () -> Unit,
    onOpenStrain: (com.strainwise.app.models.StrainProfile) -> Unit,
    onOpenPastResearch: () -> Unit = {},
    modifier: Modifier = Modifier,
) {
    val session = LocalAuthSession.current
    val user = session.user
    val nav = LocalAppNavigation.current
    val scope = rememberCoroutineScope()
    val ailments by savedAilments.ailmentsFlow.collectAsState(initial = emptyList())
    val medications by savedMedications.medicationsFlow.collectAsState(initial = emptyList())
    val saved by savedStrains.savedFlow.collectAsState(initial = emptyList())
    val log by relief.logFlow.collectAsState(initial = emptyList())
    var newAilment by remember { mutableStateOf("") }
    var newMed by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        savedAilments.refresh()
        savedMedications.refresh()
        savedStrains.refresh()
        relief.refresh()
    }

    Box(modifier = modifier.fillMaxSize()) {
        MeshBackground()
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 24.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            headerRow(user?.name ?: "Patient", onDismiss = onDismiss, onSignOut = { session.signOut() })
            SavedAilmentsCard(
                ailments = ailments,
                newValue = newAilment,
                onNewChange = { newAilment = it },
                onAdd = {
                    val v = newAilment.trim()
                    if (v.isNotEmpty()) {
                        scope.launch { savedAilments.add(v) }
                        newAilment = ""
                    }
                },
                onRemove = { name -> scope.launch { savedAilments.remove(name) } },
                onFindFor = { names ->
                    nav.openFind(ailments = names)
                    onDismiss()
                },
            )
            SavedMedicationsCard(
                medications = medications.map { it.name },
                newValue = newMed,
                onNewChange = { newMed = it },
                onAdd = {
                    val v = newMed.trim()
                    if (v.isNotEmpty()) {
                        scope.launch {
                            savedMedications.set(
                                medications + com.strainwise.app.data.SavedMedication(
                                    id = "",
                                    name = v,
                                    addedAt = System.currentTimeMillis(),
                                ),
                            )
                        }
                        newMed = ""
                    }
                },
                onRemove = { name ->
                    scope.launch {
                        savedMedications.set(medications.filterNot { it.name == name })
                    }
                },
            )
            SavedStrainsView(
                saved = saved,
                onOpen = onOpenStrain,
                onRemove = { slug -> scope.launch { savedStrains.remove(slug) } },
            )
            ReliefHistoryView(log = log)
            PastResearchCard(onOpen = onOpenPastResearch)
            ComplianceFooter(
                ageStore = ageStore,
                onReset = { scope.launch { ageStore.reset() } },
            )
        }
    }
}

@Composable
private fun headerRow(
    name: String,
    onDismiss: () -> Unit,
    onSignOut: () -> Unit,
) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.18f)),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = initials(name),
                style = StrainWiseTypography.titleMedium,
                color = MaterialTheme.colorScheme.primary,
            )
        }
        Spacer(Modifier.size(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = name,
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                text = "Account",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Text(
            text = "Sign out",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier
                .clip(RoundedCornerShape(50))
                .clickable(onClick = onSignOut)
                .padding(horizontal = 12.dp, vertical = 8.dp),
        )
        Spacer(Modifier.size(8.dp))
        Icon(
            imageVector = Icons.Filled.Close,
            contentDescription = "Close",
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier
                .clip(CircleShape)
                .clickable(onClick = onDismiss)
                .padding(8.dp),
        )
    }
}

private fun initials(name: String): String {
    val parts = name.trim().split(" ").filter { it.isNotEmpty() }
    return when {
        parts.isEmpty() -> "·"
        parts.size == 1 -> parts[0].take(2).uppercase()
        else -> (parts[0].take(1) + parts[1].take(1)).uppercase()
    }
}

/** Saved ailments editor. */
@Composable
private fun SavedAilmentsCard(
    ailments: List<String>,
    newValue: String,
    onNewChange: (String) -> Unit,
    onAdd: () -> Unit,
    onRemove: (String) -> Unit,
    onFindFor: (List<String>) -> Unit,
) {
    SWCard {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            SectionLabel(title = "Your symptoms", index = 1)
            Text(
                text = "What we should treat first. Used to pick the strains in the Home rails.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (ailments.isNotEmpty()) {
                SWFlowRow {
                    ailments.forEach { name ->
                        SWChip(
                            title = name,
                            selected = true,
                            onClick = { onRemove(name) },
                        )
                    }
                }
            } else {
                Text(
                    text = "No symptoms saved yet. The Home rails fall back to the general catalog.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(
                    value = newValue,
                    onValueChange = onNewChange,
                    placeholder = { Text("Add a symptom") },
                    singleLine = true,
                    shape = RoundedCornerShape(50),
                    colors = fieldColors(),
                    modifier = Modifier.weight(1f),
                )
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.primary)
                        .clickable(onClick = onAdd),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = Icons.Filled.Add,
                        contentDescription = "Add",
                        tint = MaterialTheme.colorScheme.onPrimary,
                    )
                }
            }
            if (ailments.isNotEmpty()) {
                SWPrimaryButton(
                    title = "Find for these",
                    onClick = { onFindFor(ailments) },
                )
            }
        }
    }
}

/** Saved medications editor. */
@Composable
private fun SavedMedicationsCard(
    medications: List<String>,
    newValue: String,
    onNewChange: (String) -> Unit,
    onAdd: () -> Unit,
    onRemove: (String) -> Unit,
) {
    SWCard {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            SectionLabel(title = "Medications", index = 2)
            Text(
                text = "Helps the AI callables warn about interactions, never auto-recommends stopping a prescription.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (medications.isNotEmpty()) {
                SWFlowRow {
                    medications.forEach { name ->
                        SWChip(
                            title = name,
                            selected = true,
                            onClick = { onRemove(name) },
                        )
                    }
                }
            } else {
                Text(
                    text = "No medications saved yet.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(
                    value = newValue,
                    onValueChange = onNewChange,
                    placeholder = { Text("Add a medication") },
                    singleLine = true,
                    shape = RoundedCornerShape(50),
                    colors = fieldColors(),
                    modifier = Modifier.weight(1f),
                )
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.primary)
                        .clickable(onClick = onAdd),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = Icons.Filled.Add,
                        contentDescription = "Add",
                        tint = MaterialTheme.colorScheme.onPrimary,
                    )
                }
            }
        }
    }
}

/**
 * Public Saved Strains sheet. Direct port of the iOS
 * `SavedStrainsView` sheet (the iOS app pops it from the
 * home toolbar heart). The Android app already had the same
 * content inlined in [AccountView] as a private composable;
 * this version is the standalone "favorites only" sheet that
 * the shell's heart button now targets.
 */
@Composable
fun SavedStrainsSheet(
    savedStrains: com.strainwise.app.data.SavedStrainsStore,
    onOpen: (com.strainwise.app.models.StrainProfile) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val saved by savedStrains.savedFlow.collectAsState(initial = emptyList())
    val scope = rememberCoroutineScope()
    LaunchedEffect(Unit) { savedStrains.refresh() }
    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        androidx.compose.foundation.layout.Row(
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "Saved strains",
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onBackground,
                modifier = Modifier.weight(1f),
            )
            androidx.compose.material3.IconButton(onClick = onDismiss) {
                androidx.compose.material3.Icon(
                    imageVector = Icons.Filled.Close,
                    contentDescription = "Close",
                    tint = MaterialTheme.colorScheme.onSurface,
                )
            }
        }
        SavedStrainsList(
            saved = saved,
            onOpen = onOpen,
            onRemove = { slug -> scope.launch { savedStrains.remove(slug) } },
        )
    }
}

/** Saved strains list. */
@Composable
private fun SavedStrainsList(
    saved: List<SavedStrain>,
    onOpen: (com.strainwise.app.models.StrainProfile) -> Unit,
    onRemove: (String) -> Unit,
) {
    if (saved.isEmpty()) {
        SWCard {
            Text(
                text = "Tap the heart on a strain to save it here.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        return
    }
    SWCard {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            SectionLabel(title = "Saved strains", index = 1)
            saved.take(16).forEach { item ->
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Box(modifier = Modifier.weight(1f)) {
                        StrainPoster(
                            profile = item.toProfile(),
                            onClick = { onOpen(item.toProfile()) },
                        )
                    }
                    Icon(
                        imageVector = Icons.Filled.Close,
                        contentDescription = "Remove ${item.name}",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier
                            .clip(CircleShape)
                            .clickable { onRemove(item.slug) }
                            .padding(8.dp),
                    )
                }
            }
        }
    }
}

/** Backwards-compatible private alias for the inlined
 *  card inside [AccountView]. */
@Composable
private fun SavedStrainsView(
    saved: List<SavedStrain>,
    onOpen: (com.strainwise.app.models.StrainProfile) -> Unit,
    onRemove: (String) -> Unit,
) = SavedStrainsList(saved, onOpen, onRemove)

/** Relief log history. */
@Composable
private fun ReliefHistoryView(log: List<ReliefLog>) {
    if (log.isEmpty()) return
    SWCard {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            SectionLabel(title = "Relief log", index = 4)
            log.takeLast(5).reversed().forEach { entry ->
                Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.primary)
                            .padding(top = 6.dp),
                    )
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = entry.strainName,
                            style = StrainWiseTypography.titleSmall,
                            color = MaterialTheme.colorScheme.onSurface,
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(
                                text = entry.fit.label,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface,
                            )
                            Text(
                                text = "${entry.relief}/5 relief",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        if (entry.conditions.isNotEmpty()) {
                            Text(
                                text = "for ${entry.conditions.joinToString(", ")}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        if (entry.note.isNotEmpty()) {
                            Text(
                                text = entry.note,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface,
                            )
                        }
                        if (entry.createdAt > 0) {
                            Text(
                                text = formatReliefDate(entry.createdAt),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }
        }
    }
}

private fun formatReliefDate(millis: Long): String {
    if (millis <= 0) return ""
    val date = java.util.Date(millis)
    val format = java.text.SimpleDateFormat("MMM d", java.util.Locale.getDefault())
    return format.format(date)
}

/** Compliance footer. */
@Composable
private fun ComplianceFooter(
    ageStore: AgeVerificationStore,
    onReset: () -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Eyebrow(text = "Compliance")
        Text(
            text = "StrainEase is a research tool. It does not sell or dispense cannabis products. Verification expires every 30 days.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            text = "Reset age verification",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier
                .clip(RoundedCornerShape(50))
                .clickable(onClick = onReset)
                .padding(horizontal = 12.dp, vertical = 8.dp),
        )
    }
}

/**
 * Entry point to the Past Research list. The iOS app exposes
 * this as a row in the Account sheet that pushes the full
 * `ResearchHistoryView`; on Android the shell hosts the screen
 * in a [androidx.compose.material3.ModalBottomSheet] from
 * `MainTabView`, so the card just fires the open callback.
 */
@Composable
private fun PastResearchCard(onOpen: () -> Unit) {
    SWCard {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            SectionLabel(title = "Past research", index = 5)
            Text(
                text = "Reopen a Find or Compare result you closed.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            SWPrimaryButton(
                title = "View past research",
                onClick = onOpen,
            )
        }
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
