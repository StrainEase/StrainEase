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

private val Context.thcSensitivityDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "strainease_thc_sensitivity",
)

private val THC_SENSITIVITY_KEY = stringPreferencesKey("thc_sensitivity_v1")

/**
 * Patient's chosen THC sensitivity for the Kaya prompts. Mirrors
 * the closed enum the web app and the iOS `ThcSensitivity` store
 * already share (`anxious-high-thc` | `experienced`); `typical`
 * (the unset state) maps to a null so the backend omits the
 * sensitivity line on the next describe call.
 *
 * Persisted to a small DataStore so the pick survives restarts
 * without a network round-trip. The TODO mirrors the ailments
 * store: when the Firestore sync lands, mirror the value into
 * `users/{uid}.thcSensitivity` and read it back from the same
 * snapshot.
 */
class ThcSensitivityStore(private val context: Context) {

    @Volatile
    private var cached: ThcSensitivity = ThcSensitivity.Typical
    val isBusy: Boolean = false

    val sensitivityFlow: Flow<ThcSensitivity> =
        context.thcSensitivityDataStore.data.map { prefs ->
            ThcSensitivity.fromRaw(prefs[THC_SENSITIVITY_KEY])
        }

    val sensitivity: ThcSensitivity
        get() = cached

    suspend fun refresh() {
        cached = sensitivityFlow.first()
    }

    suspend fun set(value: ThcSensitivity) {
        cached = value
        context.thcSensitivityDataStore.edit { prefs ->
            if (value == ThcSensitivity.Typical) {
                prefs.remove(THC_SENSITIVITY_KEY)
            } else {
                prefs[THC_SENSITIVITY_KEY] = value.rawValue
            }
        }
    }

    // Stub no-ops so the AuthBound wiring in PR #190 compiles. The
    // actual Firestore listener wiring lands in a follow-up Android
    // PR — for now the DataStore-driven local value above is the
    // single source of truth, and start(uid) / stop() simply
    // remember the active uid so the store can re-hydrate when
    // the user comes back.
    fun start(uid: String) { /* TODO: Firestore listener */ }
    fun stop() { /* TODO: Firestore listener */ }
}

enum class ThcSensitivity(val rawValue: String) {
    Typical(""),
    AnxiousHighThc("anxious-high-thc"),
    ModerateTolerance("moderate-tolerance"),
    Experienced("experienced");

    val label: String
        get() = when (this) {
            Typical -> "Not sure yet"
            AnxiousHighThc -> "THC-sensitive"
            ModerateTolerance -> "Moderate"
            Experienced -> "Experienced"
        }

    val hint: String?
        get() = when (this) {
            Typical -> "No sensitivity line. Use the default read."
            AnxiousHighThc -> "Strong THC makes me anxious, paranoid, or jittery."
            ModerateTolerance -> "Most strains work; really strong ones still feel like a lot."
            Experienced -> "I've built up real tolerance over time."
        }

    companion object {
        fun fromRaw(raw: String?): ThcSensitivity {
            if (raw.isNullOrEmpty()) return Typical
            return values().firstOrNull { it.rawValue == raw } ?: Typical
        }
    }
}
