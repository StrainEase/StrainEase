package com.strainwise.app.data

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
data class SavedMedication(
    val name: String,
    val note: String? = null,
    val addedAt: Long,
)

private val Context.medicationsDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "strainease_saved_medications",
)

private val MEDICATIONS_KEY = stringPreferencesKey("medications_v1")

/**
 * The signed-in user's saved medications. Mirrors the iOS
 * `SavedMedicationsStore`. PR-A11 (Account) will add the full
 * CRUD + the per-medication card UI; PR-A7 only needs the
 * `names` projection for the Find model's
 * `medications: String` prefs field.
 */
class SavedMedicationsStore(private val context: Context) {

    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    @Volatile
    private var cached: List<SavedMedication> = emptyList()

    val medicationsFlow: Flow<List<SavedMedication>> =
        context.medicationsDataStore.data.map { prefs ->
            prefs[MEDICATIONS_KEY]?.let { decode(it) } ?: emptyList()
        }

    val medications: List<SavedMedication>
        get() = cached

    /** Comma-joined names, used as the Find prefs `medications` field. */
    val names: List<String>
        get() = cached.map { it.name }

    suspend fun refresh() {
        cached = medicationsFlow.first()
    }

    suspend fun set(meds: List<SavedMedication>) {
        cached = meds
        context.medicationsDataStore.edit { prefs ->
            prefs[MEDICATIONS_KEY] = json.encodeToString(meds)
        }
    }

    private fun decode(raw: String): List<SavedMedication> = try {
        json.decodeFromString<List<SavedMedication>>(raw)
    } catch (t: Throwable) {
        android.util.Log.w("SavedMedicationsStore", "decode failed: ${t.message}")
        emptyList()
    }
}
