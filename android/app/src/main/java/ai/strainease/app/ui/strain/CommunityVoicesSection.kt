package com.strainwise.app.ui.strain

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.strainwise.app.models.CommunityNote
import com.strainwise.app.ui.components.SectionLabel
import com.strainwise.app.ui.components.SWCard
import kotlin.math.max
import kotlin.math.min

private enum class CommunityTab { REDDIT, SITES }

/**
 * Community voices section for a strain detail page. 1:1 port of
 * the iOS `CommunityVoicesSection`. Shows:
 *  - Leafly star-rating card (when available)
 *  - Reddit tab / Weed sites tab with note cards (when both sources
 *    have content)
 *  - The active tab's notes
 */
@Composable
fun CommunityVoicesSection(
    rating: Pair<Double, Int?>?,
    quotes: List<CommunityNote>,
    isHydrating: Boolean,
    modifier: Modifier = Modifier,
) {
    val redditNotes = quotes.filter { it.isReddit }
    val siteNotes = quotes.filter { !it.isReddit }
    val hasReddit = redditNotes.isNotEmpty()
    val hasSites = siteNotes.isNotEmpty()

    val defaultTab = when {
        hasReddit && !hasSites -> CommunityTab.REDDIT
        !hasReddit && hasSites -> CommunityTab.SITES
        else -> CommunityTab.SITES
    }

    var selectedTab by remember { mutableStateOf(defaultTab) }

    // Sync when quotes change (e.g. after hydration).
    LaunchedEffect(quotes) {
        val reddit = quotes.filter { it.isReddit }
        val sites = quotes.filter { !it.isReddit }
        when {
            selectedTab == CommunityTab.REDDIT && reddit.isEmpty() && sites.isNotEmpty() -> {
                selectedTab = CommunityTab.SITES
            }
            selectedTab == CommunityTab.SITES && sites.isEmpty() && reddit.isNotEmpty() -> {
                selectedTab = CommunityTab.REDDIT
            }
        }
    }

    val showContent = rating != null || quotes.isNotEmpty() || isHydrating
    if (!showContent) return

    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        SectionLabel(title = "Community voices")

        // Leafly rating card.
        rating?.let { (stars, count) ->
            LeaflyRatingCard(stars = stars, count = count)
        }

        // Tab picker — only shown when both sources have content.
        if (hasReddit && hasSites) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                TabButton(
                    label = "Reddit",
                    count = redditNotes.size,
                    isActive = selectedTab == CommunityTab.REDDIT,
                    onClick = { selectedTab = CommunityTab.REDDIT },
                )
                TabButton(
                    label = "Weed sites",
                    count = siteNotes.size,
                    isActive = selectedTab == CommunityTab.SITES,
                    onClick = { selectedTab = CommunityTab.SITES },
                )
            }
        }

        // Loading placeholder while hydrating with no quotes yet.
        if (isHydrating && quotes.isEmpty()) {
            SWCard {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    CircularProgressIndicator(
                        color = MaterialTheme.colorScheme.primary,
                        strokeWidth = 2.dp,
                        modifier = Modifier.size(14.dp),
                    )
                    Text(
                        text = "Pulling Leafly reviews and Reddit comments…",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }

        // Notes for the selected tab.
        val notes = if (selectedTab == CommunityTab.REDDIT) redditNotes else siteNotes
        when {
            notes.isEmpty() -> {
                val emptyText = if (selectedTab == CommunityTab.REDDIT) {
                    if (hasSites) "No Reddit quotes yet." else null
                } else {
                    if (hasReddit) "No weed-site reviews yet." else null
                }
                emptyText?.let {
                    SWCard {
                        Text(
                            text = it,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
            else -> {
                notes.forEach { note ->
                    SWCard {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(
                                text = note.source.uppercase(),
                                style = MaterialTheme.typography.labelSmall.copy(
                                    fontSize = 10.sp,
                                    letterSpacing = 1.2.sp,
                                    fontWeight = FontWeight.SemiBold,
                                ),
                                color = MaterialTheme.colorScheme.primary,
                            )
                            Text(
                                text = "\u201c${note.text}\u201d",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurface,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TabButton(
    label: String,
    count: Int,
    isActive: Boolean,
    onClick: () -> Unit,
) {
    val primary = MaterialTheme.colorScheme.primary
    val primaryForeground = MaterialTheme.colorScheme.onPrimary
    val foreground = MaterialTheme.colorScheme.onSurface
    val mutedForeground = MaterialTheme.colorScheme.onSurfaceVariant
    val card = MaterialTheme.colorScheme.surface
    val border = MaterialTheme.colorScheme.outline

    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(if (isActive) primary else card)
            .then(
                if (!isActive) Modifier.border(1.dp, border, RoundedCornerShape(50))
                else Modifier
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.SemiBold),
            color = if (isActive) primaryForeground else foreground,
        )
        Text(
            text = "$count",
            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
            color = if (isActive) primaryForeground.copy(alpha = 0.7f) else mutedForeground,
        )
    }
}

@Composable
private fun LeaflyRatingCard(stars: Double, count: Int?) {
    SWCard {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            // Five star icons, filled/half/empty based on the rating.
            Row(horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                for (i in 0 until 5) {
                    val fill = min(1.0, max(0.0, stars - i))
                    Icon(
                        imageVector = Icons.Filled.Star,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(16.dp),
                    )
                }
            }
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    text = "%.1f".format(stars),
                    style = MaterialTheme.typography.titleLarge.copy(
                        fontSize = 22.sp,
                        fontWeight = FontWeight.SemiBold,
                    ),
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Text(
                    text = if (count != null) "$count Leafly reviews" else "Average Leafly rating",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}
