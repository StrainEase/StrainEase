package ai.strainease.app.ui.find

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
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
import ai.strainease.app.ui.home.StrainPoster
import ai.strainease.app.ui.theme.StrainEaseTypography
import kotlinx.coroutines.launch

/**
 * The Find tab. 1:1 port of the iOS `FindView` with a slightly
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
fun FindView(
    model: FindModel,
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
    // AccountView show up here. Mirrors iOS FindView's
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
                        // FindView's `history.remember(find:)`
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
            // CompareTrayBar's "Compare" CTA. Mirrors iOS FindView
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
    model: FindModel,
    ailments: List<String>,
    customAilment: String,
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionLabel(title = "Symptoms", index = 1)
        SWFlowRow {
            ai.strainease.app.models.Conditions.catalog.forEach { name ->
                SWChip(
                    title = name,
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
                        title = name,
                        selected = true,
                        onClick = { model.toggleAilment(name) },
                    )
                }
            }
        }
    }
}

@Composable
private fun potencyBlock(model: FindModel, potency: Potency) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionLabel(title = "Potency", index = 2)
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
    model: FindModel,
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
        Text(
            text = result.summary,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        result.strains.take(6).forEach { profile ->
            SWCard(emphasized = true) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = profile.name,
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    StrainPoster(
                        profile = profile,
                        onClick = { onOpenProfile(profile) },
                        compareStore = compareStore,
                    )
                    result.recommendations.firstOrNull { it.strainName.equals(profile.name, ignoreCase = true) }
                        ?.let { rec ->
                            RecommendationBlurb(rec)
                        }
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
