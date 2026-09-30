package ai.strainease.app.ui.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ai.strainease.app.models.StrainProfile
import ai.strainease.app.ui.components.SectionLabel

/**
 * Full-grid "See all" destination for a Home rail section.
 * 1:1 port of the iOS `StrainGridView` used when the user
 * taps "See all" on a rail.
 *
 * Two columns, photo + name + type + THC per cell. The grid
 * uses the same `StrainPoster` component as the rails.
 */
@Composable
fun StrainGridView(
    title: String,
    strains: List<StrainProfile>,
    modifier: Modifier = Modifier,
    onSelect: (StrainProfile) -> Unit = {},
) {
    Box(modifier = modifier.fillMaxSize()) {
        if (strains.isEmpty()) {
            Text(
                text = "No strains in this section yet.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier
                    .padding(20.dp)
                    .align(Alignment.TopStart),
            )
        } else {
            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(14.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp),
                modifier = Modifier.fillMaxSize(),
            ) {
                item(span = { GridItemSpan(currentLineSpan = 2) }) {
                    Box(modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp)) {
                        SectionLabel(title = title)
                    }
                }
                items(items = strains, key = { it.slug }) { profile ->
                    StrainPoster(profile = profile, onClick = { onSelect(profile) })
                }
            }
        }
    }
}
