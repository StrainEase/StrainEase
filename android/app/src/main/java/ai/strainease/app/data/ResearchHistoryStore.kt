package com.strainwise.app.data

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.strainwise.app.app.RestoredResearch
import com.strainwise.app.models.RecommendationResult
import com.strainwise.app.models.StrainComparison
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.tasks.await
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/** One row in the user's Past research list. Direct port of the
 *  iOS `HistoryEntry` struct. */
data class HistoryEntry(
    val id: String,
    val kind: HistoryKind,
    val title: String,
    val createdAt: Long,
)

enum class HistoryKind { Find, Compare;
    val wire: String get() = when (this) {
        Find -> "find"
        Compare -> "compare"
    }
    val label: String get() = when (this) {
        Find -> "Find"
        Compare -> "Compare"
    }
    companion object {
        fun parse(raw: String?): HistoryKind? = when (raw?.lowercase()) {
            "find" -> Find
            "compare" -> Compare
            else -> null
        }
    }
}

/**
 * Find / Compare history index. Mirrors the iOS
 * `ResearchHistoryStore`:
 *  - listens to `users/{uid}/history/{id}` (rule-constrained:
 *    kind in [find, compare], title < 200 chars, createdAt > 0)
 *  - `remember(find:)` / `remember(compare:)` write a row after a
 *    successful run; both the row doc and the underlying
 *    `researchResults/{id}` are written by the server-side
 *    callable that produced the result, so this client just
 *    announces the user's intent to remember it
 *  - `loadResearch(id)` reads `researchResults/{id}` and
 *    deserializes the `result` field into either a
 *    [RecommendationResult] or [StrainComparison]
 *
 * The store is **Firestore-primary** (no local cache — history
 * is the canonical record) and is auto-bound to the signed-in
 * user via [com.strainwise.app.app.AuthBound].
 */
