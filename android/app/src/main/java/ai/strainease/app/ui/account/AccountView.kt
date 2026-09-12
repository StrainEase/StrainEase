package ai.strainease.app.ui.account

import ai.strainease.app.app.AccountDestination
import ai.strainease.app.app.LocalAppNavigation
import ai.strainease.app.auth.LocalAuthSession
import ai.strainease.app.compliance.AgeVerificationStore
import ai.strainease.app.data.ReliefLogStore
import ai.strainease.app.data.CheckInStore
import ai.strainease.app.data.SavedAilmentsStore
import ai.strainease.app.data.SavedMedicationsStore
import ai.strainease.app.data.SavedStrain
import ai.strainease.app.data.SavedStrainsStore
import ai.strainease.app.data.ThcSensitivity
import ai.strainease.app.data.ThcSensitivityStore
import ai.strainease.app.models.Conditions
import ai.strainease.app.ui.checkin.CheckInPanel
import ai.strainease.app.ui.compare.CompareSelectionStore
import ai.strainease.app.ui.components.Eyebrow
import ai.strainease.app.ui.components.MeshBackground
import ai.strainease.app.ui.components.SWCard
import ai.strainease.app.ui.components.SWChip
import ai.strainease.app.ui.components.SWChipWithRemove
import ai.strainease.app.ui.components.SWFlowRow
import ai.strainease.app.ui.components.SWPrimaryButton
import ai.strainease.app.ui.components.SectionLabel
import ai.strainease.app.ui.home.StrainPoster
import ai.strainease.app.ui.theme.StrainEaseTypography
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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.gestures.snapping.rememberSnapFlingBehavior
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Mood
import androidx.compose.material.icons.filled.RadioButtonChecked
import androidx.compose.material.icons.filled.RadioButtonUnchecked
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch

