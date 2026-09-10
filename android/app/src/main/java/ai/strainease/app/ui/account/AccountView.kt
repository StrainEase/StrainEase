package ai.strainease.app.ui.account

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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.RadioButtonChecked
import androidx.compose.material.icons.filled.RadioButtonUnchecked
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
import ai.strainease.app.app.LocalAppNavigation
import ai.strainease.app.auth.LocalAuthSession
import ai.strainease.app.compliance.AgeVerificationStore
import ai.strainease.app.data.ReliefLog
import ai.strainease.app.data.ReliefLogStore
import ai.strainease.app.data.CheckInStore
import ai.strainease.app.ui.checkin.CheckInPanel
import ai.strainease.app.data.SavedAilmentsStore
import ai.strainease.app.data.SavedMedicationsStore
import ai.strainease.app.data.ThcSensitivity
import ai.strainease.app.data.ThcSensitivityStore
import ai.strainease.app.data.SavedStrain
import ai.strainease.app.data.SavedStrainsStore
import ai.strainease.app.models.Conditions
import ai.strainease.app.ui.components.Eyebrow
import ai.strainease.app.ui.components.MeshBackground
import ai.strainease.app.ui.components.SWCard
import ai.strainease.app.ui.components.SWChip
import ai.strainease.app.ui.components.SWErrorBanner
import ai.strainease.app.ui.components.SWFlowRow
import ai.strainease.app.ui.components.SWPrimaryButton
import ai.strainease.app.ui.components.SectionLabel
import ai.strainease.app.ui.components.TypeBadge
import ai.strainease.app.ui.compare.CompareSelectionStore
import ai.strainease.app.ui.home.StrainPoster
import ai.strainease.app.ui.theme.StrainEaseTypography
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
    thcSensitivity: ThcSensitivityStore,
    savedStrains: SavedStrainsStore,
    relief: ReliefLogStore,
    checkIns: CheckInStore,
    ageStore: AgeVerificationStore,
    onDismiss: () -> Unit,
    onOpenStrain: (ai.strainease.app.models.StrainProfile) -> Unit,
    onOpenClinicianReport: () -> Unit = {},
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
    // Display name editor state. Mirrors the iOS AccountView's
    // `displayName` block: text field bound to a draft, save
    // action calls AuthSession.updateDisplayName, and a one-shot
    // "Display name updated." confirmation surfaces after a
    // successful save.
    var draftName by remember(user?.name) { mutableStateOf(user?.name.orEmpty()) }
    var nameSaved by remember { mutableStateOf(false) }
    var nameSaving by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        savedAilments.refresh()
        savedMedications.refresh()
        savedStrains.refresh()
        relief.refresh()
        checkIns.refresh()
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
            // Display name editor — matches the iOS AccountView's
            // `displayName` SWCard so the user can rename themselves
            // without leaving the settings sheet. iOS shows the
            // field as a TextField in a tinted rounded rect; we use
            // OutlinedTextField for a Material 3 look.
            DisplayNameCard(
                draft = draftName,
                onDraftChange = {
                    draftName = it
                    nameSaved = false
                },
                saving = nameSaving,
                justSaved = nameSaved,
                onSave = {
                    val trimmed = draftName.trim()
                    if (trimmed.isNotEmpty() && trimmed != user?.name.orEmpty()) {
                        nameSaving = true
                        scope.launch {
                            session.updateDisplayName(trimmed)
                            nameSaving = false
                            nameSaved = session.errorMessage == null
                        }
                    }
                },
            )
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
                                medications + ai.strainease.app.data.SavedMedication(
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
            ThcSensitivityCard(
                value = thcSensitivity.sensitivity,
                isBusy = thcSensitivity.isBusy,
                onSelect = { value -> scope.launch { thcSensitivity.set(value) } },
            )
            SavedStrainsView(
                saved = saved,
                onOpen = onOpenStrain,
                onRemove = { slug -> scope.launch { savedStrains.remove(slug) } },
            )
            SWCard {
                CheckInPanel(store = checkIns, compact = true)
            }
            ReliefHistoryView(log = log)
            ClinicianReportCard(onOpen = onOpenClinicianReport)
            // Account info card — email + account type + age
            // verification status, matching the iOS AccountView's
            // "Email / Account / Age verified" SWCard. iOS shows
            // these as labeled rows; the Android side uses the
            // same SWCard + SectionLabel + label-row pattern as
            // the other settings cards so the three platforms
            // read identically.
            AccountInfoCard(
                email = user?.email,
                ageStore = ageStore,
            )
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
                style = StrainEaseTypography.titleMedium,
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
    savedStrains: ai.strainease.app.data.SavedStrainsStore,
    onOpen: (ai.strainease.app.models.StrainProfile) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
    compareStore: CompareSelectionStore? = null,
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
            compareStore = compareStore,
        )
    }
}

