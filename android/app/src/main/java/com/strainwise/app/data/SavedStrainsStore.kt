package com.strainwise.app.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.strainwise.app.models.StrainProfile
import com.strainwise.app.models.StrainType
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

@Serializable
data class SavedStrain(
    val slug: String,
    val name: String,
    val typeWire: String? = null,
    val thcRange: String? = null,
    val imageUrl: String? = null,
    val savedAt: Long,
    val notes: List<SavedNote> = emptyList(),
) {
    fun toProfile(): StrainProfile = StrainProfile(
        name = name,
        inKnowledgeBase = true,
        type = typeWire?.let { StrainType.parse(it) },
        thcRange = thcRange,
        imageUrl = imageUrl,
    )
}

private val Context.savedStrainsDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "strainease_saved_strains",
)

private val SAVED_STRAINS_KEY = stringPreferencesKey("saved_strains_v1")

/**
 * "Liked" strain list. Mirrors the iOS `SavedStrainsStore`:
 *  - the heart toggle on StrainDetailView adds / removes
 *  - the Home rail badge + the Account "Saved strains" sheet
 *    read the list back
 *  - per-strain patient notes (with public/private toggle) live
 *    alongside the saved-strain record in the
 *    `users/{uid}/savedStrains/{slug}` Firestore document
 *
 * The store is **Firestore-primary** with a `DataStore` write-
 * through cache for offline reads:
 *  - `start(uid)` opens a `addSnapshotListener` on
 *    `users/{uid}/savedStrains` and exposes the merged view
 *    (strain fields + the embedded `notes[]` array) through
 *    [savedFlow] / [saved]
 *  - every write goes to Firestore; the listener echoes it back
 *    into the StateFlow so the UI doesn't need to update locally
 *  - `stop()` removes the listener and clears the in-memory list
 *    (sign-out path)
 *
 * The atomic-write contract is the same one the iOS code uses:
 * strain fields and the appended notes are written in a single
 * `setData(_:merge:true)` so the snapshot listener cannot fire
 * between the two writes and clobber the notes.
 */
class SavedStrainsStore(private val context: Context) {

    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var listener: ListenerRegistration? = null
    private var currentUid: String? = null

    private val _savedFlow = MutableStateFlow<List<SavedStrain>>(emptyList())

    /**
     * Read-only view of the saved-strains list. The iOS code uses
     * `@Published private(set) var items: [SavedStrainItem]`; the
     * Android equivalent is a read-only `StateFlow` that the
     * snapshot listener populates.
     */
    val savedFlow: Flow<List<SavedStrain>> = _savedFlow.asStateFlow()

    val saved: List<SavedStrain>
        get() = _savedFlow.value

    /** One-time read of the local cache. Used on cold start to
     *  paint before the Firestore listener emits. */
    suspend fun refresh() {
        if (_savedFlow.value.isNotEmpty()) return
        val cached = context.savedStrainsDataStore.data
            .map { prefs -> prefs[SAVED_STRAINS_KEY]?.let { decode(it) } ?: emptyList() }
            .first()
        if (cached.isNotEmpty() && _savedFlow.value.isEmpty()) {
            _savedFlow.value = cached
        }
    }

    fun isSaved(slug: String): Boolean = _savedFlow.value.any { it.slug == slug }

    suspend fun add(profile: StrainProfile) {
        val uid = requireUid() ?: return
        if (isSaved(profile.slug)) return
        val payload = documentFor(profile)
        try {
            FirebaseFirestore.getInstance()
                .collection("users").document(uid)
                .collection("savedStrains").document(profile.slug)
                .set(payload, com.google.firebase.firestore.SetOptions.merge())
                .await()
        } catch (t: Throwable) {
            android.util.Log.w("SavedStrainsStore", "add failed: ${t.message}")
        }
    }

    suspend fun remove(slug: String) {
        val uid = requireUid() ?: return
        try {
            // Cascade: drop any published public notes for this strain
            val strainNotes = _savedFlow.value.firstOrNull { it.slug == slug }?.notes ?: emptyList()
            for (note in strainNotes) {
                note.publicId?.let { publicId ->
                    runCatching {
                        FirebaseFirestore.getInstance()
                            .collection("publicNotes").document(publicId)
                            .delete()
                            .await()
                    }
                }
            }
            FirebaseFirestore.getInstance()
                .collection("users").document(uid)
                .collection("savedStrains").document(slug)
                .delete()
                .await()
        } catch (t: Throwable) {
            android.util.Log.w("SavedStrainsStore", "remove failed: ${t.message}")
        }
    }

    suspend fun toggle(profile: StrainProfile) {
        if (isSaved(profile.slug)) remove(profile.slug) else add(profile)
    }

    fun notesFor(slug: String): List<SavedNote> =
        _savedFlow.value.firstOrNull { it.slug == slug }?.notes ?: emptyList()

