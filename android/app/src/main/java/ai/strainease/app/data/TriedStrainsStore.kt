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
 * The signed-in user's tried strains list. Stores as `users/{uid}/triedStrains/{id}`
 * docs with name, type, thc, and addedAt. Mirrors the iOS `TriedStrainsStore`.
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

    /** Just the names, in display order. */
    val names: List<String>
        get() = cached.map { it.name }

    /** Flow of just the strain names. */
    val namesFlow: Flow<List<String>> = triedStrainsFlow.map { strains ->
        strains.map { it.name }
    }

    suspend fun refresh() {
        cached = triedStrainsFlow.first()
    }

    suspend fun add(strain: TriedStrain) {
        // Check for duplicates (case-insensitive)
        if (cached.any { it.name.equals(strain.name, ignoreCase = true) }) return
        val newList = listOf(strain) + cached
        cached = newList
        context.triedStrainsDataStore.edit { prefs ->
            prefs[TRIED_STRAINS_KEY] = json.encodeToString(newList)
        }
    }

    suspend fun remove(strainId: String) {
        val newList = cached.filter { it.id != strainId }
        cached = newList
        context.triedStrainsDataStore.edit { prefs ->
            prefs[TRIED_STRAINS_KEY] = json.encodeToString(newList)
        }
    }

    suspend fun set(strains: List<TriedStrain>) {
        cached = strains
        context.triedStrainsDataStore.edit { prefs ->
            prefs[TRIED_STRAINS_KEY] = json.encodeToString(strains)
        }
    }

    private fun decode(raw: String): List<TriedStrain> = try {
        json.decodeFromString<List<TriedStrain>>(raw)
    } catch (t: Throwable) {
        android.util.Log.w("TriedStrainsStore", "decode failed: ${t.message}")
        emptyList()
    }

    // Stub no-ops so the AuthBound wiring compiles. The actual Firestore
    // listener wiring lands in a follow-up Android PR.
    fun start(uid: String) { /* TODO: Firestore listener */ }
    fun stop() { /* TODO: Firestore listener */ }
}
