package ai.strainease.app.ui.strain

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Public
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import ai.strainease.app.auth.LocalAuthSession
import ai.strainease.app.data.SavedNote
import ai.strainease.app.data.SavedStrainsStore
import ai.strainease.app.models.StrainProfile
import ai.strainease.app.ui.components.SWCard
import ai.strainease.app.ui.components.SWField
import ai.strainease.app.ui.components.SWPrimaryButton
import ai.strainease.app.ui.components.SectionLabel
import ai.strainease.app.ui.theme.StrainEaseTypography
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Per-strain "Your notes" editor. 1:1 port of the iOS
 * `TriedNotesView` (Strain/TriedNotesView.swift).
 *
 * - Lists the signed-in user's notes for this strain (read from
 *   the `SavedStrainsStore.notesFor(slug)` projection, which
 *   is backed by the `users/{uid}/savedStrains/{slug}` Firestore
 *   document's embedded `notes[]` array).
 * - Each note has a public / private toggle (globe vs. lock).
 *   Public notes are mirrored to `publicNotes/{id}` via
 *   [SavedStrainsStore.setNotePublic]; private notes stay local
 *   to the user's doc.
 * - Each note has a delete button.
 * - The draft row at the bottom writes a new note via
 *   [SavedStrainsStore.addNote] with an optional public flag.
 * - A "Note saved" toast surfaces for ~1.8s after a successful
 *   write (mirrors the iOS overlay + `sensoryFeedback(.success)`).
 */
@Composable
fun TriedNotesView(
    profile: StrainProfile,
    savedStrains: SavedStrainsStore,
    modifier: Modifier = Modifier,
) {
    val session = LocalAuthSession.current
    val authorName = session.user?.name?.takeIf { it.isNotBlank() } ?: "A patient"
    val saved by savedStrains.savedFlow.collectAsState(initial = emptyList())
    val notes = remember(saved, profile.slug) {
        saved.firstOrNull { it.slug == profile.slug }?.notes ?: emptyList()
    }
    var draft by remember { mutableStateOf("") }
    var draftPublic by remember { mutableStateOf(false) }
    var savedAt by remember { mutableStateOf(0L) }
    val scope = rememberCoroutineScope()

    // Auto-dismiss the "Note saved" toast after 1.8s.
    LaunchedEffect(savedAt) {
        if (savedAt == 0L) return@LaunchedEffect
        delay(1_800)
        savedAt = 0L
    }

    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(10.dp)) {
        SectionLabel(title = "Your notes", index = 7)
        SWCard {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    text = "Notes on how this strain felt when you tried it. Public notes are shared anonymously with other patients.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                if (notes.isEmpty()) {
                    Text(
                        text = "Nothing here yet — one sentence is enough to start a record.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                } else {
                    notes.forEach { note ->
                        NoteRow(
                            note = note,
                            onTogglePublic = { isPublic ->
                                scope.launch {
                                    savedStrains.setNotePublic(
                                        slug = profile.slug,
                                        noteId = note.id,
                                        isPublic = isPublic,
                                        authorName = authorName,
                                        strainName = profile.name,
                                    )
                                }
                            },
                            onDelete = {
                                scope.launch {
                                    savedStrains.removeNote(profile.slug, note.id)
                                }
                            },
                        )
                    }
                }
                // Draft row: text field + public toggle + Save.
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    SWField(
                        value = draft,
                        onValueChange = { draft = it.take(1999) },
                        placeholder = "How did this one treat you?",
                        modifier = Modifier.weight(1f),
                    )
                    PublicToggleChip(
                        isPublic = draftPublic,
                        enabled = draft.isNotBlank(),
                        onToggle = { draftPublic = !draftPublic },
                    )
                    SWPrimaryButton(
                        title = "Save",
                        enabled = draft.isNotBlank(),
                        onClick = {
                            val text = draft
                            val isPublic = draftPublic
                            draft = ""
                            draftPublic = false
                            scope.launch {
                                savedStrains.addNote(
                                    profile = profile,
                                    text = text,
                                    isPublic = isPublic,
                                    authorName = authorName,
                                )
                                savedAt = System.currentTimeMillis()
                            }
                        },
                    )
                }
            }
        }
    }

    // "Note saved" toast at the top of the card.
    AnimatedVisibility(
        visible = savedAt > 0L,
        enter = slideInVertically { -it } + fadeIn(),
        exit = slideOutVertically { -it } + fadeOut(),
    ) {
        Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.TopCenter) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                modifier = Modifier
                    .padding(vertical = 6.dp, horizontal = 10.dp)
                    .clip(RoundedCornerShape(50))
                    .background(MaterialTheme.colorScheme.surface)
                    .padding(horizontal = 12.dp, vertical = 6.dp),
            ) {
                Icon(
                    imageVector = Icons.Filled.Check,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(14.dp),
                )
                Text(
                    text = "Note saved",
                    style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.SemiBold),
                    color = MaterialTheme.colorScheme.onSurface,
                )
            }
        }
    }
}

@Composable
private fun NoteRow(
    note: SavedNote,
    onTogglePublic: (Boolean) -> Unit,
    onDelete: () -> Unit,
) {
    Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                text = note.text,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                text = formatNoteDate(note.createdAt),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            PublicToggleChip(
                isPublic = note.isPublic,
                enabled = true,
                onToggle = { onTogglePublic(!note.isPublic) },
            )
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(CircleShape)
                    .clickable(onClick = onDelete)
                    .padding(6.dp),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Filled.Delete,
                    contentDescription = "Delete note",
                    tint = MaterialTheme.colorScheme.error,
                    modifier = Modifier.size(16.dp),
                )
            }
        }
    }
}

@Composable
private fun PublicToggleChip(
    isPublic: Boolean,
    enabled: Boolean,
    onToggle: () -> Unit,
) {
    val label = if (isPublic) "Public" else "Private"
    val icon = if (isPublic) Icons.Filled.Public else Icons.Filled.Lock
    val tint = if (isPublic) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(
                if (isPublic) MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)
                else MaterialTheme.colorScheme.surface
            )
            .clickable(enabled = enabled, onClick = onToggle)
            .padding(horizontal = 10.dp, vertical = 6.dp),
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = tint,
            modifier = Modifier.size(14.dp),
        )
        Text(
            text = label,
            style = StrainEaseTypography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
            color = tint,
        )
    }
}

private fun formatNoteDate(millis: Long): String {
    if (millis <= 0) return ""
    val date = java.util.Date(millis)
    val format = java.text.SimpleDateFormat("MMM d", java.util.Locale.getDefault())
    return format.format(date)
}
