package ai.strainease.app.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import ai.strainease.app.models.StrainProfile
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
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
    val noteCount: Int = 0,
    val notes: List<SavedNote> = emptyList(),
    val savedAt: Long,
) {
    fun toProfile(): StrainProfile = StrainProfile(
        name = name,
        inKnowledgeBase = true,
        type = typeWire?.let { ai.strainease.app.models.StrainType.parse(it) },
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
 *  - the Home rail badge + the Account "Saved strains"
 *    sheet read the list back
 *
 * The "isSaved" check is by slug so the same strain can be
 * toggled across screens without race conditions.
 */
class SavedStrainsStore(private val context: Context) {

    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    @Volatile
    private var cached: List<SavedStrain> = emptyList()

    val savedFlow: Flow<List<SavedStrain>> =
        context.savedStrainsDataStore.data.map { prefs ->
            prefs[SAVED_STRAINS_KEY]?.let { decode(it) } ?: emptyList()
        }

    val saved: List<SavedStrain>
        get() = cached

    suspend fun refresh() {
        cached = savedFlow.first()
    }

    fun isSaved(slug: String): Boolean = cached.any { it.slug == slug }

    suspend fun add(profile: StrainProfile) {
        if (isSaved(profile.slug)) return
        val next = listOf(
            SavedStrain(
                slug = profile.slug,
                name = profile.name,
                typeWire = profile.type?.wire,
                thcRange = profile.thcRange,
                imageUrl = profile.imageUrl,
                savedAt = System.currentTimeMillis(),
            ),
        ) + cached
        cached = next
        persist(next)
    }

    suspend fun remove(slug: String) {
        val next = cached.filterNot { it.slug == slug }
        cached = next
        persist(next)
    }

    suspend fun toggle(profile: StrainProfile) {
        if (isSaved(profile.slug)) remove(profile.slug) else add(profile)
    }

    fun notesFor(slug: String): Int =
        cached.firstOrNull { it.slug == slug }?.noteCount ?: 0

    // Per-strain patient notes. The full implementation (Firestore +
    // DataStore mirror + ReliefLogStore integration) is the next
    // Android parity slice. For now these are no-ops so the
    // `TriedNotesView` preview can compile and the build stays
    // green — the per-source rating work in this branch doesn't
    // depend on them.
    suspend fun addNote(
        profile: ai.strainease.app.models.StrainProfile,
        text: String,
        isPublic: Boolean,
        authorName: String,
    ) = Unit

    suspend fun removeNote(slug: String, noteId: String) = Unit

    // Stub no-ops so the AuthBound wiring in PR #190 compiles. See
    // SavedAilmentsStore for the parallel note.
    fun start(uid: String) { /* TODO: Firestore listener */ }
    fun stop() { /* TODO: Firestore listener */ }

    suspend fun setNotePublic(
        slug: String,
        noteId: String,
        isPublic: Boolean,
        authorName: String,
        strainName: String,
    ) = Unit

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
}
