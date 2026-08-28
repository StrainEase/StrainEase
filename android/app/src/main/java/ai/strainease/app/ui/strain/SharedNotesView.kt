package ai.strainease.app.ui.strain

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ai.strainease.app.data.PublicNote
import ai.strainease.app.data.PublicNotesStore
import ai.strainease.app.ui.components.SectionLabel
import ai.strainease.app.ui.components.SWCard
import kotlinx.coroutines.flow.collectLatest

/**
 * Community notes for a strain, sourced from Firestore.
 * 1:1 port of the iOS `SharedNotesView`. Listens to
 * `communityNotes/{strainSlug}/notes` and renders each note card
 * with the author name. Falls back to empty when Firebase isn't
 * configured or no notes exist.
 */
@Composable
fun SharedNotesView(
    strainSlug: String,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val store = remember { PublicNotesStore() }
    var notes by remember { mutableStateOf<List<PublicNote>>(emptyList()) }

    LaunchedEffect(strainSlug) {
        store.notesFlow(strainSlug).collectLatest { notes = it }
    }

    DisposableEffect(Unit) {
        onDispose {
            // Flow is cancelled automatically; nothing else to clean up.
        }
    }

    if (notes.isEmpty()) return

    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        SectionLabel(title = "Patient community notes")
        notes.forEach { note ->
            SWCard {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text(
                        text = note.note,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    Text(
                        text = note.authorName.uppercase(),
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontSize = 10.sp,
                            fontWeight = FontWeight.SemiBold,
                            letterSpacing = 1.1.sp,
                        ),
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
            }
        }
    }
}