    /**
     * Append a note to a saved strain. The strain is auto-saved if
     * the user hadn't already hearted it. Single atomic write that
     * carries the strain fields + the merged notes list so the
     * snapshot listener cannot race and clobber the notes (the iOS
     * `addNotePayload` does the same thing — see iOS
     * `SavedStrainsStore.swift:386-399`).
     */
    suspend fun addNote(
        profile: StrainProfile,
        text: String,
        isPublic: Boolean = false,
        authorName: String = "A patient",
    ) {
        val uid = requireUid() ?: return
        val trimmed = text.trim().take(1999)
        if (trimmed.isEmpty()) return
        val now = System.currentTimeMillis()
        var note = SavedNote(
            id = "$now-${java.util.UUID.randomUUID().toString().take(6).lowercase()}",
            text = trimmed,
            isPublic = false,
            createdAt = now,
        )
        // Auto-save the strain if it's not yet liked.
        val current = _savedFlow.value.firstOrNull { it.slug == profile.slug }
        val mergedNotes: List<SavedNote> = (current?.notes ?: emptyList()) + note
        if (isPublic) {
            try {
                val strainKey = StrainProfile(
                    name = profile.name,
                    inKnowledgeBase = true,
                ).slug
                val publicId = FirebaseFirestore.getInstance()
                    .collection("publicNotes")
                    .add(
                        mapOf(
                            "strainKey" to strainKey,
                            "strainName" to profile.name,
                            "note" to trimmed.take(1999),
                            "authorName" to (if (authorName.isBlank()) "A patient" else authorName),
                            "uid" to uid,
                            "createdAt" to now,
                        ),
                    )
                    .await()
                    .id
                note = note.copy(isPublic = true, publicId = publicId)
            } catch (t: Throwable) {
                android.util.Log.w("SavedStrainsStore", "public-note publish failed: ${t.message}")
            }
        }
        val finalNotes = mergedNotes.map { if (it.id == note.id) note else it }
        val payload = addNotePayload(profile, finalNotes, savedAt = current?.savedAt ?: now)
        try {
            FirebaseFirestore.getInstance()
                .collection("users").document(uid)
                .collection("savedStrains").document(profile.slug)
                .set(payload, com.google.firebase.firestore.SetOptions.merge())
                .await()
        } catch (t: Throwable) {
            android.util.Log.w("SavedStrainsStore", "addNote failed: ${t.message}")
        }
    }

    /** Flip a note between public and private. */
    suspend fun setNotePublic(
        slug: String,
        noteId: String,
        isPublic: Boolean,
        authorName: String,
        strainName: String,
    ) {
        val uid = requireUid() ?: return
        val current = _savedFlow.value.firstOrNull { it.slug == slug } ?: return
        val idx = current.notes.indexOfFirst { it.id == noteId }
        if (idx < 0) return
        val previous = current.notes[idx]
        val strainProfile = current.toProfile()
        var updated = previous.copy(isPublic = isPublic)
        if (isPublic && updated.publicId == null) {
            try {
                val strainKey = StrainProfile(name = strainName, inKnowledgeBase = true).slug
                val publicId = FirebaseFirestore.getInstance()
                    .collection("publicNotes")
                    .add(
                        mapOf(
                            "strainKey" to strainKey,
                            "strainName" to strainName,
                            "note" to updated.text.take(1999),
                            "authorName" to (if (authorName.isBlank()) "A patient" else authorName),
                            "uid" to uid,
                            "createdAt" to updated.createdAt,
                        ),
                    )
                    .await()
                    .id
                updated = updated.copy(isPublic = true, publicId = publicId)
            } catch (t: Throwable) {
                android.util.Log.w("SavedStrainsStore", "publish failed: ${t.message}")
                return
            }
        } else if (!isPublic && updated.publicId != null) {
            runCatching {
                FirebaseFirestore.getInstance()
                    .collection("publicNotes").document(updated.publicId!!)
                    .delete()
                    .await()
            }
            updated = updated.copy(isPublic = false, publicId = null)
        }
        val nextNotes = current.notes.toMutableList().also { it[idx] = updated }
        try {
            FirebaseFirestore.getInstance()
                .collection("users").document(uid)
                .collection("savedStrains").document(slug)
                .set(
                    mapOf("notes" to nextNotes.map { noteDocument(it) }),
                    com.google.firebase.firestore.SetOptions.merge(),
                )
                .await()
        } catch (t: Throwable) {
            android.util.Log.w("SavedStrainsStore", "setNotePublic failed: ${t.message}")
        }
    }

