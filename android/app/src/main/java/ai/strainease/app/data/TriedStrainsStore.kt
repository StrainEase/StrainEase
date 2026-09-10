package ai.strainease.app.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

@Serializable
data class TriedStrain(
    val id: String,
    val name: String,
    val type: String,
    val thc: String,
    val addedAt: Long,
)

private val Context.triedStrainsDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "strainease_tried_strains",
)

private val TRIED_STRAINS_KEY = stringPreferencesKey("tried_strains_v1")

/**
 * The signed-in user's tried strains. Mirrors the iOS
 * `TriedStrainsStore`. Persisted to DataStore preferences as
 * a single JSON list.
 *
 * Read sites:
 *  - FindView hydrates the Find screen with tried strains
 *  - CompareResultsView may use tried strains for context
 */
class TriedStrainsStore(private val context: Context) {

    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    @Volatile
    private var cached: List<TriedStrain> = emptyList()

    val triedStrainsFlow: Flow<List<TriedStrain>> =
        context.triedStrainsDataStore.data.map { prefs ->
            prefs[TRIED_STRAINS_KEY]?.let { decode(it) } ?: emptyList()
        }

    val triedStrains: List<TriedStrain>
        get() = cached

    suspend fun refresh() {
        cached = triedStrainsFlow.first()
    }

    suspend fun set(strains: List<TriedStrain>) {
        cached = strains
        context.triedStrainsDataStore.edit { prefs ->
            prefs[TRIED_STRAINS_KEY] = json.encodeToString(strains)
        }
    }

    suspend fun add(strain: TriedStrain) {
        if (cached.any { it.id == strain.id }) return
        val next = cached + strain
        cached = next
        context.triedStrainsDataStore.edit { prefs ->
            prefs[TRIED_STRAINS_KEY] = json.encodeToString(next)
        }
    }

    suspend fun remove(strainId: String) {
        val next = cached.filterNot { it.id == strainId }
        cached = next
        context.triedStrainsDataStore.edit { prefs ->
            prefs[TRIED_STRAINS_KEY] = json.encodeToString(next)
        }
    }

    private fun decode(raw: String): List<TriedStrain> = try {
        json.decodeFromString<List<TriedStrain>>(raw)
    } catch (t: Throwable) {
        android.util.Log.w("TriedStrainsStore", "decode failed: ${t.message}")
        emptyList()
    }

    // Stub no-ops so the AuthBound wiring compiles. See
    // SavedAilmentsStore for the parallel note.
    fun start(uid: String) { /* TODO: Firestore listener */ }
    fun stop() { /* TODO: Firestore listener */ }
}
