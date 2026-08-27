package ai.strainease.app.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import ai.strainease.app.models.StrainProfile
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.Serializable

/**
 * A snapshot of a strain the patient has viewed. Persisted as
 * part of [RecentlyViewedStore]. Mirrors the iOS
 * `RecentStrain` struct field-for-field (just `name` + `slug`
 * + `imageUrl`).
 */
@Serializable
data class RecentStrain(
    val name: String,
    val slug: String,
    val imageUrl: String? = null,
) {
    /** Re-hydrate to a partial [StrainProfile] for the rail cards. */
    fun toProfile(): StrainProfile = StrainProfile(
        name = name,
        inKnowledgeBase = true,
        imageUrl = imageUrl,
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

    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    @Volatile
    private var cached: List<RecentStrain> = emptyList()

    val itemsFlow: Flow<List<RecentStrain>> =
        context.recentDataStore.data.map { prefs ->
            prefs[RECENT_KEY]?.let { decode(it) } ?: emptyList()
        }

    suspend fun refresh() {
        cached = itemsFlow.first()
    }

    val items: List<RecentStrain>
        get() = cached

    suspend fun record(profile: StrainProfile) {
        val next = (listOf(RecentStrain(profile.name, profile.slug, profile.imageUrl)) + cached)
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
