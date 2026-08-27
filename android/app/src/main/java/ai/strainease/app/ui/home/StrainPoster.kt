package ai.strainease.app.ui.home

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ai.strainease.app.models.StrainProfile
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
 */
@Composable
fun StrainPoster(
    profile: StrainProfile,
    modifier: Modifier = Modifier,
    compact: Boolean = false,
    photoHeight: Dp? = null,
    onClick: (() -> Unit)? = null,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .let { if (onClick != null) it.clickable(onClick = onClick) else it },
        verticalArrangement = Arrangement.spacedBy(if (compact) 6.dp else 8.dp),
    ) {
        StrainPhoto(
            urlString = profile.imageUrl,
            type = profile.type,
            height = photoHeight ?: if (compact) 108.dp else 132.dp,
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
}
