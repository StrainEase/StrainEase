package ai.strainease.app.ui.discover

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.gestures.snapping.rememberSnapFlingBehavior
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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Compare
import androidx.compose.material.icons.filled.Star
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import ai.strainease.app.data.ReliefLogStore
import ai.strainease.app.data.SavedAilmentsStore
import ai.strainease.app.data.SavedMedicationsStore
import ai.strainease.app.data.TriedStrain
import ai.strainease.app.data.TriedStrainsStore
import ai.strainease.app.models.ConsumeForm
import ai.strainease.app.models.Potency
import ai.strainease.app.models.StrainProfile
import ai.strainease.app.models.ThcSensitivity
import ai.strainease.app.models.TimeOfDay
import ai.strainease.app.models.RecommendationResult
import ai.strainease.app.models.StrainRecommendation
import ai.strainease.app.util.toTitleCase
import ai.strainease.app.ui.compare.CompareResultsView
import ai.strainease.app.ui.compare.CompareSelectionStore
import ai.strainease.app.ui.components.Eyebrow
import ai.strainease.app.ui.components.MedicationAutocomplete
import ai.strainease.app.ui.components.MeshBackground
import ai.strainease.app.ui.components.SWCard
import ai.strainease.app.ui.components.SWChip
import ai.strainease.app.ui.components.SWErrorBanner
import ai.strainease.app.ui.components.SWField
import ai.strainease.app.ui.components.SWFlowRow
import ai.strainease.app.ui.components.SWPrimaryButton
import ai.strainease.app.ui.components.SectionLabel
import ai.strainease.app.ui.components.StrainAutocomplete
import ai.strainease.app.ui.components.StrainPhoto
import ai.strainease.app.ui.components.TypeBadge
import ai.strainease.app.ui.home.StrainPoster
import ai.strainease.app.ui.theme.StrainEaseTypography
import kotlinx.coroutines.launch

/**
 * The Discover tab. 1:1 port of the iOS `DiscoverView` with a slightly
 * slimmer surface for the first Android cut: the hero, the
 * symptom picker (catalog chips + custom add), the prefs
 * panels (potency, time of day, consume form, THC sensitivity,
 * owned strains, medications, patient note), the "Find
 * recommendations" primary button, the error banner, and the
 * recommendation results block.
 *
 * Search-by-name and the compare-tray live in PR-A10; the
 * 30-second "tonight hint" relief-log card lives here.
 */
