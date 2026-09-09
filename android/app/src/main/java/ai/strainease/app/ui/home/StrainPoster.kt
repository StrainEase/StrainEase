package ai.strainease.app.ui.home

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ai.strainease.app.data.StrainCatalog
import ai.strainease.app.models.StrainProfile
import ai.strainease.app.ui.compare.CompareSelectionStore
import ai.strainease.app.ui.components.StrainPhoto
import ai.strainease.app.ui.components.TypeBadge
import ai.strainease.app.ui.theme.StrainEaseTypography

/**
 * One strain card. 1:1 port of the iOS `StrainPoster` view used
 * by every Home rail, the ailment carousel, the Find results,
 * and the Browse grid.
 *
 * Layout:
 *  - [StrainPhoto] at the top (108dp compact, 132dp full)
 *  - [TypeBadge] (Indica / Sativa / Hybrid)
 *  - Strain name (serif, 13pt compact / 15pt full)
 *  - "THC 17–24%" subtitle
 *
 * The `compact` flag toggles the photo height + serif font size
 * for the ailment carousel's tighter rows.
 *
 * Press-and-hold to compare (parity with the iOS
 * `compareHoldable()` modifier and the web's
 * `ComparableStrainPoster`): pass [compareStore] and a long-press
 * adds the strain to the compare tray with a haptic tick, plus a
 * check badge while the strain sits in the selection. A plain tap
 * keeps firing [onClick]; scrolling is unaffected because the
 * long-press only claims stationary holds.
 */
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun StrainPoster(
    profile: StrainProfile,
    modifier: Modifier = Modifier,
    compact: Boolean = false,
    photoHeight: Dp? = null,
    onClick: (() -> Unit)? = null,
    compareStore: CompareSelectionStore? = null,
) {
    val haptic = LocalHapticFeedback.current
    // Observable read of the selection so the badge tracks the tray live.
    val selectedNames = compareStore?.names
        ?.collectAsState(initial = emptyList())
        ?.value
        .orEmpty()
    val inCompare = selectedNames.any { it.equals(profile.name, ignoreCase = true) }

    fun addToCompare() {
        val store = compareStore ?: return
        if (store.isIn(profile.name)) {
            // Already in the tray — light confirmation so the gesture never
            // feels dead; the badge already shows the state.
            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
            return
        }
        if (store.atCap) {
            // Tray is full (3/3) — soft "unavailable" tick so the completed
            // hold isn't silent; remove a strain from the tray to add another.
            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
            return
        }
        store.toggle(profile.name) // adds: guarded to the not-in, not-at-cap case
        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
    }

    Box(modifier = modifier) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .then(
                    when {
                        compareStore != null -> Modifier.combinedClickable(
                            onClick = { onClick?.invoke() },
                            onLongClick = { addToCompare() },
                        )
                        onClick != null -> Modifier.clickable(onClick = onClick)
                        else -> Modifier
                    },
                ),
            verticalArrangement = Arrangement.spacedBy(if (compact) 6.dp else 8.dp),
        ) {
            StrainPhoto(
                urlString = profile.imageUrl,
                type = profile.type,
                height = photoHeight ?: if (compact) 108.dp else 132.dp,
                fallbackURLString = StrainCatalog.photoURL(for = profile.slug),
            )
            TypeBadge(type = profile.type)
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.Top,
            ) {
                Text(
                    text = profile.name,
                    style = if (compact) {
                        StrainEaseTypography.titleSmall.copy(fontSize = 13.sp)
                    } else {
                        StrainEaseTypography.titleMedium
                    },
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 2,
                    modifier = Modifier.weight(1f),
                )
            }
            if (!profile.thcRange.isNullOrEmpty()) {
                Text(
                    text = "THC ${profile.thcRange}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        if (inCompare) {
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(6.dp)
                    .size(22.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.surface),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Filled.Check,
                    contentDescription = "In compare",
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(14.dp),
                )
            }
        }
    }
}
