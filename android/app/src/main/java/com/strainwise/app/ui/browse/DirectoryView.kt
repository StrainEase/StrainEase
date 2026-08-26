package com.strainwise.app.ui.browse

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.strainwise.app.models.Conditions
import com.strainwise.app.models.StrainProfile
import com.strainwise.app.ui.components.Eyebrow
import com.strainwise.app.ui.components.MeshBackground
import com.strainwise.app.ui.components.SWChip
import com.strainwise.app.ui.components.SWFlowRow
import com.strainwise.app.ui.components.SectionLabel
import com.strainwise.app.ui.home.StrainPoster
import com.strainwise.app.ui.theme.StrainWiseTypography

/**
 * Browse tab. 1:1 port of the iOS `DirectoryView`:
 *  - hero
 *  - search field (free-text query on strain name)
 *  - Type chip row (All / Sativa / Hybrid / Indica)
 *  - "Commonly used for" ailment chip row
 *  - THC chip row (Any / Mild / Balanced / Strong)
 *  - Effect chip row (Relaxing / Sleepy / Happy / Focused /
 *    Energetic / Hungry)
 *  - "Reset filters" link when any filter is active
 *  - 2-column results grid
 */
@Composable
fun DirectoryView(
    model: DirectoryModel,
    modifier: Modifier = Modifier,
    onOpenProfile: (StrainProfile) -> Unit = {},
) {
    val query by model.query.collectAsState()
    val typeFilter by model.typeFilter.collectAsState()
    val thc by model.thc.collectAsState()
    val effectIDs by model.effectIDs.collectAsState()
    val ailmentFilters by model.ailmentFilters.collectAsState()
    val isLoading by model.isLoading.collectAsState()
    val error by model.errorMessage.collectAsState()

    LaunchedEffect(Unit) { model.load() }

    val results = model.results

    Box(modifier = modifier.fillMaxSize()) {
        MeshBackground()
        if (isLoading && results.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
            }
            return@Box
        }
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
            modifier = Modifier.fillMaxSize(),
        ) {
            item(span = { GridItemSpan(currentLineSpan = 2) }) { hero() }
            item(span = { GridItemSpan(currentLineSpan = 2) }) {
                searchField(query = query, onQueryChange = model::setQuery)
            }
            item(span = { GridItemSpan(currentLineSpan = 2) }) {
                filterRow(title = "Type", index = 1) {
                    DirectoryFilter.TypeFilter.entries.forEach { option ->
                        SWChip(
                            title = option.label,
                            selected = typeFilter == option,
                            onClick = { model.setType(option) },
                        )
                    }
                }
            }
            item(span = { GridItemSpan(currentLineSpan = 2) }) {
                filterRow(title = "Commonly used for", index = 2) {
                    Conditions.catalog.take(8).forEach { name ->
                        SWChip(
                            title = name,
                            selected = ailmentFilters.any { it.equals(name, ignoreCase = true) },
                            onClick = { model.toggleAilment(name) },
                        )
                    }
                }
            }
            item(span = { GridItemSpan(currentLineSpan = 2) }) {
                filterRow(title = "THC", index = 3) {
                    DirectoryFilter.ThcBand.entries.forEach { band ->
                        SWChip(
                            title = band.label,
                            selected = thc == band,
                            onClick = { model.setThc(band) },
                        )
                    }
                }
            }
            item(span = { GridItemSpan(currentLineSpan = 2) }) {
                filterRow(title = "Effects", index = 4) {
                    DirectoryFilter.EffectBucket.all.forEach { bucket ->
                        SWChip(
                            title = bucket.label,
                            selected = effectIDs.contains(bucket.id),
                            onClick = { model.toggleEffect(bucket.id) },
                        )
                    }
                }
            }
            if (model.filtersActive) {
                item(span = { GridItemSpan(currentLineSpan = 2) }) {
                    Text(
                        text = "Reset filters",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier
                            .clickable { model.resetFilters() }
                            .padding(vertical = 4.dp),
                    )
                }
            }
            error?.let {
                item(span = { GridItemSpan(currentLineSpan = 2) }) {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error,
                    )
                }
            }
            if (results.isEmpty() && !isLoading) {
                item(span = { GridItemSpan(currentLineSpan = 2) }) {
                    Text(
                        text = "No strains match your filters.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            items(items = results, key = { it.slug }) { profile ->
                StrainPoster(profile = profile, onClick = { onOpenProfile(profile) })
            }
        }
    }
}

@Composable
private fun hero() {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Eyebrow(text = "Strain directory")
        Text(
            text = "Browse popular strains",
            style = MaterialTheme.typography.displaySmall,
            color = MaterialTheme.colorScheme.onBackground,
        )
        Text(
            text = "Live from Leafly. Filter by type, THC, or the effects you're after.",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun searchField(query: String, onQueryChange: (String) -> Unit) {
    OutlinedTextField(
        value = query,
        onValueChange = onQueryChange,
        placeholder = { Text("Search the catalog") },
        leadingIcon = {
            Icon(
                imageVector = Icons.Filled.Search,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        },
        trailingIcon = {
            if (query.isNotEmpty()) {
                Icon(
                    imageVector = Icons.Filled.Close,
                    contentDescription = "Clear search",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier
                        .clickable { onQueryChange("") }
                        .padding(8.dp),
                )
            }
        },
        singleLine = true,
        shape = RoundedCornerShape(50),
        colors = fieldColors(),
        modifier = Modifier.fillMaxWidth(),
    )
}

@Composable
private fun filterRow(title: String, index: Int? = null, content: @Composable () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        SectionLabel(title = title, index = index)
        SWFlowRow { content() }
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