@Composable
fun DiscoverView(
    model: DiscoverModel,
    savedAilments: SavedAilmentsStore,
    savedMedications: SavedMedicationsStore,
    triedStrainsStore: TriedStrainsStore,
    relief: ReliefLogStore,
    compareStore: CompareSelectionStore,
    researchHistory: ai.strainease.app.data.ResearchHistoryStore,
    modifier: Modifier = Modifier,
    onOpenProfile: (StrainProfile) -> Unit = {},
) {
    val ailments by model.ailments.collectAsState()
    val prefs by model.prefs.collectAsState()
    val potency by model.potency.collectAsState()
    val customAilment by model.customAilment.collectAsState()
    val result by model.result.collectAsState()
    val isRunning by model.isRunning.collectAsState()
    val error by model.errorMessage.collectAsState()
    val comparison by compareStore.comparison.collectAsState()
    val scope = rememberCoroutineScope()

    // Tried strains and medications state
    var triedStrainsList by remember { mutableStateOf<List<TriedStrain>>(emptyList()) }
    var medicationsList by remember { mutableStateOf<List<String>>(emptyList()) }
    var showSavePrompt by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        model.hydrateAilmentsIfNeeded(savedAilments)
        savedAilments.refresh()
        savedMedications.refresh()
        triedStrainsStore.refresh()
    }

    // Hydrate tried strains and medications from profile
    LaunchedEffect(triedStrainsStore.triedStrains) {
        if (triedStrainsList.isEmpty() && triedStrainsStore.triedStrains.isNotEmpty()) {
            triedStrainsList = triedStrainsStore.triedStrains
        }
    }
    LaunchedEffect(savedMedications.medications) {
        if (medicationsList.isEmpty() && savedMedications.medications.isNotEmpty()) {
            medicationsList = savedMedications.medications.map { it.name }
        }
    }

    // Keep the picked ailments in sync with the
    // SavedAilmentsStore so symptoms the user added via
    // AccountView show up here. Mirrors iOS DiscoverView's
    // ailmentsStore observation. (Hydrate on first frame so
    // the user doesn't see an empty list when their saved
    // ailments aren't yet in the model.)
    val savedAilmentsFlow by savedAilments.ailmentsFlow.collectAsState(initial = emptyList())
    LaunchedEffect(savedAilmentsFlow) {
        model.hydrateAilmentsIfNeeded(savedAilments)
    }

    // Cross-tab handoffs from the Account sheet. The
    // `nav.pendingFindAilments` slot is set by the "Find for
    // these" button on the saved-ailments card; the
    // `nav.pendingResearch` slot is set when the user opens a
    // Past-research entry. Both fire once and clear.
    val nav = ai.strainease.app.app.LocalAppNavigation.current
    val pendingAilments = nav.pendingFindAilments
    LaunchedEffect(pendingAilments) {
        if (pendingAilments.isNotEmpty()) {
            model.applyAilments(pendingAilments, replace = true)
            nav.consumeFindAilments()
        }
    }
    val pendingResearch = nav.pendingResearch
    LaunchedEffect(pendingResearch) {
        when (val r = pendingResearch) {
            is ai.strainease.app.app.RestoredResearch.Find -> {
                model.applyRestored(r.result, r.conditions)
                nav.consumeResearch()
            }
            is ai.strainease.app.app.RestoredResearch.Compare -> {
                compareStore.setComparison(r.comparison)
                nav.consumeResearch()
            }
            null -> Unit
        }
    }

    // Check if there are unsaved changes
    val hasUnsavedChanges = remember(triedStrainsList, medicationsList, triedStrainsStore.triedStrains, savedMedications.medications) {
        val savedTriedStrainsNames = triedStrainsStore.triedStrains.map { it.name.lowercase() }.toSet()
        val currentTriedStrainsNames = triedStrainsList.map { it.name.lowercase() }.toSet()
        val triedStrainsDiffer = triedStrainsList.size != triedStrainsStore.triedStrains.size ||
                currentTriedStrainsNames != savedTriedStrainsNames

        val savedMedsNames = savedMedications.medications.map { it.name.lowercase() }.toSet()
        val currentMedsNames = medicationsList.map { it.lowercase() }.toSet()
        val medsDiffer = medicationsList.size != savedMedications.medications.size ||
                currentMedsNames != savedMedsNames

        triedStrainsDiffer || medsDiffer
    }

    // Save to profile
    val saveToProfile: suspend () -> Unit = {
        // Sync tried strains
        val savedTriedStrainsNames = triedStrainsStore.triedStrains.map { it.name.lowercase() }.toSet()
        triedStrainsList.forEach { strain ->
            if (!savedTriedStrainsNames.contains(strain.name.lowercase())) {
                triedStrainsStore.add(strain)
            }
        }
        triedStrainsStore.triedStrains.forEach { strain ->
            if (!triedStrainsList.any { it.name.lowercase() == strain.name.lowercase() }) {
                triedStrainsStore.remove(strain.id)
            }
        }
        // Sync medications
        val savedMedsNames = savedMedications.medications.map { it.name.lowercase() }.toSet()
        medicationsList.forEach { med ->
            if (!savedMedsNames.contains(med.lowercase())) {
                savedMedications.add(ai.strainease.app.data.SavedMedication(med, null, System.currentTimeMillis()))
            }
        }
        savedMedications.medications.forEach { med ->
            if (!medicationsList.any { it.lowercase() == med.name.lowercase() }) {
                savedMedications.remove(med)
            }
        }
    }

    Box(modifier = modifier.fillMaxSize()) {
        MeshBackground()
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(28.dp),
        ) {
            hero()
            relief.tonightHint?.let { hint ->
                SWCard {
                    Text(
                        text = hint,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                }
            }
            conditionsBlock(model, ailments, customAilment)
            potencyBlock(model, potency)
            prefsBlock(
                model = model,
                prefs = prefs,
                triedStrainsList = triedStrainsList,
                onTriedStrainsChange = { triedStrainsList = it },
                medicationsList = medicationsList,
                onMedicationsChange = { medicationsList = it },
                savedMedicationNames = savedMedications.medications.map { it.name },
            )

            // Save prompt
            if (showSavePrompt && hasUnsavedChanges) {
                SWCard {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text(
                            text = "Save your tried strains and medications?",
                            style = MaterialTheme.typography.titleSmall,
                            color = MaterialTheme.colorScheme.onSurface,
                        )
                        Text(
                            text = "You added tried strains or medications here. Save them to your profile so they auto-fill on future searches.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(
                                text = "Skip",
                                style = MaterialTheme.typography.labelLarge,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.clickable { showSavePrompt = false },
                            )
                            Spacer(modifier = Modifier.weight(1f))
                            Text(
                                text = "Save",
                                style = MaterialTheme.typography.labelLarge,
                                color = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.clickable {
                                    scope.launch {
                                        saveToProfile()
                                        showSavePrompt = false
                                    }
                                },
                            )
                        }
                    }
                }
            }

            SWPrimaryButton(
                title = "Find recommendations",
                isBusy = isRunning,
                enabled = !isRunning && ailments.isNotEmpty(),
                onClick = {
                    scope.launch {
                        model.recommend(
                            savedMedications = savedMedications,
                            reliefSummary = relief.summary.takeIf { it.isNotEmpty() },
                        )
                        // Persist a Past-research row so the user
                        // can re-open this exact run from the
                        // Account sheet. Mirrors the iOS
                        // DiscoverView's `history.remember(find:)`
                        // call after a successful run.
                        model.result.value?.let { result ->
                            researchHistory.remember(
                                find = result,
                                conditions = model.searched.value,
                            )
                        }
                        // Show save prompt if there are unsaved changes
                        if (hasUnsavedChanges) {
                            showSavePrompt = true
                        }
                    }
                },
            )
            error?.let { SWErrorBanner(message = it) }
            result?.let { resultBlock(it, compareStore, onOpenProfile) }
            // Surface the cross-strain comparison result produced by
            // CompareTrayBar's "Compare" CTA. Mirrors iOS DiscoverView
            // which shows the same view inline below the
            // recommendations block.
            comparison?.let { comparison ->
                CompareResultsView(
                    comparison = comparison,
                    onOpenProfile = onOpenProfile,
                )
            }
        }
    }
}

