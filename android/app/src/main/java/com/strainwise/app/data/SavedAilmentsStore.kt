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
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private val Context.ailmentsDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "strainease_saved_ailments",
)

private val AILMENTS_KEY = stringPreferencesKey("ailments_v1")

/**
 * The signed-in user's saved ailments. Mirrors the iOS
 * `SavedAilmentsStore`. Persisted to DataStore preferences as
 * a single JSON list so the order is preserved and the list can
 * grow unbounded (no artificial cap; the iOS source doesn't
 * cap it either).
 *
 * Read sites:
 *  - FindModel.hydrateAilmentsIfNeeded seeds the Find screen
 *  - HomeModel uses the list to render the For-Your-Symptoms
 *    rail + the ailment carousel
 */
class SavedAilmentsStore(private val context: Context) {

    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    @Volatile
    private var cached: List<String> = emptyList()

    val ailmentsFlow: Flow<List<String>> =
        context.ailmentsDataStore.data.map { prefs ->
            prefs[AILMENTS_KEY]?.let { decode(it) } ?: emptyList()
        }

    val ailments: List<String>
        get() = cached

    suspend fun refresh() {
        cached = ailmentsFlow.first()
    }

    suspend fun set(ailments: List<String>) {
        val cleaned = ailments.map { it.trim() }.filter { it.isNotEmpty() }.distinct()
        cached = cleaned
        context.ailmentsDataStore.edit { prefs ->
            prefs[AILMENTS_KEY] = json.encodeToString(cleaned)
        }
    }

    suspend fun add(ailment: String) {
        val trimmed = ailment.trim()
        if (trimmed.isEmpty()) return
        if (cached.any { it.equals(trimmed, ignoreCase = true) }) return
        val next = cached + trimmed
        cached = next
        context.ailmentsDataStore.edit { prefs ->
            prefs[AILMENTS_KEY] = json.encodeToString(next)
        }
    }

    suspend fun remove(ailment: String) {
        val next = cached.filterNot { it.equals(ailment, ignoreCase = true) }
        cached = next
        context.ailmentsDataStore.edit { prefs ->
            prefs[AILMENTS_KEY] = json.encodeToString(next)
        }
    }

    private fun decode(raw: String): List<String> = try {
        json.decodeFromString<List<String>>(raw)
    } catch (t: Throwable) {
        android.util.Log.w("SavedAilmentsStore", "decode failed: ${t.message}")
        emptyList()
    }
}
