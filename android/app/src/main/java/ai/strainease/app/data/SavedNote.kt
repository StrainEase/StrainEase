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
 * - Notes are public "Review" card entries; [isPublic] is always true
 *   and [anonymous] decides whether the author name is shown or the
 *   review appears from "A patient".
 * - [publicId] is the `publicNotes/{id}` doc id when the review has
 *   been published to the shared collection.
 * - [rating] (1–5 stars) and [intensity] (1–5 dots) record how well
 *   it worked and how strong it felt, matching the iOS/web cards.
 * - [createdAt] is milliseconds since epoch; the iOS code uses the
 *   same epoch-ms int wire format.
 */
@Serializable
data class SavedNote(
    val id: String,
    val text: String,
    val isPublic: Boolean = true,
    val createdAt: Long,
    val publicId: String? = null,
    val anonymous: Boolean = true,
    val rating: Int = 0,
    val intensity: Int = 0,
)