    suspend fun removeNote(slug: String, noteId: String) {
        val uid = requireUid() ?: return
        val current = _savedFlow.value.firstOrNull { it.slug == slug } ?: return
        val removed = current.notes.firstOrNull { it.id == noteId }
        val nextNotes = current.notes.filterNot { it.id == noteId }
        if (nextNotes.isEmpty() && removed == null) return
        // Unpublish the public copy if needed
        removed?.publicId?.let { publicId ->
            runCatching {
                FirebaseFirestore.getInstance()
                    .collection("publicNotes").document(publicId)
                    .delete()
                    .await()
            }
        }
        try {
            // If the strain has no notes left, drop the embedded
            // `notes` field entirely so the Firestore doc matches
            // the iOS `saveStrain` payload (which omits `notes`).
            if (nextNotes.isEmpty()) {
                FirebaseFirestore.getInstance()
                    .collection("users").document(uid)
                    .collection("savedStrains").document(slug)
                    .update("notes", FieldValue.delete())
                    .await()
            } else {
                FirebaseFirestore.getInstance()
                    .collection("users").document(uid)
                    .collection("savedStrains").document(slug)
                    .set(
                        mapOf("notes" to nextNotes.map { noteDocument(it) }),
                        com.google.firebase.firestore.SetOptions.merge(),
                    )
                    .await()
            }
        } catch (t: Throwable) {
            android.util.Log.w("SavedStrainsStore", "removeNote failed: ${t.message}")
        }
    }

    /**
     * Open a `addSnapshotListener` on the user's saved-strains
     * collection. Call once the user is signed in; pair with
     * [stop] on sign-out.
     */
    fun start(uid: String) {
        if (currentUid == uid && listener != null) return
        stop()
        currentUid = uid
        listener = FirebaseFirestore.getInstance()
            .collection("users").document(uid)
            .collection("savedStrains")
            .addSnapshotListener { snap, error ->
                if (error != null) {
                    android.util.Log.w("SavedStrainsStore", "listen: ${error.message}")
                    return@addSnapshotListener
                }
                val items = (snap?.documents ?: emptyList()).mapNotNull { doc ->
                    val data = doc.data ?: return@mapNotNull null
                    parse(doc.id, data)
                }.sortedByDescending { it.savedAt }
                _savedFlow.value = items
                // Mirror to the local cache so a cold start can
                // paint before the listener emits.
                scope.launch { persist(items) }
            }
    }

    /** Detach the listener + clear the in-memory list. */
    fun stop() {
        listener?.remove()
        listener = null
        currentUid = null
        _savedFlow.value = emptyList()
    }

    // --- internals ---

    private fun requireUid(): String? = currentUid
        ?: FirebaseAuth.getInstance().currentUser?.uid

    private suspend fun persist(next: List<SavedStrain>) {
        context.savedStrainsDataStore.edit { prefs ->
            prefs[SAVED_STRAINS_KEY] = json.encodeToString(next)
        }
    }

    private fun decode(raw: String): List<SavedStrain> = try {
        json.decodeFromString<List<SavedStrain>>(raw)
    } catch (t: Throwable) {
        android.util.Log.w("SavedStrainsStore", "decode failed: ${t.message}")
        emptyList()
    }

    companion object {
        /** Mirrors the iOS `document(for:)` payload. Notes are
         *  omitted so a re-save doesn't clobber them. */
        fun documentFor(profile: StrainProfile, savedAt: Long = System.currentTimeMillis()): Map<String, Any?> = mapOf(
            "name" to profile.name,
            "type" to (profile.type?.wire ?: StrainType.Hybrid.wire),
            "thcRange" to profile.thcRange,
            "imageUrl" to profile.imageUrl,
            "savedAt" to savedAt,
        )

        fun noteDocument(note: SavedNote): Map<String, Any?> {
            val out = mutableMapOf<String, Any?>(
                "id" to note.id,
                "text" to note.text,
                "isPublic" to note.isPublic,
                "createdAt" to note.createdAt,
            )
            note.publicId?.let { out["publicId"] = it }
            return out
        }

        /** Single atomic write payload: strain fields + merged notes. */
        fun addNotePayload(
            profile: StrainProfile,
            notes: List<SavedNote>,
            savedAt: Long,
        ): Map<String, Any?> {
            val base = documentFor(profile, savedAt).toMutableMap()
            base["notes"] = notes.map { noteDocument(it) }
            return base
        }

        fun parse(slug: String, data: Map<String, Any?>): SavedStrain? {
            val name = (data["name"] as? String) ?: return null
            val typeWire = data["type"] as? String
            val thcRange = data["thcRange"] as? String
            val imageUrl = data["imageUrl"] as? String
            val savedAt = (data["savedAt"] as? Long) ?: 0L
            val notesRaw = data["notes"]
            val notes = parseNotes(notesRaw)
            return SavedStrain(
                slug = slug,
                name = name,
                typeWire = typeWire,
                thcRange = thcRange,
                imageUrl = imageUrl,
                savedAt = savedAt,
                notes = notes,
            )
        }

        private fun parseNotes(raw: Any?): List<SavedNote> {
            val list = raw as? List<*> ?: return emptyList()
            return list.mapNotNull { entry ->
                val m = entry as? Map<*, *> ?: return@mapNotNull null
                val id = m["id"] as? String ?: return@mapNotNull null
                val text = m["text"] as? String ?: return@mapNotNull null
                val isPublic = m["isPublic"] as? Boolean ?: false
                val createdAt = (m["createdAt"] as? Long) ?: 0L
                val publicId = m["publicId"] as? String
                SavedNote(id = id, text = text, isPublic = isPublic, createdAt = createdAt, publicId = publicId)
            }
        }
    }
}
