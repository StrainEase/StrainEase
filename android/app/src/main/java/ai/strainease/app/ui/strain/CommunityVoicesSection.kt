package ai.strainease.app.ui.strain

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Divider
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
import ai.strainease.app.models.CommunityNote
import ai.strainease.app.models.SourceRating
import ai.strainease.app.ui.components.SectionLabel
import ai.strainease.app.ui.components.SWCard
import kotlin.math.max
import kotlin.math.min

private enum class CommunityTab { REDDIT, SITES }

/**
 * Per-source cap on community notes in the weed-sites channel.
 * Matches the backend consolidator's NOTES_PER_SOURCE so a future
 * wire push can't quietly dump the whole list into the UI.
 */
private const val NOTES_PER_SOURCE = 5

/**
 * Split a list of non-Reddit notes into 5-per-source buckets
 * (leafly / weedmaps / allbud) so the strain detail always shows
 * variety across the sites instead of one source flooding the
 * list. Order: leafly, weedmaps, allbud, then any other kind.
 */
private fun capCannabisBySource(notes: List<CommunityNote>): List<CommunityNote> {
    val byKind = notes.groupBy { it.resolvedKind }
    val ordered = listOf("leafly", "weedmaps", "allbud", "other")
    return ordered.flatMap { kind ->
        byKind[kind].orEmpty().take(NOTES_PER_SOURCE)
    }
}

/**
 * Community voices section for a strain detail page. 1:1 port of
 * the iOS `CommunityVoicesSection`. Shows:
 *  - One per-source rating card per source that published a star
 *    rating (Leafly, Weedmaps, Allbud — whichever returned one).
 *    Rendered as a vertical stack so 1-3 cards all read clearly.
 *  - Reddit tab / Weed sites tab with note cards (when both sources
 *    have content)
 *  - The active tab's notes
 */
@Composable
fun CommunityVoicesSection(
    ratings: List<SourceRating>,
    quotes: List<CommunityNote>,
    isHydrating: Boolean,
    modifier: Modifier = Modifier,
) {
    val redditNotes = quotes.filter { it.isReddit }.take(NOTES_PER_SOURCE)
    val siteNotes = capCannabisBySource(quotes.filter { !it.isReddit })
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

    val showContent = ratings.isNotEmpty() || quotes.isNotEmpty() || isHydrating
    if (!showContent) return

    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        SectionLabel(title = "Community voices")

        // Rating cards — Leafly + Allbud are merged into a single
        // two-column card when both exist; other sources keep their own.
        if (ratings.isNotEmpty()) {
            val leafly = ratings.firstOrNull { it.source == "Leafly" }
            val allbud = ratings.firstOrNull { it.source == "Allbud" }
            val others = ratings.filter { it.source != "Leafly" && it.source != "Allbud" }

            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                if (leafly != null && allbud != null) {
                    LeaflyAllbudRatingCard(
                        leaflyStars = leafly.stars,
                        leaflyCount = leafly.reviewCount,
                        allbudStars = allbud.stars,
                        allbudCount = allbud.reviewCount,
                    )
                } else if (leafly != null) {
                    SourceRatingCard(rating = leafly)
                } else if (allbud != null) {
                    SourceRatingCard(rating = allbud)
                }
                others.forEach { rating ->
                    SourceRatingCard(rating = rating)
                }
            }
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

/**
 * One rating card per source. Renders 5 stars + the big star number
 * + a small source eyebrow ("LEAFLY" / "WEEDMAPS" / "ALLBUD") so the
 * number is never misattributed. With a [SourceRating.reviewCount]
 * the footer shows the published review count; without it the
 * card shows "Rating only" so the absence is honest.
 */
@Composable
private fun SourceRatingCard(rating: SourceRating) {
    SWCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            StarStrip(value = rating.stars)
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                Text(
                    text = rating.source.uppercase(),
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontSize = 10.sp,
                        letterSpacing = 1.2.sp,
                        fontWeight = FontWeight.SemiBold,
                    ),
                    color = MaterialTheme.colorScheme.primary,
                )
                Text(
                    text = "%.1f".format(rating.stars),
                    style = MaterialTheme.typography.titleLarge.copy(
                        fontSize = 22.sp,
                        fontWeight = FontWeight.SemiBold,
                    ),
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Text(
                    text = if (rating.reviewCount != null) {
                        "${rating.reviewCount} reviews"
                    } else {
                        "Rating only"
                    },
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun StarStrip(value: Double) {
    Row(horizontalArrangement = Arrangement.spacedBy(3.dp)) {
        for (i in 0 until 5) {
            Icon(
                imageVector = Icons.Filled.Star,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(16.dp),
            )
        }
    }
}

@Composable
private fun LeaflyAllbudRatingCard(
    leaflyStars: Double,
    leaflyCount: Int?,
    allbudStars: Double,
    allbudCount: Int?,
) {
    val dividerColor = MaterialTheme.colorScheme.outline
    SWCard {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            // Two-column grid
            Row(modifier = Modifier.fillMaxWidth()) {
                // Leafly column
                Column(
                    modifier = Modifier.weight(1f),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Text(
                        text = "Leafly",
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontSize = 10.sp,
                            letterSpacing = 1.2.sp,
                            fontWeight = FontWeight.SemiBold,
                        ),
                        color = MaterialTheme.colorScheme.primary,
                    )
                    StarStrip(value = leaflyStars)
                    Text(
                        text = "%.1f".format(leaflyStars),
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontSize = 15.sp,
                            fontWeight = FontWeight.SemiBold,
                        ),
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    Divider(
                        color = dividerColor,
                        thickness = 1.dp,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Text(
                        text = "${leaflyCount?.let { "%,d".format(it) } ?: "0"} reviews",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }

                // Vertical divider between columns
                Divider(
                    color = dividerColor,
                    modifier = Modifier
                        .padding(horizontal = 8.dp)
                        .height(60.dp)
                        .width(1.dp),
                )

                // Allbud column
                Column(
                    modifier = Modifier.weight(1f),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Text(
                        text = "Allbud",
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontSize = 10.sp,
                            letterSpacing = 1.2.sp,
                            fontWeight = FontWeight.SemiBold,
                        ),
                        color = MaterialTheme.colorScheme.primary,
                    )
                    StarStrip(value = allbudStars)
                    Text(
                        text = "%.1f".format(allbudStars),
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontSize = 15.sp,
                            fontWeight = FontWeight.SemiBold,
                        ),
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    Divider(
                        color = dividerColor,
                        thickness = 1.dp,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Text(
                        text = "${allbudCount?.let { "%,d".format(it) } ?: "0"} reviews",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}