/**
 * Account / Settings sheet. Mirrors the iOS `AccountView.swift`
 * layout end-to-end: a "SETTINGS" eyebrow, the user's display
 * name in big serif text, a sign-out caption, and then a vertical
 * stack of settings cards ordered exactly like iOS — Display
 * name, Ailments (chip grid from [Conditions.catalog]), THC
 * sensitivity, Medications, then three row cards (Past research,
 * Relief history, Daily check-in) that open dedicated sub-pages,
 * then the Clinician report row, the Account info card, the
 * Reset age verification row, and finally a full-width green
 * Sign out button at the bottom.
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
    val sessionBusy by session.isBusy.collectAsState()
    val nav = LocalAppNavigation.current
    val scope = rememberCoroutineScope()
    val ailments by savedAilments.ailmentsFlow.collectAsState(initial = emptyList())
    val medications by savedMedications.medicationsFlow.collectAsState(initial = emptyList())
    val saved by savedStrains.savedFlow.collectAsState(initial = emptyList())
    var newMed by remember { mutableStateOf("") }
    var draftName by remember(user?.name) { mutableStateOf(user?.name.orEmpty()) }
    var nameSaved by remember { mutableStateOf(false) }
    var nameSaving by remember { mutableStateOf(false) }
    var showResetConfirm by remember { mutableStateOf(false) }

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
                .statusBarsPadding(),
        ) {
            // Pinned top bar — the ModalBottomSheet's own drag handle
            // sits above this row, so "Account settings" stays visible
            // as the user scrolls through the cards below, mirroring
            // the iOS sheet title that is always pinned at the top.
            AccountSheetTopBar(onDismiss = onDismiss)
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 20.dp)
                    .padding(top = 4.dp, bottom = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                headerRow(
                    userName = user?.name?.trim()?.takeIf { it.isNotEmpty() } ?: "Patient",
                )
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
                                nameSaved = session.errorMessage.value == null
                            }
                        }
                    },
                )
                SavedAilmentsCard(
                    selected = ailments,
                    onToggle = { name ->
                        scope.launch {
                            if (ailments.any { it.equals(name, ignoreCase = true) }) {
                                savedAilments.remove(name)
                            } else {
                                savedAilments.add(name)
                            }
                        }
                    },
                    onFindFor = { names ->
                        nav.openFind(ailments = names)
                        onDismiss()
                    },
                )
                ThcSensitivityCard(
                    value = thcSensitivity.sensitivity,
                    isBusy = thcSensitivity.isBusy,
                    onSelect = { value -> scope.launch { thcSensitivity.set(value) } },
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
                SavedStrainsView(
                    saved = saved,
                    onOpen = onOpenStrain,
                    onRemove = { slug -> scope.launch { savedStrains.remove(slug) } },
                )
                NavRowCard(
                    title = "Past research",
                    subtitle = "Reopen a find or comparison",
                    icon = Icons.Filled.History,
                    onClick = {
                        nav.openAccountDestination(AccountDestination.PastResearch)
                    },
                )
                NavRowCard(
                    title = "Relief history",
                    subtitle = "How strains actually went for you",
                    icon = Icons.Filled.Refresh,
                    onClick = {
                        nav.openAccountDestination(AccountDestination.ReliefHistory)
                    },
                )
                NavRowCard(
                    title = "Daily check-in",
                    subtitle = "Mood, sleep, pain, and anxiety over time",
                    icon = Icons.Filled.Mood,
                    onClick = {
                        nav.openAccountDestination(AccountDestination.DailyCheckIn)
                    },
                )
                ClinicianReportCard(onOpen = onOpenClinicianReport)
                AccountInfoCard(
                    email = user?.email,
                    ageStore = ageStore,
                )
                ResetAgeVerificationCard(
                    onClick = { showResetConfirm = true },
                )
                SWPrimaryButton(
                    title = if (sessionBusy) "Signing out…" else "Sign out",
                    icon = Icons.AutoMirrored.Filled.Logout,
                    onClick = { scope.launch { session.signOut() } },
                    isBusy = sessionBusy,
                    enabled = !sessionBusy,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }
    }

    if (showResetConfirm) {
        androidx.compose.material3.AlertDialog(
            onDismissRequest = { showResetConfirm = false },
            title = { Text("Reset age verification?") },
            text = {
                Text("The next user of this device will need to verify their own date of birth.")
            },
            confirmButton = {
                androidx.compose.material3.TextButton(onClick = {
                    showResetConfirm = false
                    scope.launch {
                        ageStore.reset()
                        onDismiss()
                    }
                }) {
                    Text("Reset")
                }
            },
            dismissButton = {
                androidx.compose.material3.TextButton(onClick = { showResetConfirm = false }) {
                    Text("Cancel")
                }
            },
        )
    }
}

/**
 * iOS-style header. "SETTINGS" eyebrow pill at the top, the user's
 * display name in big serif text (centered, displayLarge = 40sp),
 * and a one-line helper. The Close pill and "Account settings"
 * title are pinned in [AccountSheetTopBar] above this header so
 * the title is always visible while the user scrolls through the
 * cards below, mirroring the iOS sheet.
 */