@Composable
private fun hero() {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Eyebrow(text = "Patient research")
        Text(
            text = "What are we treating?",
            style = MaterialTheme.typography.displaySmall,
            color = MaterialTheme.colorScheme.onBackground,
        )
        Text(
            text = "Pick symptoms, set the night you need, and we'll rank strains patients actually report.",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun conditionsBlock(
    model: DiscoverModel,
    ailments: List<String>,
    customAilment: String,
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        // Same chip list, same label as FindView's ailment
        // row — so the user's vocabulary matches when they hop
        // between the Find and Discover tabs.
        SectionLabel(title = "Commonly used for", index = 1)
        SWFlowRow {
            ai.strainease.app.models.Conditions.catalog.forEach { name ->
                SWChip(
                    // Title-Case so "Chronic pain" reads as
                    // "Chronic Pain" on the Find symptom chips.
                    // Lookup still uses the original-cased
                    // name (Conditions.catalog.contains is
                    // case-insensitive).
                    title = name.toTitleCase(),
                    selected = model.isSelected(name),
                    onClick = { model.toggleAilment(name) },
                )
            }
        }
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            OutlinedTextField(
                value = customAilment,
                onValueChange = model::setCustomAilment,
                placeholder = { Text("Or type any symptom") },
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
                    .clickable { model.addCustomAilment() },
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Filled.Add,
                    contentDescription = "Add symptom",
                    tint = MaterialTheme.colorScheme.onPrimary,
                )
            }
        }
        val custom = ailments.filter { name ->
            ai.strainease.app.models.Conditions.catalog.none {
                it.equals(name, ignoreCase = true)
            }
        }
        if (custom.isNotEmpty()) {
            SWFlowRow {
                custom.forEach { name ->
                    SWChip(
                        // Title-Case the user-typed custom
                        // symptom. ToggleAilment still uses the
                        // underlying original-cased string.
                        title = name.toTitleCase(),
                        selected = true,
                        onClick = { model.toggleAilment(name) },
                    )
                }
            }
        }
    }
}

