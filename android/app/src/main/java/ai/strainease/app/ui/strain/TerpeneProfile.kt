package ai.strainease.app.ui.strain

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import ai.strainease.app.data.TerpeneCatalog
import ai.strainease.app.data.TerpeneProfile as CuratedProfile
import ai.strainease.app.models.StrainProfile
import ai.strainease.app.models.Terpene
import ai.strainease.app.ui.components.MeshBackground
import ai.strainease.app.ui.components.SWCard
import ai.strainease.app.ui.components.SectionLabel
import ai.strainease.app.ui.components.StrainPhoto
import ai.strainease.app.ui.theme.StrainEaseTypography
import kotlinx.coroutines.launch

/**
 * One-tap row in the strain-detail "Terpenes" section. Each
 * curated terpene is its own card; tapping opens a Material 3
 * bottom sheet with the full drill-down: curated description,
 * characteristics, benefits, and the family of strains that
 * also list this terpene (with photos).
 *
 * Direct port of the iOS `TerpeneRow` + `TerpeneDetailView`
 * pair. Uncurated terpenes still render as a row but are not
 * tappable — there's no curated profile to show.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TerpeneProfile(
    terpene: Terpene,
    familyStrains: List<StrainProfile>,
    familyLoading: Boolean,
    onSelectStrain: (StrainProfile) -> Unit,
    modifier: Modifier = Modifier,
) {
    val card = MaterialTheme.colorScheme.surface
    val border = MaterialTheme.colorScheme.outline
    val curated = TerpeneCatalog.isCurated(terpene.name)
    var showSheet by remember { mutableStateOf(false) }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val scope = rememberCoroutineScope()

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(card)
            .border(1.dp, border, RoundedCornerShape(14.dp))
            .let { if (curated) it.clickable { showSheet = true } else it }
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = terpene.name,
                style = StrainEaseTypography.titleSmall,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.weight(1f),
            )
            if (curated) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(2.dp),
                ) {
                    Text(
                        text = "Details",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(14.dp),
                    )
                }
            }
        }
        Text(
            text = terpene.profile,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }

    if (showSheet && curated) {
        val profile = TerpeneCatalog.profileFor(terpene.name)
        if (profile != null) {
            ModalBottomSheet(
                onDismissRequest = { showSheet = false },
                sheetState = sheetState,
            ) {
                TerpeneDetailSheet(
                    name = terpene.name,
                    profile = profile,
                    familyStrains = familyStrains,
                    familyLoading = familyLoading,
                    onSelectStrain = { selected ->
                        scope.launch {
                            sheetState.hide()
                            showSheet = false
                            onSelectStrain(selected)
                        }
                    },
                )
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class, ExperimentalMaterial3Api::class)
@Composable
private fun TerpeneDetailSheet(
    name: String,
    profile: CuratedProfile,
    familyStrains: List<StrainProfile>,
    familyLoading: Boolean,
    onSelectStrain: (StrainProfile) -> Unit,
) {
    val matches = remember(name, familyStrains) {
        TerpeneCatalog.strainsWithTerpene(name, familyStrains).first
    }
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp)
            .padding(bottom = 32.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(
                text = "Terpene",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.primary,
            )
            Text(
                text = name.replaceFirstChar { it.uppercase() },
                style = StrainEaseTypography.headlineMedium,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                text = profile.summary,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        SWCard {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                SectionLabel(title = "About this terpene")
                Text(
                    text = profile.description,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Spacer(modifier = Modifier.size(2.dp))
                SectionLabel(title = "Characteristics")
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    profile.characteristics.forEach { tag ->
                        Text(
                            text = tag,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurface,
                            modifier = Modifier
                                .clip(RoundedCornerShape(50))
                                .background(MaterialTheme.colorScheme.surfaceVariant)
                                .border(
                                    1.dp,
                                    MaterialTheme.colorScheme.outline,
                                    RoundedCornerShape(50),
                                )
                                .padding(horizontal = 12.dp, vertical = 6.dp),
                        )
                    }
                }
                SectionLabel(title = "Patients often pair it with")
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    profile.benefits.forEach { tag ->
                        Text(
                            text = tag,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier
                                .clip(RoundedCornerShape(50))
                                .background(
                                    MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                                )
                                .border(
                                    1.dp,
                                    MaterialTheme.colorScheme.primary.copy(alpha = 0.35f),
                                    RoundedCornerShape(50),
                                )
                                .padding(horizontal = 12.dp, vertical = 6.dp),
                        )
                    }
                }
            }
        }

        FamilyStrainsBlock(
            name = name,
            strains = matches,
            loading = familyLoading,
            onSelect = onSelectStrain,
        )
    }
}

@Composable
private fun FamilyStrainsBlock(
    name: String,
    strains: List<StrainProfile>,
    loading: Boolean,
    onSelect: (StrainProfile) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            SectionLabel(title = "Strains in this family", index = null)
            Spacer(modifier = Modifier.weight(1f))
            if (!loading) {
                Text(
                    text = "${strains.size}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        when {
            loading -> FamilyStrainsSkeleton()
            strains.isEmpty() -> Text(
                text = "No popular strains on Leafly currently list $name. Try opening a strain and checking its profile — the full terpene breakdown is inside.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            else -> Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                strains.forEach { strain ->
                    FamilyStrainRow(profile = strain, onClick = { onSelect(strain) })
                }
            }
        }
    }
}

@Composable
private fun FamilyStrainsSkeleton() {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        repeat(3) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.surface)
                    .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(12.dp))
                    .padding(8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant),
                )
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Box(
                        modifier = Modifier
                            .height(10.dp)
                            .clip(RoundedCornerShape(4.dp))
                            .background(MaterialTheme.colorScheme.surfaceVariant)
                            .fillMaxWidth(0.55f),
                    )
                    Box(
                        modifier = Modifier
                            .height(8.dp)
                            .clip(RoundedCornerShape(4.dp))
                            .background(MaterialTheme.colorScheme.surfaceVariant)
                            .fillMaxWidth(0.3f),
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun FamilyStrainRow(
    profile: StrainProfile,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Box(
            modifier = Modifier
                .size(44.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant),
        ) {
            StrainPhoto(
                urlString = profile.imageUrl,
                type = profile.type,
                modifier = Modifier.fillMaxWidth(),
                height = 44.dp,
                cornerRadius = 10.dp,
            )
        }
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            Text(
                text = profile.name,
                style = StrainEaseTypography.titleSmall,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            profile.thcRange?.let { thc ->
                Text(
                    text = "THC $thc",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            val effects = profile.effects.orEmpty().take(3)
            if (effects.isNotEmpty()) {
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    effects.forEach { effect ->
                        Text(
                            text = effect.name.replaceFirstChar { it.uppercase() },
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurface,
                            modifier = Modifier
                                .clip(RoundedCornerShape(50))
                                .background(MaterialTheme.colorScheme.surfaceVariant)
                                .border(
                                    1.dp,
                                    MaterialTheme.colorScheme.outline,
                                    RoundedCornerShape(50),
                                )
                                .padding(horizontal = 8.dp, vertical = 3.dp),
                        )
                    }
                }
            }
        }
        Icon(
            imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

/** Unused but kept exported so older preview/screenshot code still compiles. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
@Suppress("unused")
fun TerpeneDetailPreview(name: String) {
    val profile = TerpeneCatalog.profileFor(name) ?: return
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(
        onDismissRequest = {},
        sheetState = sheetState,
    ) {
        MeshBackground()
        TerpeneDetailSheet(
            name = name,
            profile = profile,
            familyStrains = emptyList(),
            familyLoading = false,
            onSelectStrain = {},
        )
    }
}
