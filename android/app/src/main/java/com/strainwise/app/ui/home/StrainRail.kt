package com.strainwise.app.ui.home

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.strainwise.app.models.StrainProfile
import com.strainwise.app.ui.components.SectionLabel

/**
 * Horizontal rail of [StrainPoster] cards. Direct port of the
 * iOS `StrainRail` view used by every Home section (Popular,
 * Sativa, Hybrid, Indica, Recents, For You).
 *
 * - [strains] feeds the rail.
 * - [emptyText] is shown beneath the label when [strains] is
 *   empty (e.g. the Recents rail before the user has opened a
 *   strain).
 * - [onSeeMore] opens the full grid for the section; null hides
 *   the "See all" button.
 * - [onSelect] fires when a card is tapped.
 */
@Composable
fun StrainRail(
    title: String,
    strains: List<StrainProfile>,
    modifier: Modifier = Modifier,
    index: Int? = null,
    emptyText: String? = null,
    onSeeMore: (() -> Unit)? = null,
    onSelect: (StrainProfile) -> Unit = {},
) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            SectionLabel(title = title, index = index)
            Spacer(Modifier.weight(1f))
            if (onSeeMore != null) {
                Text(
                    text = "See all",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier
                        .padding(horizontal = 4.dp)
                        .clickable { onSeeMore() },
                )
            }
        }
        if (strains.isEmpty() && emptyText != null) {
            Text(
                text = emptyText,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else {
            LazyRow(
                contentPadding = PaddingValues(horizontal = 0.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(items = strains, key = { it.slug }) { profile ->
                    Box(modifier = Modifier.width(160.dp)) {
                        StrainPoster(profile = profile, onClick = { onSelect(profile) })
                    }
                }
            }
        }
    }
}