@Composable
private fun potencyBlock(model: DiscoverModel, potency: Potency) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        // Matches the Find tab's "THC" section header so the
        // same chip strip reads the same on both surfaces.
        SectionLabel(title = "THC", index = 2)
        SWFlowRow {
            Potency.entries.forEach { p ->
                SWChip(
                    title = p.label,
                    selected = potency == p,
                    onClick = { model.setPotency(p) },
                )
            }
        }
        Text(
            text = potency.hint,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun prefsBlock(
    model: DiscoverModel,
    prefs: ai.strainease.app.models.ResearchPrefs,
    triedStrainsList: List<TriedStrain>,
    onTriedStrainsChange: (List<TriedStrain>) -> Unit,
    medicationsList: List<String>,
    onMedicationsChange: (List<String>) -> Unit,
    savedMedicationNames: List<String>,
) {
    Column(verticalArrangement = Arrangement.spacedBy(20.dp)) {
        SectionLabel(title = "Your night", index = 3)
        prefsPanel(
            title = "Time of day",
            options = TimeOfDay.entries.map { it to it.label },
            selected = prefs.timeOfDay,
            onSelect = { v -> model.updatePrefs { p -> p.copy(timeOfDay = v) } },
        )
        prefsPanel(
            title = "Consume form",
            options = ConsumeForm.entries.map { it to it.label },
            selected = prefs.consumeForm,
            onSelect = { model.updatePrefs { p -> p.copy(consumeForm = it as ConsumeForm) } },
        )
        prefsPanel(
            title = "THC tolerance",
            options = ThcSensitivity.entries.map { it to it.label },
            selected = prefs.thcSensitivity,
            onSelect = { model.updatePrefs { p -> p.copy(thcSensitivity = it as ThcSensitivity) } },
        )
        SWField(
            value = prefs.patientNote,
            onValueChange = { v -> model.updatePrefs { it.copy(patientNote = v) } },
            placeholder = "Anything else we should know?",
            label = "Patient note",
            multiLine = true,
        )

        // Tried strains with autocomplete
        SectionLabel(title = "Other strains I've tried", index = 6)
        Text(
            text = "Help Kaya understand what has and hasn't worked for you.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        StrainAutocomplete(
            strains = triedStrainsList,
            onStrainsChange = onTriedStrainsChange,
        )

        // Medications with autocomplete
        SectionLabel(title = "Other medications", index = 7)
        Text(
            text = "We never tell you to stop a prescription — only to check with your clinician.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        MedicationAutocomplete(
            medications = medicationsList,
            onMedicationsChange = onMedicationsChange,
            suggestions = savedMedicationNames,
        )
    }
}

@Composable
private fun <T> prefsPanel(
    title: String,
    options: List<Pair<T, String>>,
    selected: T,
    onSelect: (T) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            text = title,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        SWFlowRow {
            options.forEach { (value, label) ->
                SWChip(
                    title = label,
                    selected = value == selected,
                    onClick = { onSelect(value) },
                )
            }
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

@Composable
private fun resultBlock(
    result: RecommendationResult,
    compareStore: CompareSelectionStore?,
    onOpenProfile: (StrainProfile) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text(
            text = result.headline,
            style = MaterialTheme.typography.headlineSmall,
            color = MaterialTheme.colorScheme.onBackground,
        )
        // Split summary into paragraphs for better readability
        val paragraphs = result.summary.split("\n\n").filter { it.isNotBlank() }
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            paragraphs.forEach { paragraph ->
                Text(
                    text = paragraph.trim(),
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        // Horizontal scroll strain cards section
        StrainCardsSection(
            recommendations = result.recommendations.take(6),
            profilesByName = result.strains.associateBy { it.name.lowercase() },
            compareStore = compareStore,
            onOpenProfile = onOpenProfile,
        )

        // Disclaimer above compare card
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.Top,
        ) {
            androidx.compose.material3.Icon(
                imageVector = androidx.compose.material.icons.Icons.Filled.Star,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(16.dp),
            )
            Text(
                text = "Recommendations by Dr. Kaya, our AI cannabis care assistant. Synthesized from aggregated public sources. Not medical advice. Consult your healthcare provider.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        // Compare card - full width with stacked layout
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(18.dp))
                .background(MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.1f))
                .border(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.2f), RoundedCornerShape(18.dp))
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                text = "Narrowed it down?",
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                text = "Turn your top picks into a full side-by-side comparison with differences, common ground, and cautions.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (result.recommendations.size < 2) {
                Text(
                    text = "Add at least two recommendations to compare — or use the compare tab to pick your own strains.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            } else {
                val topNames = result.recommendations.take(3).map { it.strainName }
                SWPrimaryButton(
                    title = "Compare the top picks",
                    isBusy = false,
                    enabled = true,
                    onClick = {
                        // Add top strains to compare and trigger comparison
                        topNames.forEach { name ->
                            compareStore?.toggle(name)
                        }
                    },
                )
            }
        }
    }
}

/**
 * Horizontal scroll section of strain cards with rich recommendation info.
 * Combines photo, strain info, and Add to compare functionality in ONE card per strain.
 */
@Composable
private fun StrainCardsSection(
    recommendations: List<StrainRecommendation>,
    profilesByName: Map<String, StrainProfile>,
    compareStore: CompareSelectionStore?,
    onOpenProfile: (StrainProfile) -> Unit,
) {
    val context = LocalContext.current
    val configuration = context.resources.configuration
    val screenWidthPx = configuration.screenWidthDp.dp
    val cardWidth = (screenWidthPx.value * 0.85f).dp
    // Pad the LazyRow content by the leftover space on each side of the
    // first/last card so the snap targets line up with the visible card
    // edges (start of first card flush with the page margin, end of last
    // card flush with the opposite margin).
    val pagePadding = ((screenWidthPx.value - cardWidth.value) / 2f).dp

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        // Section header
        Text(
            text = "Tap a strain for details",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        // Horizontal scroll using LazyRow with snap so each card
        // snaps into place as the user flings between them.
        val lazyState = rememberLazyListState()
        val snapBehavior = rememberSnapFlingBehavior(lazyState)
        LazyRow(
            state = lazyState,
            flingBehavior = snapBehavior,
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            contentPadding = PaddingValues(horizontal = pagePadding),
        ) {
            items(
                count = recommendations.size,
                key = { idx -> recommendations[idx].strainName },
            ) { index ->
                val rec = recommendations[index]
                val profile = profilesByName[rec.strainName.lowercase()]
                    ?: StrainProfile(name = rec.strainName, inKnowledgeBase = false)
                StrainRecommendationCard(
                    recommendation = rec,
                    profile = profile,
                    rank = index + 1,
                    compareStore = compareStore,
                    onOpenProfile = onOpenProfile,
                    modifier = Modifier.width(cardWidth),
                )
            }
        }
    }
}

/**
 * Individual strain recommendation card with photo, info, and compare button.
 */
@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun StrainRecommendationCard(
    recommendation: StrainRecommendation,
    profile: StrainProfile,
    rank: Int,
    compareStore: CompareSelectionStore?,
    onOpenProfile: (StrainProfile) -> Unit,
    modifier: Modifier = Modifier,
) {
    val selectedNames: List<String> = compareStore
        ?.names
        ?.collectAsState(initial = emptyList())
        ?.value
        ?: emptyList()
    val isAdded = selectedNames.any { it.equals(recommendation.strainName, ignoreCase = true) }
    val disabled = !isAdded && (compareStore?.atCap == true)

    Column(
        modifier = modifier
            .clip(RoundedCornerShape(20.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.7f), RoundedCornerShape(20.dp))
            .padding(14.dp)
            .combinedClickable(
                onClick = { onOpenProfile(profile) },
                onLongClick = {
                    if (!disabled) {
                        compareStore?.toggle(recommendation.strainName)
                    }
                },
            ),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        // Photo with rank badge
        Box {
            StrainPhoto(
                urlString = profile.imageUrl,
                type = profile.type,
                height = 128.dp,
                fallbackURLString = ai.strainease.app.data.StrainCatalog.photoURL(profile.slug),
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp)),
            )
            // Rank badge
            Box(
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(8.dp)
                    .size(24.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = rank.toString(),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary,
                )
            }
        }

        // Strain name
        Text(
            text = recommendation.strainName,
            style = MaterialTheme.typography.titleSmall,
            color = MaterialTheme.colorScheme.onSurface,
        )

        // THC, CBD, Type badges
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            if (!profile.thcRange.isNullOrEmpty()) {
                Text(
                    text = "THC ${profile.thcRange}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier
                        .background(
                            MaterialTheme.colorScheme.primary.copy(alpha = 0.08f),
                            RoundedCornerShape(50),
                        )
                        .padding(horizontal = 8.dp, vertical = 3.dp),
                )
            }
            if (!profile.cbdRange.isNullOrEmpty()) {
                Text(
                    text = "CBD ${profile.cbdRange}",
                    style = MaterialTheme.typography.labelSmall,
                    color = androidx.compose.ui.graphics.Color(0xFF16A34A),
                    modifier = Modifier
                        .background(
                            androidx.compose.ui.graphics.Color(0xFF16A34A).copy(alpha = 0.08f),
                            RoundedCornerShape(50),
                        )
                        .padding(horizontal = 8.dp, vertical = 3.dp),
                )
            }
            if (profile.type != null) {
                TypeBadge(type = profile.type)
            }
        }

        // Best for
        if (recommendation.bestFor.isNotBlank()) {
            Text(
                text = "Best for: ${recommendation.bestFor}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 2,
            )
        }

        // Caution
        if (recommendation.caution.isNotBlank()) {
            Text(
                text = "Caution: ${recommendation.caution}",
                style = MaterialTheme.typography.bodySmall,
                color = androidx.compose.ui.graphics.Color(0xFFF97316),
                maxLines = 2,
            )
        }

        // Reason snippet
        if (recommendation.reason.isNotBlank()) {
            Text(
                text = recommendation.reason,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 2,
            )
        }

        // Matched preferences from reasoning
        val prefsApplied = recommendation.reasoning?.preferencesApplied
        if (!prefsApplied.isNullOrEmpty()) {
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                prefsApplied.take(2).forEach { pref ->
                    Text(
                        text = pref,
                        style = MaterialTheme.typography.labelSmall,
                        color = androidx.compose.ui.graphics.Color(0xFFF97316),
                        modifier = Modifier
                            .background(
                                androidx.compose.ui.graphics.Color(0xFFF97316).copy(alpha = 0.08f),
                                RoundedCornerShape(50),
                            )
                            .padding(horizontal = 6.dp, vertical = 2.dp),
                    )
                }
                if (prefsApplied.size > 2) {
                    Text(
                        text = "+${prefsApplied.size - 2}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }

        Spacer(modifier = Modifier.weight(1f))

        // Add to compare button
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(50))
                .background(
                    if (isAdded) MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)
                    else MaterialTheme.colorScheme.surface
                )
                .border(
                    1.dp,
                    if (isAdded) MaterialTheme.colorScheme.primary.copy(alpha = 0.4f)
                    else MaterialTheme.colorScheme.outline,
                    RoundedCornerShape(50),
                )
                .clickable(enabled = !disabled) {
                    compareStore?.toggle(recommendation.strainName)
                }
                .padding(vertical = 8.dp),
            contentAlignment = Alignment.Center,
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (isAdded) {
                    androidx.compose.material3.Icon(
                        imageVector = androidx.compose.material.icons.Icons.Filled.Check,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(14.dp),
                    )
                    Text(
                        text = "Added",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.primary,
                    )
                } else {
                    androidx.compose.material3.Icon(
                        imageVector = androidx.compose.material.icons.Icons.Filled.Compare,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.size(14.dp),
                    )
                    Text(
                        text = "Compare",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                }
            }
        }
    }
}

@Composable
private fun RecommendationBlurb(rec: StrainRecommendation) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(
            text = rec.reason,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface,
        )
        Text(
            text = "Best for: ${rec.bestFor}",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.primary,
        )
        Text(
            text = "Caution: ${rec.caution}",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        ReasoningTraceSection(reasoning = rec.reasoning)
    }
}