class ResearchHistoryStore {

    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }
    private val _entries = MutableStateFlow<List<HistoryEntry>>(emptyList())
    val entries: StateFlow<List<HistoryEntry>> = _entries.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private var listener: ListenerRegistration? = null
    private var currentUid: String? = null

    fun start(uid: String) {
        if (currentUid == uid && listener != null) return
        stop()
        currentUid = uid
        listener = FirebaseFirestore.getInstance()
            .collection("users").document(uid)
            .collection("history")
            .addSnapshotListener { snap, error ->
                if (error != null) {
                    _errorMessage.value = error.localizedMessage ?: error.message
                    return@addSnapshotListener
                }
                val items = (snap?.documents ?: emptyList()).mapNotNull { doc ->
                    val data = doc.data ?: return@mapNotNull null
                    val kindRaw = data["kind"] as? String
                    val kind = HistoryKind.parse(kindRaw) ?: return@mapNotNull null
                    val title = (data["title"] as? String)?.take(199) ?: doc.id
                    val createdAt = (data["createdAt"] as? Long)
                        ?: (data["createdAt"] as? Double)?.toLong()
                        ?: 0L
                    HistoryEntry(
                        id = doc.id,
                        kind = kind,
                        title = title,
                        createdAt = createdAt,
                    )
                }.sortedByDescending { it.createdAt }
                _entries.value = items
            }
    }

    fun stop() {
        listener?.remove()
        listener = null
        currentUid = null
        _entries.value = emptyList()
        _errorMessage.value = null
    }

    /** Best-effort write of a "find" history row. Mirrors the
     *  iOS `remember(find:)`; the underlying [RecommendationResult]
     *  is in `researchResults/{id}` already (the AI callable wrote
     *  it), so we only write the index row here. */
    suspend fun remember(find: RecommendationResult, conditions: List<String>) {
        val id = find.resultId ?: return
        val title = clipTitle(titleForFind(conditions))
        writeRow(id, HistoryKind.Find, title)
    }

    suspend fun remember(compare: StrainComparison, names: List<String>, conditions: List<String>) {
        val id = compare.resultId ?: return
        val title = clipTitle(titleForCompare(names, conditions))
        writeRow(id, HistoryKind.Compare, title)
    }

    /** Read `researchResults/{id}` and return the right
     *  [RestoredResearch] variant. Returns null on a miss or
     *  decode error (caller surfaces a banner). */
    suspend fun loadResearch(id: String): RestoredResearch? {
        val uid = currentUid ?: FirebaseAuth.getInstance().currentUser?.uid ?: return null
        return try {
            val snap = FirebaseFirestore.getInstance()
                .collection("researchResults").document(id)
                .get()
                .await()
            val data = snap.data ?: return null
            decode(data)
        } catch (t: Throwable) {
            _errorMessage.value = t.localizedMessage ?: t.message
            null
        }
    }

    // --- internals ---

    private suspend fun writeRow(id: String, kind: HistoryKind, title: String) {
        val uid = currentUid ?: FirebaseAuth.getInstance().currentUser?.uid ?: return
        val createdAt = System.currentTimeMillis()
        try {
            FirebaseFirestore.getInstance()
                .collection("users").document(uid)
                .collection("history").document(id)
                .set(
                    mapOf(
                        "kind" to kind.wire,
                        "title" to title,
                        "createdAt" to createdAt,
                    ),
                )
                .await()
        } catch (t: Throwable) {
            // History is best-effort; the iOS app also drops the
            // row on error and keeps the user on the result screen.
            _errorMessage.value = t.localizedMessage ?: t.message
        }
    }

    private fun decode(data: Map<String, Any?>): RestoredResearch? {
        val kind = HistoryKind.parse(data["kind"] as? String) ?: return null
        @Suppress("UNCHECKED_CAST")
        val resultRaw = data["result"] as? Map<String, Any?> ?: return null
        val resultJson = json.encodeToString(JsonObject.serializer(), resultRaw.toJsonObject())
        val args = data["args"] as? Map<String, Any?>
        val conditions = (args?.get("conditions") as? List<*>)
            ?.mapNotNull { it as? String } ?: emptyList()
        return try {
            when (kind) {
                HistoryKind.Find -> {
                    val result = json.decodeFromString(RecommendationResult.serializer(), resultJson)
                    RestoredResearch.Find(result = result, conditions = conditions)
                }
                HistoryKind.Compare -> {
                    val result = json.decodeFromString(StrainComparison.serializer(), resultJson)
                    RestoredResearch.Compare(comparison = result)
                }
            }
        } catch (t: Throwable) {
            _errorMessage.value = "Couldn't restore that result: ${t.message}"
            null
        }
    }

    private fun Map<String, Any?>.toJsonObject(): JsonObject =
        JsonObject(
            mapValues { (_, v) -> toJsonElement(v) }
        )

    private fun toJsonElement(v: Any?): kotlinx.serialization.json.JsonElement = when (v) {
        null -> kotlinx.serialization.json.JsonNull
        is String -> JsonPrimitive(v)
        is Long -> JsonPrimitive(v)
        is Int -> JsonPrimitive(v)
        is Double -> JsonPrimitive(v)
        is Float -> JsonPrimitive(v.toDouble())
        is Boolean -> JsonPrimitive(v)
        is Map<*, *> -> {
            @Suppress("UNCHECKED_CAST")
            (v as Map<String, Any?>).toJsonObject()
        }
        is List<*> -> kotlinx.serialization.json.JsonArray(v.map { toJsonElement(it) })
        else -> JsonPrimitive(v.toString())
    }

    companion object {
        /** Matches the iOS `titleMax = 199` (Firestore rule: < 200). */
        const val TITLE_MAX = 199

        fun clipTitle(title: String): String = title.take(TITLE_MAX)

        fun titleForFind(conditions: List<String>): String {
            val joined = conditions.joinToString(", ")
            return "Best strains for $joined"
        }

        fun titleForCompare(names: List<String>, conditions: List<String>): String {
            val head = names.joinToString(" vs. ")
            if (conditions.isEmpty()) return head
            return "$head · ${conditions.joinToString(", ")}"
        }
    }
}
