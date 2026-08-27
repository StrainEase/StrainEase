package com.strainwise.app.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
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

/** Mirrors the iOS `ReliefFit` enum. Wire values are the
 *  kebab-case strings the Firestore rule accepts. */
@Serializable
enum class ReliefFit { TooWeak, JustRight, TooStrong;
    val wire: String
        get() = when (this) {
            TooWeak -> "too-weak"
            JustRight -> "just-right"
            TooStrong -> "too-strong"
        }
    val label: String
        get() = when (this) {
            TooWeak -> "Too weak"
            JustRight -> "Just right"
            TooStrong -> "Too strong"
        }
    companion object {
        fun parse(raw: String?): ReliefFit? = when (raw?.lowercase()) {
            "too-weak" -> TooWeak
            "just-right" -> JustRight
            "too-strong" -> TooStrong
            else -> null
        }
    }
}

/**
 * One patient relief-log entry. Mirrors the iOS `ReliefLog` shape
 * so the Android + iOS + web clients all read the same fields:
 *  - [strainName] is the user-typed or catalog-resolved name
 *  - [strainSlug] is the canonical slug (used for filtering
 *    per-strain on the detail page)
 *  - [conditions] are the user's saved ailments at the time of
 *    logging; the AI prompt uses this to bias the next recommend
 *  - [fit] is the patient's 3-step calibration (too-weak /
 *    just-right / too-strong) — feeds the same `reliefSummary`
 *    the iOS code builds
 *  - [relief] is a 1-5 numeric scale (the Firestore rule
 *    constrains it: 1..5)
 *  - [note] is a free-text 400-char follow-up (matches iOS cap)
 *  - [createdAt] is milliseconds since epoch; the iOS + Firestore
 *    wire format is the same integer
 *
 * Note: the `strainSlug` is kept on the Android side for local
 * filtering convenience but is not written to Firestore — the
 * iOS code only writes `strainName`, `conditions`, `fit`,
 * `relief`, `note`, `createdAt`.
 */
@Serializable
data class ReliefLog(
    val id: String,
    val strainName: String,
    val strainSlug: String,
    val conditions: List<String> = emptyList(),
    val fit: ReliefFit = ReliefFit.JustRight,
    val relief: Int,
    val note: String = "",
    val createdAt: Long,
)

private val Context.reliefDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "strainease_relief_log",
)

private val LOG_KEY = stringPreferencesKey("relief_log_v2")

/**
 * The user's strain-relief log. Mirrors the iOS `ReliefLogStore`.
 * Firestore-primary with a `DataStore` write-through cache for
 * offline reads. The new `relief_log_v2` key uses the iOS field
 * shape (`conditions`, `fit`, `relief`, `note`, `createdAt`) so
 * the local cache is interchangeable with what the Firestore
 * listener writes.
 */
class ReliefLogStore(private val context: Context) {

    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var listener: ListenerRegistration? = null
    private var currentUid: String? = null

    private val _logFlow = MutableStateFlow<List<ReliefLog>>(emptyList())

    val logFlow: Flow<List<ReliefLog>> = _logFlow.asStateFlow()

    val log: List<ReliefLog>
        get() = _logFlow.value

    suspend fun refresh() {
        if (_logFlow.value.isNotEmpty()) return
        val cached = context.reliefDataStore.data
            .map { prefs -> prefs[LOG_KEY]?.let { decode(it) } ?: emptyList() }
            .first()
        if (cached.isNotEmpty() && _logFlow.value.isEmpty()) {
            _logFlow.value = cached
        }
    }

    /** Aggregated summary string the Find prompt uses to bias the
     *  recommendation. Mirrors the iOS `summary` field that
     *  `recommendStrainsForConditions` reads under the
     *  `reliefSummary` key. */
    val summary: String
        get() = log
            .sortedByDescending { it.createdAt }
            .take(8)
            .joinToString("; ") { entry ->
                val cond = entry.conditions.firstOrNull() ?: "general"
                "${entry.strainName} for $cond: ${entry.fit.wire}, relief ${entry.relief}/5"
            }

    /**
     * "Last time" hint shown at the top of the Find tab when the
     * user has logged relief against a night-ailment (insomnia /
     * sleep). Mirrors the iOS `tonightHint` logic.
     */
    val tonightHint: String?
        get() {
            val nights = log.filter { e -> e.conditions.any { isNightCondition(it) } }
            nights.firstOrNull { it.fit == ReliefFit.JustRight && it.relief >= 4 }?.let {
                return "Last time ${it.strainName} helped your sleep. Consider it again tonight."
            }
            nights.firstOrNull { it.fit == ReliefFit.TooStrong }?.let {
                return "${it.strainName} was too strong at night — look for a gentler option."
            }
            return null
        }