@Composable
private fun headerRow(userName: String) {
    Column(
        verticalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 16.dp),
    ) {
        // Eyebrow pill, left-aligned to match the big serif name.
        Eyebrow(text = "Settings")
        Text(
            text = userName,
            style = StrainEaseTypography.displayLarge.copy(
                fontSize = 44.sp,
                fontWeight = androidx.compose.ui.text.font.FontWeight.Light,
            ),
            color = MaterialTheme.colorScheme.onBackground,
            textAlign = androidx.compose.ui.text.style.TextAlign.Start,
            modifier = Modifier.fillMaxWidth(),
        )
        Text(
            text = "Update how your name appears on notes you share, or sign out.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = androidx.compose.ui.text.style.TextAlign.Start,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

/**
 * Pinned top bar for the Account sheet. Renders the iOS-style
 * "Close" pill on the left and the centered "Account settings"
 * title. Sits above the scrollable column so the title stays
 * visible while the cards scroll, matching the iOS sheet header.
 *
 * The title is centered between the Close pill (left) and a
 * matching-width Spacer (right) so the title is visually
 * centered on the sheet, not the Row's midpoint.
 */
@Composable
private fun AccountSheetTopBar(onDismiss: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        contentAlignment = Alignment.Center,
    ) {
        // Title sits in the Box's true center; the Close pill
        // overlays at the start. The Close pill has its own
        // transparent padding around it, so it does not visually
        // collide with the title even when the title is short.
        Text(
            text = "Account settings",
            style = MaterialTheme.typography.titleMedium.copy(
                fontWeight = androidx.compose.ui.text.font.FontWeight.SemiBold,
            ),
            color = MaterialTheme.colorScheme.onBackground,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            modifier = Modifier.fillMaxWidth(),
        )
        Box(
            modifier = Modifier.align(Alignment.CenterStart),
        ) {
            ClosePillButton(onClick = onDismiss)
        }
    }
}

@Composable
private fun ClosePillButton(onClick: () -> Unit) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(50))
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 8.dp),
    ) {
        Icon(
            imageVector = Icons.Filled.Close,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(14.dp),
        )
        Text(
            text = "Close",
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.primary,
        )
    }
}

/**
 * Saved ailments editor. Mirrors the iOS `SavedAilmentsCard`
 * exactly: a chip grid sourced from [Conditions.catalog], no
 * free-text input. Tapping a chip toggles its saved state; the
 * "Find for these" button at the bottom pushes the same ailments
 * list into the Find tab via `AppNavigation.openFind`.
 */
@Composable
private fun SavedAilmentsCard(
    selected: List<String>,
    onToggle: (String) -> Unit,
    onFindFor: (List<String>) -> Unit,
) {
    val selectedSet = remember(selected) { selected.map { it.lowercase() }.toSet() }
    SWCard {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    SectionLabel(title = "Your ailments")
                    Text(
                        text = "Saved so Find and Home can jump back to them.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                if (selected.isNotEmpty()) {
                    Text(
                        text = "Find for these",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier
                            .clip(RoundedCornerShape(50))
                            .clickable { onFindFor(selected) }
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                    )
                }
            }
            SWFlowRow {
                Conditions.catalog.forEach { name ->
                    val isSelected = selectedSet.contains(name.lowercase())
                    SWChip(
                        title = name,
                        selected = isSelected,
                        onClick = { onToggle(name) },
                    )
                }
            }
        }
    }
}

