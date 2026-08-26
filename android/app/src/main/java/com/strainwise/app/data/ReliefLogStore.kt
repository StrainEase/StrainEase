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
data class ReliefLog(
    val strainName: String,
    val strainSlug: String,
    val notes: String,
    val rating: Int, // 0..5
    val loggedAt: Long,
)

private val Context.reliefDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "strainease_relief_log",
)

private val LOG_KEY = stringPreferencesKey("relief_log_v1")

/**
 * The user's strain-relief log. Mirrors the iOS
 * `ReliefLogStore`. PR-A11 (Account) will add the full CRUD +
 * the per-strain relief history list. PR-A7 only needs the
 * `summary` projection that Find uses to bias its prompt.
 */
class ReliefLogStore(private val context: Context) {

    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    @Volatile
    private var cached: List<ReliefLog> = emptyList()

    val logFlow: Flow<List<ReliefLog>> =
        context.reliefDataStore.data.map { prefs ->
            prefs[LOG_KEY]?.let { decode(it) } ?: emptyList()
        }

    val log: List<ReliefLog>
        get() = cached

    suspend fun refresh() {
        cached = logFlow.first()
    }

    /** Aggregated summary string the Find prompt uses to bias
     *  the recommendation. Mirrors the iOS `summary` field that
     *  `recommendStrainsForConditions` reads under the
     *  `reliefSummary` key. */
    val summary: String
        get() = log
            .sortedByDescending { it.loggedAt }
            .take(5)
            .joinToString("\n") {
                val rating = when (it.rating) {
                    0 -> "no help"
                    1 -> "a little"
                    2 -> "some"
                    3 -> "good"
                    4 -> "great"
                    else -> "excellent"
                }
                "${it.strainName}: $rating"
            }

    val tonightHint: String?
        get() {
            val tonight = log.firstOrNull { it.notes.contains("night", ignoreCase = true) }
                ?: log.firstOrNull()
            return tonight?.let {
                "Last time you tried ${it.strainName} you said \"${it.notes.take(80)}\"."
            }
        }

    suspend fun append(log: ReliefLog) {
        val next = (this.cached + log).takeLast(50)
        cached = next
        context.reliefDataStore.edit { prefs ->
            prefs[LOG_KEY] = json.encodeToString(next)
        }
    }

    fun forStrain(name: String): List<ReliefLog> =
        log.filter { it.strainName.equals(name, ignoreCase = true) }

    private fun decode(raw: String): List<ReliefLog> = try {
        json.decodeFromString<List<ReliefLog>>(raw)
    } catch (t: Throwable) {
        android.util.Log.w("ReliefLogStore", "decode failed: ${t.message}")
        emptyList()
    }
}
