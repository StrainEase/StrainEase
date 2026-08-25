package com.strainwise.app.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.strainwise.app.models.StrainProfile
import com.strainwise.app.ui.components.SectionLabel

/**
 * Ailment paged carousel — 1:1 port of the iOS
 * `AilmentCarousel`. Each page shows one ailment name + 6
 * strain cards in two rows of three, with a "See more" link
 * that opens the [StrainGridView] for that ailment.
 *
 * Page dots underneath mirror the iOS pager dots; tapping
 * one jumps to that ailment.
 */
@Composable
fun AilmentCarousel(
    ailments: List<String>,
    preview: (String) -> List<StrainProfile>,
    modifier: Modifier = Modifier,
    onSeeMore: (String) -> Unit = {},
    onSelect: (StrainProfile) -> Unit = {},
) {
    var currentName by remember { mutableStateOf(ailments.firstOrNull() ?: "Symptoms") }

    LaunchedEffect(ailments) {
        if (ailments.isNotEmpty() && ailments.none { it == currentName }) {
            currentName = ailments.first()
        }
    }

    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionLabel(title = "For your symptoms")
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
                modifier = Modifier.fillMaxWidth(),
            ) {
                items(items = ailments, key = { it }) { name ->
                    AilmentPage(
                        name = name,
                        strains = preview(name).take(6),
                        onSeeMore = { onSeeMore(name) },
                        onSelect = onSelect,
                        modifier = Modifier.fillParentMaxWidth(),
                    )
                }
            }
        }
        // Page dots
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            ailments.forEach { name ->
                Box(
                    modifier = Modifier
                        .padding(horizontal = 4.dp)
                        .size(7.dp)
                        .clip(RoundedCornerShape(50))
                        .background(
                            if (name == currentName) MaterialTheme.colorScheme.onSurface
                            else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.38f),
                        )
                        .clickable { currentName = name },
                )
            }
        }
    }
}

@Composable
private fun AilmentPage(
    name: String,
    strains: List<StrainProfile>,
    onSeeMore: () -> Unit,
    onSelect: (StrainProfile) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = name,
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.weight(1f),
            )
            Text(
                text = "See more",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.clickable(onClick = onSeeMore),
            )
        }
        // Two rows of three strain posters (compact mode, 72dp photo)
        strains.chunked(3).forEach { rowItems ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                rowItems.forEach { profile ->
                    Box(modifier = Modifier.weight(1f)) {
                        StrainPoster(
                            profile = profile,
                            compact = true,
                            photoHeight = 72.dp,
                            onClick = { onSelect(profile) },
                        )
                    }
                }
                // Fill empty slots so the row stays a 3-column grid
                repeat(3 - rowItems.size) { Box(modifier = Modifier.weight(1f)) }
            }
        }
    }
}
