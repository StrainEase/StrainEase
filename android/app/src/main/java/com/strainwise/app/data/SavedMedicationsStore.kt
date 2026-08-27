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

@Serializable
data class SavedMedication(
    val id: String,
    val name: String,
    val addedAt: Long,
)

private val Context.medicationsDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "strainease_saved_medications",
)

private val MEDICATIONS_KEY = stringPreferencesKey("medications_v2")

/**
 * The signed-in user's saved medications. Mirrors the iOS
 * `SavedMedicationsStore`. Firestore-primary with a `DataStore`
 * write-through cache:
 *  - `start(uid)` opens an `addSnapshotListener` on
 *    `users/{uid}/medications`, reading `name` + `addedAt` per doc
 *  - Writes land in Firestore; the listener echoes the new doc
 *    back into the in-memory list
 *  - The cache key is `medications_v2` (was `v1` with a different
 *    shape) so the upgrade doesn't try to decode the old JSON
 */
class SavedMedicationsStore(private val context: Context) {

    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var listener: ListenerRegistration? = null
    private var currentUid: String? = null

    private val _medicationsFlow = MutableStateFlow<List<SavedMedication>>(emptyList())

    val medicationsFlow: Flow<List<SavedMedication>> = _medicationsFlow.asStateFlow()

    val medications: List<SavedMedication>
        get() = _medicationsFlow.value

    /** Comma-joined names, used as the Find prefs `medications` field. */
    val names: List<String>
        get() = _medicationsFlow.value.map { it.name }

    /** Single-string projection matching iOS `joinedNames`. */
    val joinedNames: String
        get() = names.joinToString(", ")

    /** One-time read of the local cache. */
    suspend fun refresh() {
        if (_medicationsFlow.value.isNotEmpty()) return
        val cached = context.medicationsDataStore.data
            .map { prefs -> prefs[MEDICATIONS_KEY]?.let { decode(it) } ?: emptyList() }
            .first()
        if (cached.isNotEmpty() && _medicationsFlow.value.isEmpty()) {
            _medicationsFlow.value = cached
        }
    }

    suspend fun set(meds: List<SavedMedication>) {
        // Replace the whole list. Used by the inline Account editor
        // that re-orders and removes items in one shot.
        val uid = requireUid() ?: return
        try {
            // Diff: delete removed, keep existing, add new. We
            // write each add/delete individually because the rules
            // don't allow batched update on this collection.
            val current = _medicationsFlow.value
            val currentIds = current.map { it.id }.toSet()
            val nextIds = meds.map { it.id }.toSet()
            val removed = current.filter { it.id !in nextIds }
            for (item in removed) {
                runCatching {
                    FirebaseFirestore.getInstance()
                        .collection("users").document(uid)
                        .collection("medications").document(item.id)
                        .delete()
                        .await()
                }
            }
            for (item in meds) {
                if (item.id in currentIds) continue
                runCatching {
                    FirebaseFirestore.getInstance()
                        .collection("users").document(uid)
                        .collection("medications")
                        .add(
                            mapOf(
                                "name" to item.name.take(79),
                                "addedAt" to item.addedAt,
                            ),
                        )
                        .await()
                }
            }
        } catch (t: Throwable) {
            android.util.Log.w("SavedMedicationsStore", "set failed: ${t.message}")
        }
    }

    suspend fun add(name: String) {
        val uid = requireUid() ?: return
        val trimmed = name.trim().take(79)
        if (trimmed.isEmpty()) return
        if (_medicationsFlow.value.any { it.name.equals(trimmed, ignoreCase = true) }) return
        val addedAt = System.currentTimeMillis()
        try {
            FirebaseFirestore.getInstance()
                .collection("users").document(uid)
                .collection("medications")
                .add(
                    mapOf("name" to trimmed, "addedAt" to addedAt),
                )
                .await()
        } catch (t: Throwable) {
            android.util.Log.w("SavedMedicationsStore", "add failed: ${t.message}")
        }
    }

    suspend fun remove(item: SavedMedication) {
        val uid = requireUid() ?: return
        try {
            FirebaseFirestore.getInstance()
                .collection("users").document(uid)
                .collection("medications").document(item.id)
                .delete()
                .await()
        } catch (t: Throwable) {
            android.util.Log.w("SavedMedicationsStore", "remove failed: ${t.message}")
        }
    }

    /**
     * Open an `addSnapshotListener` on the user's medications
     * collection. Call once the user is signed in; pair with
     * [stop] on sign-out.
     */
    fun start(uid: String) {
        if (currentUid == uid && listener != null) return
        stop()
        currentUid = uid
        listener = FirebaseFirestore.getInstance()
            .collection("users").document(uid)
            .collection("medications")
            .addSnapshotListener { snap, error ->
                if (error != null) {
                    android.util.Log.w("SavedMedicationsStore", "listen: ${error.message}")
                    return@addSnapshotListener
                }
                val items = (snap?.documents ?: emptyList()).mapNotNull { doc ->
                    val data = doc.data ?: return@mapNotNull null
                    val name = (data["name"] as? String) ?: return@mapNotNull null
                    val addedAt = (data["addedAt"] as? Long) ?: 0L
                    SavedMedication(id = doc.id, name = name, addedAt = addedAt)
                }.sortedByDescending { it.addedAt }
                _medicationsFlow.value = items
                scope.launch { persist(items) }
            }
    }

    /** Detach the listener + clear the in-memory list. */
    fun stop() {
        listener?.remove()
        listener = null
        currentUid = null
        _medicationsFlow.value = emptyList()
    }

    // --- internals ---

    private fun requireUid(): String? = currentUid
        ?: FirebaseAuth.getInstance().currentUser?.uid

    private suspend fun persist(next: List<SavedMedication>) {
        context.medicationsDataStore.edit { prefs ->
            prefs[MEDICATIONS_KEY] = json.encodeToString(next)
        }
    }

    private fun decode(raw: String): List<SavedMedication> = try {
        json.decodeFromString<List<SavedMedication>>(raw)
    } catch (t: Throwable) {
        android.util.Log.w("SavedMedicationsStore", "decode failed: ${t.message}")
        emptyList()
    }
}
