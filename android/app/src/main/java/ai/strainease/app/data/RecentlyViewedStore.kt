package ai.strainease.app.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import ai.strainease.app.models.StrainProfile
import ai.strainease.app.models.StrainType
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.Serializable

/**
 * A snapshot of a strain the patient has viewed. Persisted as
 * part of [RecentlyViewedStore]. Mirrors the iOS `RecentStrain`
 * store, which round-trips the full [StrainProfile] via Codable,
 * and the web client's `compact()` helper in
 * `src/lib/recently-viewed.ts`. We persist the fields the rail
 * cards actually render (`name`, `slug`, `imageUrl`, `type`,
 * `thcRange`) so the Recents rail shows the same "Indica · THC
 * 16–21%" subtitle the other rails do, instead of a generic
 * "Strain" badge with no THC line.
 */
@Serializable
data class RecentStrain(
    val name: String,
    val slug: String,
    val imageUrl: String? = null,
    val type: StrainType? = null,
    val thcRange: String? = null,
) {
    /** Re-hydrate to a partial [StrainProfile] for the rail cards. */
    fun toProfile(): StrainProfile = StrainProfile(
        name = name,
        inKnowledgeBase = true,
        imageUrl = imageUrl,
        type = type,
        thcRange = thcRange,
    )
}

private val Context.recentDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "strainease_recently_viewed",
)

private val RECENT_KEY = stringPreferencesKey("recents_v1")

/**
 * "Recently viewed" rail source. Mirrors the iOS
 * `RecentlyViewedStore.swift`. Backs the Home bottom rail; the
 * `record(profile)` call is invoked from `StrainDetailView`
 * (PR-A9) every time the user opens a strain.
 *
 * Order is most-recent first. We cap at 12 entries so the rail
 * never grows unbounded.
 */
class RecentlyViewedStore(private val context: Context) {

    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
        // Older entries (pre-fix) were written without `type` /
        // `thcRange`; coerce missing fields to their declared
        // defaults so the rail keeps loading instead of throwing.
        coerceInputValues = true
    }

    @Volatile
    private var cached: List<RecentStrain> = emptyList()

    val itemsFlow: Flow<List<RecentStrain>> =
        context.recentDataStore.data.map { prefs ->
            prefs[RECENT_KEY]?.let { decode(it) } ?: emptyList()
        }

    suspend fun refresh() {
        val loaded = itemsFlow.first()
        val enriched = loaded.map(::enrich)
        cached = enriched
        // Persist the migration so subsequent cold starts don't have
        // to repeat the lookup. Only writes when something actually
        // changed, to avoid an unnecessary DataStore round-trip.
        if (enriched.zip(loaded).any { (a, b) -> a != b }) {
            context.recentDataStore.edit { prefs ->
                prefs[RECENT_KEY] = json.encodeToString(enriched)
            }
        }
    }

    val items: List<RecentStrain>
        get() = cached

    suspend fun record(profile: StrainProfile) {
        val next = (
            listOf(
                RecentStrain(
                    name = profile.name,
                    slug = profile.slug,
                    imageUrl = profile.imageUrl,
                    type = profile.type,
                    thcRange = profile.thcRange,
                )
            ) + cached
            )
            .distinctBy { it.slug }
            .take(MAX_RECENTS)
        cached = next
        context.recentDataStore.edit { prefs ->
            prefs[RECENT_KEY] = json.encodeToString(next)
        }
    }

    suspend fun clear() {
        cached = emptyList()
        context.recentDataStore.edit { it.remove(RECENT_KEY) }
    }

    /**
     * Backfill `type` / `thcRange` from [StrainCatalog] when an
     * older entry (pre-fix) was persisted without them. Cheap O(n)
     * against the in-memory catalog map.
     */
    private fun enrich(entry: RecentStrain): RecentStrain {
        if (entry.type != null && entry.thcRange != null) return entry
        val catalogMatch = StrainCatalog.all.firstOrNull { it.slug == entry.slug } ?: return entry
        return entry.copy(
            type = entry.type ?: catalogMatch.type,
            thcRange = entry.thcRange ?: catalogMatch.thcRange,
        )
    }

    private fun decode(raw: String): List<RecentStrain> = try {
        json.decodeFromString<List<RecentStrain>>(raw)
    } catch (t: Throwable) {
        android.util.Log.w("RecentlyViewedStore", "decode failed: ${t.message}")
        emptyList()
    }

    companion object {
        const val MAX_RECENTS = 12
    }
}
