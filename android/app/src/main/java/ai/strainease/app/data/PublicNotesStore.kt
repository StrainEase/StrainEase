package ai.strainease.app.data

import com.google.firebase.FirebaseApp
import com.google.firebase.firestore.FirebaseFirestore
import ai.strainease.app.services.FirebaseBootstrap
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.serialization.Serializable

/**
 * A note posted to the shared community note board for one strain.
 * Stored in Firestore at `communityNotes/{strainSlug}/notes/{id}`.
 * Mirrors the iOS `PublicNote` struct and the web's `PublicNote` type.
 */
@Serializable
data class PublicNote(
    val note: String = "",
    val authorName: String = "",
    val createdAt: Long = 0L,
)

/**
 * Firestore-backed store for community notes on a single strain.
 * 1:1 port of the iOS `PublicNotesStore` struct. Listens to the
 * `communityNotes/{strainSlug}/notes` sub-collection and emits the
 * current snapshot on subscription and after every write.
 *
 * Without Firebase the flow completes immediately with an empty list;
 * the UI handles that gracefully by rendering nothing.
 */
class PublicNotesStore {

    private fun getFirestore(): FirebaseFirestore? {
        return try {
            if (!FirebaseBootstrap.isConfigured) null
            else FirebaseFirestore.getInstance(FirebaseApp.getInstance())
        } catch (_: Throwable) {
            null
        }
    }

    /**
     * Subscribe to community notes for [strainSlug]. Emits the current
     * list immediately on subscription, then updates after each
     * Firestore write.
     */
    fun notesFlow(strainSlug: String): Flow<List<PublicNote>> = callbackFlow {
        val fs = getFirestore()
        if (fs == null) {
            trySend(emptyList())
            close()
            return@callbackFlow
        }
        val ref = fs
            .collection("communityNotes")
            .document(strainSlug)
            .collection("notes")
        val listener = ref.addSnapshotListener { snapshot, error ->
            if (error != null) {
                close(error)
                return@addSnapshotListener
            }
            val notes = snapshot?.documents?.mapNotNull { doc ->
                try {
                    PublicNote(
                        note = doc.getString("note") ?: "",
                        authorName = doc.getString("authorName") ?: "",
                        createdAt = (doc.getLong("createdAt") ?: 0L),
                    )
                } catch (_: Throwable) {
                    null
                }
            } ?: emptyList()
            trySend(notes)
        }
        awaitClose { listener.remove() }
    }
}
