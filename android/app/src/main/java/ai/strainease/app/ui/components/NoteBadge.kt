package ai.strainease.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import ai.strainease.app.data.SavedStrainsStore
import ai.strainease.app.models.StrainProfile
import ai.strainease.app.ui.theme.StrainEaseTypography

/**
 * Small "✎" pill that lights up next to a strain whenever the
 * signed-in user has at least one saved note on it. 1:1 port of
 * the iOS `NoteBadge` (Strain/NoteBadge.swift) that mirrors the
 * web `StrainNoteIndicator`.
 *
 * Reads from [SavedStrainsStore.notesFor] which is backed by the
 * `users/{uid}/savedStrains/{slug}` Firestore document's
 * embedded `notes[]` array. Renders nothing when the user has
 * no notes on this strain.
 *
 * Pair it inline next to any strain name (header, compare chip,
 * recommendation card, etc.) so the patient can see at a glance
 * which strains they've journaled.
 */
@Composable
fun NoteBadge(
    profile: StrainProfile,
    savedStrains: SavedStrainsStore,
    modifier: Modifier = Modifier,
    compact: Boolean = false,
) {
    val saved by savedStrains.savedFlow.collectAsState(initial = emptyList())
    val count = remember(saved, profile.slug) {
        saved.firstOrNull { it.slug == profile.slug }?.noteCount ?: 0
    }
    if (count == 0) return
    val padH = if (compact) 6.dp else 8.dp
    val padV = if (compact) 3.dp else 4.dp
    val iconSize = if (compact) 11.dp else 13.dp
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(2.dp),
        modifier = modifier
            .clip(CircleShape)
            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f))
            .border(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.35f), CircleShape)
            .padding(horizontal = padH, vertical = padV),
    ) {
        Icon(
            imageVector = Icons.Filled.Edit,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(iconSize),
        )
        if (!compact) {
            Text(
                text = count.toString(),
                style = StrainEaseTypography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
                color = MaterialTheme.colorScheme.primary,
            )
        }
    }
}