    fun forStrain(name: String): List<ReliefLog> {
        val key = name.trim().lowercase()
        return log.filter { it.strainName.trim().lowercase() == key }
    }

    /**
     * Append a relief-log entry. Writes to Firestore; the
     * snapshot listener echoes the new doc back into the local
     * list.
     */
    suspend fun add(entry: ReliefLog) {
        val uid = requireUid() ?: return
        val now = System.currentTimeMillis()
        val id = entry.id.ifEmpty { "$now-${java.util.UUID.randomUUID().toString().take(6).lowercase()}" }
        val relief = entry.relief.coerceIn(1, 5)
        val strainName = entry.strainName.take(79)
        val note = entry.note.trim().take(400)
        val fit = entry.fit
        val conditions = entry.conditions.take(6)
        try {
            FirebaseFirestore.getInstance()
                .collection("users").document(uid)
                .collection("reliefLogs")
                .add(
                    mapOf(
                        "strainName" to strainName,
                        "conditions" to conditions,
                        "fit" to fit.wire,
                        "relief" to relief,
                        "note" to note,
                        "createdAt" to now,
                    ),
                )
                .await()
        } catch (t: Throwable) {
            android.util.Log.w("ReliefLogStore", "add failed: ${t.message}")
        }
    }

    suspend fun delete(id: String) {
        val uid = requireUid() ?: return
        try {
            FirebaseFirestore.getInstance()
                .collection("users").document(uid)
                .collection("reliefLogs").document(id)
                .delete()
                .await()
        } catch (t: Throwable) {
            android.util.Log.w("ReliefLogStore", "delete failed: ${t.message}")
        }
    }

    /**
     * Open an `addSnapshotListener` on the user's relief-log
     * collection. Call once the user is signed in; pair with
     * [stop] on sign-out.
     */
    fun start(uid: String) {
        if (currentUid == uid && listener != null) return
        stop()
        currentUid = uid
        listener = FirebaseFirestore.getInstance()
            .collection("users").document(uid)
            .collection("reliefLogs")
            .addSnapshotListener { snap, error ->
                if (error != null) {
                    android.util.Log.w("ReliefLogStore", "listen: ${error.message}")
                    return@addSnapshotListener
                }
                val items = (snap?.documents ?: emptyList()).mapNotNull { doc ->
                    val data = doc.data ?: return@mapNotNull null
                    parseDoc(doc.id, data)
                }.sortedByDescending { it.createdAt }
                _logFlow.value = items
                scope.launch { persist(items) }
            }
    }

    /** Detach the listener + clear the in-memory list. */
    fun stop() {
        listener?.remove()
        listener = null
        currentUid = null
        _logFlow.value = emptyList()
    }

    // --- internals ---

    private fun requireUid(): String? = currentUid
        ?: FirebaseAuth.getInstance().currentUser?.uid

    private suspend fun persist(next: List<ReliefLog>) {
        context.reliefDataStore.edit { prefs ->
            prefs[LOG_KEY] = json.encodeToString(next)
        }
    }

    private fun decode(raw: String): List<ReliefLog> = try {
        json.decodeFromString<List<ReliefLog>>(raw)
    } catch (t: Throwable) {
        android.util.Log.w("ReliefLogStore", "decode failed: ${t.message}")
        emptyList()
    }

    companion object {
        /** Matches the iOS / web `tonightHint` regex. */
        fun isNightCondition(condition: String): Boolean {
            val lower = condition.lowercase()
            return lower.contains("insomnia") || lower.contains("sleep")
        }

        fun parseDoc(id: String, data: Map<String, Any?>): ReliefLog? {
            val name = data["strainName"] as? String ?: return null
            val fitRaw = data["fit"] as? String
            val fit = ReliefFit.parse(fitRaw) ?: return null
            val relief = (data["relief"] as? Long)?.toInt()
                ?: (data["relief"] as? Double)?.toInt()
                ?: return null
            val conditions = (data["conditions"] as? List<*>)
                ?.mapNotNull { it as? String }
                ?: emptyList()
            val note = (data["note"] as? String).orEmpty()
            val createdAt = (data["createdAt"] as? Long)
                ?: (data["createdAt"] as? Double)?.toLong()
                ?: 0L
            val slug = name.trim().lowercase()
                .replace(Regex("[^a-z0-9]+"), "-")
                .trim('-')
            return ReliefLog(
                id = id,
                strainName = name,
                strainSlug = slug,
                conditions = conditions,
                fit = fit,
                relief = relief,
                note = note,
                createdAt = createdAt,
            )
        }
    }
}
