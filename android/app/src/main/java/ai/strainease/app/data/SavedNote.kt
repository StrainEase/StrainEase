package ai.strainease.app.data

import kotlinx.serialization.Serializable

/**
 * One patient-authored note attached to a saved strain. The same
 * shape the iOS `SavedNote` writes into the `users/{uid}/savedStrains/{slug}`
 * document's embedded `notes[]` array. Mirrored on the Android side
 * so the iOS + Android clients share the same notes when a user
 * signs in on both.
 *
 * - [text] is the body (max 1999 chars on iOS; the Firestore
 *   `publicNotes` rule caps the published copy at 2000).
 * - [isPublic] flips the note between private (only the user sees
 *   it) and public (re-published into the global `publicNotes/{id}`
 *   collection for other patients to read).
 * - [publicId] is the `publicNotes/{id}` doc id, set when the note
 *   was first published. Used to delete the public copy when the
 *   note is un-shared or removed.
 * - [createdAt] is milliseconds since epoch; the iOS code uses the
 *   same epoch-ms int wire format.
 */
@Serializable
data class SavedNote(
    val id: String,
    val text: String,
    val isPublic: Boolean = false,
    val createdAt: Long,
    val publicId: String? = null,
)