/**
 * Saved medications editor. Free-text add + chip list with
 * per-chip remove. The iOS counterpart uses an autocomplete
 * against the FDA label corpus; on Android we keep the simple
 * add field for now (the autocomplete widget from PR #260
 * already lives in `ui/components/MedicationAutocomplete.kt`
 * and is available as a drop-in replacement in a follow-up).
 */
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
            SectionLabel(title = "Medications", index = 3)
            Text(
                text = "Helps the AI callables warn about interactions, never auto-recommends stopping a prescription.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (medications.isNotEmpty()) {
                SWFlowRow {
                    medications.forEach { name ->
                        SWChipWithRemove(
                            title = name,
                            onRemove = { onRemove(name) },
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
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
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
 * home toolbar heart).
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
        Row(verticalAlignment = Alignment.CenterVertically) {
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
    val pages: List<List<SavedStrain>> = remember(saved) {
        saved.chunked(6)
    }
    var currentPage by remember(pages.size) { mutableIntStateOf(0) }
    val listState = rememberLazyListState()
    SWCard {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            SectionLabel(title = "Saved strains", index = 1)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(360.dp)
                    .clip(RoundedCornerShape(22.dp))
                    .background(MaterialTheme.colorScheme.surface)
                    .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(22.dp)),
            ) {
                LazyRow(
                    contentPadding = PaddingValues(0.dp),
                    state = listState,
                    flingBehavior = rememberSnapFlingBehavior(lazyListState = listState),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    items(items = pages, key = { it.firstOrNull()?.slug ?: it.hashCode().toString() }) { page ->
                        SavedStrainsGrid(
                            page = page,
                            onOpen = onOpen,
                            onRemove = onRemove,
                            compareStore = compareStore,
                            modifier = Modifier.fillParentMaxWidth(),
                        )
                    }
                }
            }
            if (pages.size > 1) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    pages.indices.forEach { index ->
                        val active = index == currentPage
                        Box(
                            modifier = Modifier
                                .padding(horizontal = 4.dp)
                                .size(7.dp)
                                .clip(RoundedCornerShape(50))
                                .background(
                                    if (active) MaterialTheme.colorScheme.onSurface
                                    else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.38f),
                                )
                                .clickable { currentPage = index },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SavedStrainsGrid(
    page: List<SavedStrain>,
    onOpen: (ai.strainease.app.models.StrainProfile) -> Unit,
    onRemove: (String) -> Unit,
    compareStore: CompareSelectionStore?,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        page.chunked(2).forEach { rowItems ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                rowItems.forEach { item ->
                    Box(modifier = Modifier.weight(1f)) {
                        StrainPoster(
                            profile = item.toProfile(),
                            onClick = { onOpen(item.toProfile()) },
                            compareStore = compareStore,
                        )
                        Icon(
                            imageVector = Icons.Filled.Close,
                            contentDescription = "Remove ${item.name}",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.85f))
                                .clickable { onRemove(item.slug) }
                                .padding(4.dp)
                                .size(18.dp),
                        )
                    }
                }
                if (rowItems.size == 1) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun SavedStrainsView(
    saved: List<SavedStrain>,
    onOpen: (ai.strainease.app.models.StrainProfile) -> Unit,
    onRemove: (String) -> Unit,
    compareStore: CompareSelectionStore? = null,
) = SavedStrainsList(saved, onOpen, onRemove, compareStore)

/**
 * Generic row card used for the Past research / Relief
 * history / Daily check-in / Clinician report / Reset age
 * destinations. Mirrors the iOS `NavigationLink { SWCard {
 * HStack { ... chevron.right } } }` pattern in
 * `AccountView.swift`.
 */
@Composable
private fun NavRowCard(
    title: String,
    subtitle: String,
    icon: ImageVector? = null,
    trailingIcon: ImageVector? = Icons.Filled.ChevronRight,
    onClick: () -> Unit,
) {
    SWCard(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold),
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            if (icon != null) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(18.dp),
                )
            }
            if (trailingIcon != null) {
                Icon(
                    imageVector = trailingIcon,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(16.dp),
                )
            }
        }
    }
}

/** Display name editor. Mirrors the iOS AccountView's
 *  `displayName` block so the user can rename themselves
 *  without leaving the settings sheet. */
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

/** Account info card. Email / Account / Age verified. */
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

/**
 * Reset age verification row. Mirrors the iOS
 * "Reset age verification" NavigationLink-style card with the
 * "Use this on a shared device between users." subtitle and
 * the chevron-right trailing icon.
 */
@Composable
private fun ResetAgeVerificationCard(onClick: () -> Unit) {
    NavRowCard(
        title = "Reset age verification",
        subtitle = "Use this on a shared device between users.",
        icon = null,
        trailingIcon = Icons.Filled.ChevronRight,
        onClick = onClick,
    )
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
 * dedicated report screen.
 */
@Composable
private fun ClinicianReportCard(onOpen: () -> Unit) {
    NavRowCard(
        title = "Clinician report",
        subtitle = "A one-page PDF for your doctor",
        icon = Icons.Filled.Description,
        trailingIcon = Icons.Filled.ChevronRight,
        onClick = onOpen,
    )
}

/** THC sensitivity picker. */
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
                text = "Calibrates the strain descriptions and recommendations Kaya writes for you. Pick the closest match, or leave it off for the default read.",
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
