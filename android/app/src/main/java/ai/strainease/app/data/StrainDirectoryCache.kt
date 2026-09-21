package ai.strainease.app.data

import android.util.Log
import com.google.firebase.FirebaseApp
import com.google.firebase.firestore.FirebaseFirestore
import ai.strainease.app.models.StrainProfile
import ai.strainease.app.models.StrainType
import ai.strainease.app.services.FirebaseBootstrap
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

/**
 * Per-type strain directory cache. Reads three Firestore documents
 * (`strainDirectory/byType/{indica,sativa,hybrid}/current`) written by
 * the daily `warmStrainDirectory` Cloud Function and publishes them as
 * a [StateFlow] so [StrainCatalog.merge] prefers the Firestore bucket
 * over the bundled `strain-directory.json` snapshot.
 *
 * Mirrors:
 *   - iOS  `ios/StrainEase/Services/StrainDirectoryCache.swift`
 *   - Web  `src/lib/strain-cache.ts` (read) + `src/lib/strain-catalog.ts` (resolve)
 *
 * Initialised once from `StrainEaseApplication.onCreate` via
 * [StrainCatalog.init], after `FirebaseBootstrap.configure` has run.
 * Without Firebase (or before init completes) `profilesFor` returns an
 * empty list and `StrainCatalog.merge` falls back to the bundled JSON.
 */
object StrainDirectoryCache {

    private const val TAG = "StrainDirectoryCache"
    private const val COLLECTION = "strainDirectory"
    private const val BY_TYPE_DOC = "byType"
    private const val SUBDOC = "current"
    private const val TTL_MS = 24L * 60L * 60L * 1000L // 24 hours, matches iOS/web

    /** Firestore type names are lowercase to match the backend
     *  `partitionByType` keys (functions/src/strain-directory-cache.ts). */
    private fun collectionName(type: StrainType): String = when (type) {
        StrainType.Indica -> "indica"
        StrainType.Sativa -> "sativa"
        StrainType.Hybrid -> "hybrid"
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val _byType = MutableStateFlow<Map<StrainType, List<StrainProfile>>>(emptyMap())
    val byType: StateFlow<Map<StrainType, List<StrainProfile>>> = _byType.asStateFlow()

    private val _loaded = MutableStateFlow(false)
    /** True once the cache has resolved at least one bucket (even if
     *  the Firestore fetch failed — empty buckets are still cached).
     *  Callers fall back to the bundled JSON on empty buckets. */
    val loaded: StateFlow<Boolean> = _loaded.asStateFlow()

    /** Fetch all three per-type buckets in parallel. Idempotent — safe
     *  to call repeatedly; subsequent calls re-fetch. */
    fun warm() {
        if (!FirebaseBootstrap.isConfigured) return
        scope.launch {
            try {
                val results = StrainType.entries.map { type ->
                    async { type to fetchOne(type) }
                }.awaitAll()
                val next = results.toMap()
                _byType.value = next
                _loaded.value = true
            } catch (t: Throwable) {
                Log.w(TAG, "Failed to load strainDirectory/byType: ${t.message}")
            }
        }
    }

    /** Synchronous read of one bucket's latest snapshot. Returns an
     *  empty list when the cache hasn't loaded yet or that bucket was
     *  empty. Callers should fall back to the bundled JSON on empty. */
    fun profilesFor(type: StrainType): List<StrainProfile> =
        _byType.value[type].orEmpty()

    private suspend fun fetchOne(type: StrainType): List<StrainProfile> {
        val fs = try {
            FirebaseFirestore.getInstance(FirebaseApp.getInstance())
        } catch (t: Throwable) {
            Log.w(TAG, "Firestore not available for ${type.name}: ${t.message}")
            return emptyList()
        }
        return try {
            val snap = fs
                .collection(COLLECTION)
                .document(BY_TYPE_DOC)
                .collection(collectionName(type))
                .document(SUBDOC)
                .get()
                .await()
            if (!snap.exists()) return emptyList()
            val previews = snap.get("previews") as? List<*> ?: return emptyList()
            val fetchedAt = (snap.get("fetchedAt") as? Number)?.toLong() ?: 0L
            val ageMs = System.currentTimeMillis() - fetchedAt
            if (ageMs > TTL_MS) return emptyList()
            previews.mapNotNull { row -> toProfile(row) }
        } catch (t: Throwable) {
            Log.w(TAG, "Failed to fetch ${type.name.lowercase()} bucket: ${t.message}")
            emptyList()
        }
    }

    /** Map a Firestore preview row (Map<String, Any?>) into a
     *  [StrainProfile]. The backend only writes rows whose `type` is
     *  one of the three buckets, so the cast is safe; any unparseable
     *  row is dropped instead of leaking null into the typed field. */
    private fun toProfile(row: Any?): StrainProfile? {
        val map = row as? Map<*, *> ?: return null
        val name = map["name"] as? String ?: return null
        if (name.isBlank()) return null
        val rawType = map["type"] as? String ?: return null
        val type = when (rawType.lowercase()) {
            "indica" -> StrainType.Indica
            "sativa" -> StrainType.Sativa
            "hybrid" -> StrainType.Hybrid
            else -> return null
        }
        return StrainProfile(
            name = name,
            inKnowledgeBase = true,
            type = type,
            thcRange = map["thcRange"] as? String,
            medicalUses = (map["medicalUses"] as? List<*>)
                ?.mapNotNull { it as? String }
                ?.takeIf { it.isNotEmpty() },
            imageUrl = map["imageUrl"] as? String,
            leaflyRating = (map["leaflyRating"] as? Number)?.toDouble(),
            weedmapsRating = (map["weedmapsRating"] as? Number)?.toDouble(),
        )
    }
}