/** Saved strains list. */
@Composable
private fun SavedStrainsList(
    saved: List<SavedStrain>,
    onOpen: (ai.strainease.app.models.StrainProfile) -> Unit,
    onRemove: (String) -> Unit,
    compareStore: CompareSelectionStore? = null,
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
                            compareStore = compareStore,
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
    onOpen: (ai.strainease.app.models.StrainProfile) -> Unit,
    onRemove: (String) -> Unit,
    compareStore: CompareSelectionStore? = null,
) = SavedStrainsList(saved, onOpen, onRemove, compareStore)

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
                            style = StrainEaseTypography.titleSmall,
                            color = MaterialTheme.colorScheme.onSurface,
                        )
                        Text(
                            text = entry.notes,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Text(
                        text = "★".repeat(entry.rating),
                        style = StrainEaseTypography.labelMedium,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
            }
        }
    }
}

/** Display name editor. Mirrors the iOS AccountView's
 *  `displayName` block so the user can rename themselves without
 *  leaving the settings sheet. iOS uses a tinted rounded-rect
 *  TextField; we use Material 3 OutlinedTextField. The save
 *  button only fires when the trimmed draft differs from the
 *  current name and is non-empty, mirroring iOS. */
@Composable
private fun DisplayNameCard(
    draft: String,
    onDraftChange: (String) -> Unit,
    saving: Boolean,
    justSaved: Boolean,
    onSave: () -> Unit,
) {
    SWCard {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            SectionLabel(title = "Display name")
            OutlinedTextField(
                value = draft,
                onValueChange = onDraftChange,
                placeholder = { Text("Display name") },
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = MaterialTheme.colorScheme.surface,
                    unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                ),
                modifier = Modifier.fillMaxWidth(),
            )
            Text(
                text = "Shown next to notes you mark public on a strain's page.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (justSaved) {
                Text(
                    text = "Display name updated.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.primary,
                )
            }
            SWPrimaryButton(
                title = if (saving) "Saving…" else "Save display name",
                onClick = onSave,
                enabled = !saving && draft.isNotBlank(),
            )
        }
    }
}

/** Account info card. Mirrors the iOS AccountView's
 *  "Email / Account / Age verified" SWCard. Shows the
 *  signed-in email, the account type line, and the age
 *  verification region + minimum age (or "Not on this
 *  device" if the user hasn't verified). */
@Composable
private fun AccountInfoCard(
    email: String?,
    ageStore: AgeVerificationStore,
) {
    SWCard {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            SectionLabel(title = "Account")
            LabeledRow(label = "Email", value = email ?: "Not on file")
            LabeledRow(
                label = "Account",
                value = "Same Firebase login as the web app",
            )
            val ageStatus = if (ageStore.isVerified) {
                val region = ageStore.region?.label ?: "—"
                val min = ageStore.region?.minimumAge ?: 21
                "$region (${min}+)"
            } else {
                "Not on this device"
            }
            LabeledRow(label = "Age verified", value = ageStatus)
        }
    }
}

@Composable
private fun LabeledRow(label: String, value: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(
            text = label,
            style = StrainEaseTypography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.width(120.dp),
        )
        Text(
            text = value,
            style = StrainEaseTypography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface,
        )
    }
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

/**
 * Entry point on the Account sheet for the Clinician Report PDF.
 * Tapping the card dismisses the account sheet and opens the
 * dedicated report screen (which builds the PDF on the server and
 * hands it to the system PDF viewer). Mirrors the iOS
 * `ClinicianReportView` NavigationLink in `AccountView.swift`.
 */
@Composable
private fun ClinicianReportCard(onOpen: () -> Unit) {
    SWCard(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onOpen),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            androidx.compose.foundation.layout.Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text(
                    text = "Clinician report",
                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold),
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Text(
                    text = "A one-page PDF for your doctor",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Icon(
                imageVector = Icons.Filled.Description,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
            )
            Icon(
                imageVector = Icons.Filled.ChevronRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

/** THC sensitivity picker. Mirrors the iOS `ThcSensitivityCard`
 *  and the web `AccountSettingsDialog` chip row, so the same pick
 *  in any client survives a round-trip through `users/{uid}`. */
@Composable
private fun ThcSensitivityCard(
    value: ThcSensitivity,
    isBusy: Boolean,
    onSelect: (ThcSensitivity) -> Unit,
) {
    SWCard {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            SectionLabel(title = "THC sensitivity", index = 4)
            Text(
                text = "Calibrates the strain descriptions and recommendations Kaya writes for you. Pick the closest match, or leave it on Typical for the default read.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            ThcSensitivity.values().forEach { option ->
                val isSelected = value == option
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(
                            if (isSelected) MaterialTheme.colorScheme.primary.copy(alpha = 0.10f)
                            else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f)
                        )
                        .clickable(enabled = !isBusy) { onSelect(option) }
                        .padding(horizontal = 12.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalAlignment = Alignment.Top,
                ) {
                    Icon(
                        imageVector = if (isSelected) Icons.Filled.RadioButtonChecked else Icons.Filled.RadioButtonUnchecked,
                        contentDescription = null,
                        tint = if (isSelected) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(
                            text = option.label,
                            style = MaterialTheme.typography.titleSmall,
                            color = if (isSelected) MaterialTheme.colorScheme.primary
                                else MaterialTheme.colorScheme.onSurface,
                        )
                        if (option.hint != null) {
                            Text(
                                text = option.hint!!,
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
