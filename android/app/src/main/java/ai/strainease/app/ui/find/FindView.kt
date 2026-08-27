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
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import ai.strainease.app.data.ReliefLogStore
import ai.strainease.app.data.SavedAilmentsStore
import ai.strainease.app.data.SavedMedicationsStore
import ai.strainease.app.models.ConsumeForm
import ai.strainease.app.models.Potency
import ai.strainease.app.models.StrainProfile
import ai.strainease.app.models.ThcSensitivity
import ai.strainease.app.models.TimeOfDay
import ai.strainease.app.models.RecommendationResult
import ai.strainease.app.models.StrainRecommendation
import ai.strainease.app.ui.components.Eyebrow
import ai.strainease.app.ui.components.MeshBackground
import ai.strainease.app.ui.components.SWCard
import ai.strainease.app.ui.components.SWChip
import ai.strainease.app.ui.components.SWErrorBanner
import ai.strainease.app.ui.components.SWField
import ai.strainease.app.ui.components.SWFlowRow
import ai.strainease.app.ui.components.SWPrimaryButton
import ai.strainease.app.ui.components.SectionLabel
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
    relief: ReliefLogStore,
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
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        model.hydrateAilmentsIfNeeded(savedAilments)
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
            prefsBlock(model, prefs)
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
                    }
                },
            )
            error?.let { SWErrorBanner(message = it) }
            result?.let { resultBlock(it, onOpenProfile) }
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
private fun prefsBlock(model: FindModel, prefs: ai.strainease.app.models.ResearchPrefs) {
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
            value = prefs.ownedStrainsText,
            onValueChange = { v -> model.updatePrefs { it.copy(ownedStrainsText = v) } },
            placeholder = "Strains you already own (comma-separated)",
            label = "Owned strains",
            multiLine = true,
        )
        SWField(
            value = prefs.medications,
            onValueChange = { v -> model.updatePrefs { it.copy(medications = v) } },
            placeholder = "Medications you're taking (one per line)",
            label = "Medications",
            multiLine = true,
        )
        SWField(
            value = prefs.patientNote,
            onValueChange = { v -> model.updatePrefs { it.copy(patientNote = v) } },
            placeholder = "Anything else we should know?",
            label = "Patient note",
            multiLine = true,
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
                    StrainPoster(profile = profile, onClick = { onOpenProfile(profile) })
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
    }
}
