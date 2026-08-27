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
 * Firestore-primary with a `DataStore` write-through cache:
 *  - `start(uid)` opens an `addSnapshotListener` on the
 *    `users/{uid}` document, reading the `ailments` array. Writes
 *    land in Firestore with a merged `ailments` + `ailmentsUpdatedAt`
 *    payload, matching the iOS shape and the rule constraint
 *    (`ailments.size() <= 16`, `ailmentsUpdatedAt > 0`).
 *  - Local cache is written-through so a cold start paints
 *    before the first listener emit.
 *
 * Read sites:
 *  - FindModel.hydrateAilmentsIfNeeded seeds the Find screen
 *  - HomeModel uses the list to render the For-Your-Symptoms
 *    rail + the ailment carousel
 */
class SavedAilmentsStore(private val context: Context) {

    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var listener: ListenerRegistration? = null
    private var currentUid: String? = null

    private val _ailmentsFlow = MutableStateFlow<List<String>>(emptyList())

    val ailmentsFlow: Flow<List<String>> = _ailmentsFlow.asStateFlow()

    val ailments: List<String>
        get() = _ailmentsFlow.value

    /** One-time read of the local cache. */
    suspend fun refresh() {
        if (_ailmentsFlow.value.isNotEmpty()) return
        val cached = context.ailmentsDataStore.data
            .map { prefs -> prefs[AILMENTS_KEY]?.let { decode(it) } ?: emptyList() }
            .first()
        if (cached.isNotEmpty() && _ailmentsFlow.value.isEmpty()) {
            _ailmentsFlow.value = cached
        }
    }

    suspend fun set(ailments: List<String>) {
        val cleaned = normalize(ailments)
        writeFirestore(cleaned)
    }

    suspend fun add(ailment: String) {
        val trimmed = ailment.trim()
        if (trimmed.isEmpty()) return
        val current = _ailmentsFlow.value
        if (current.any { it.equals(trimmed, ignoreCase = true) }) return
        writeFirestore(current + trimmed)
    }

    suspend fun remove(ailment: String) {
        val next = _ailmentsFlow.value.filterNot { it.equals(ailment, ignoreCase = true) }
        writeFirestore(next)
    }

    suspend fun toggle(ailment: String) {
        val current = _ailmentsFlow.value
        if (current.any { it.equals(ailment, ignoreCase = true) }) {
            remove(ailment)
        } else {
            add(ailment)
        }
    }

    /**
     * Open an `addSnapshotListener` on the user's document, reading
     * the `ailments` field. Call once the user is signed in; pair
     * with [stop] on sign-out.
     */
    fun start(uid: String) {
        if (currentUid == uid && listener != null) return
        stop()
        currentUid = uid
        listener = FirebaseFirestore.getInstance()
            .collection("users").document(uid)
            .addSnapshotListener { snap, error ->
                if (error != null) {
                    android.util.Log.w("SavedAilmentsStore", "listen: ${error.message}")
                    return@addSnapshotListener
                }
                val list = snap?.get("ailments") as? List<*>
                val normalized = normalize(list?.mapNotNull { it as? String } ?: emptyList())
                _ailmentsFlow.value = normalized
                scope.launch { persist(normalized) }
            }
    }

    /** Detach the listener + clear the in-memory list. */
    fun stop() {
        listener?.remove()
        listener = null
        currentUid = null
        _ailmentsFlow.value = emptyList()
    }

    // --- internals ---

    private fun requireUid(): String? = currentUid
        ?: FirebaseAuth.getInstance().currentUser?.uid

    private suspend fun writeFirestore(next: List<String>) {
        val uid = requireUid() ?: return
        val normalized = normalize(next)
        try {
            FirebaseFirestore.getInstance()
                .collection("users").document(uid)
                .set(
                    mapOf(
                        "ailments" to normalized,
                        "ailmentsUpdatedAt" to System.currentTimeMillis(),
                    ),
                    com.google.firebase.firestore.SetOptions.merge(),
                )
                .await()
        } catch (t: Throwable) {
            android.util.Log.w("SavedAilmentsStore", "write failed: ${t.message}")
        }
    }

    private suspend fun persist(next: List<String>) {
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

    companion object {
        // Mirrors iOS `SavedAilmentsStore.normalize`:
        //  - trim + length cap (47)
        //  - drop empties
        //  - case-insensitive dedupe
        //  - hard cap at 16 (Firestore rule allows <= 16)
        const val MAX_AILMENTS = 16
        const val MAX_LEN = 47

        fun normalize(list: List<String>): List<String> {
            val seen = mutableSetOf<String>()
            val out = mutableListOf<String>()
            for (raw in list) {
                val name = raw.trim().take(MAX_LEN)
                if (name.isEmpty()) continue
                val key = name.lowercase()
                if (seen.add(key)) {
                    out.add(name)
                    if (out.size >= MAX_AILMENTS) break
                }
            }
            return out
        }
    }
}
