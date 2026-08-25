package com.strainwise.app.ui.home

import com.strainwise.app.data.StrainAPI
import com.strainwise.app.data.StrainCatalog
import com.strainwise.app.models.Conditions
import com.strainwise.app.models.StrainProfile
import com.strainwise.app.models.StrainType
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * The Home page's rail sections. 1:1 port of the iOS `HomeSection`
 * enum.
 *
 *  - [Recents] — the bottom "Recently viewed" rail (driven by
 *    [com.strainwise.app.data.RecentlyViewedStore])
 *  - [Sativa] / [Hybrid] / [Indica] — type-bucketed rails
 *  - [Ailment] — one rail per ailment; the carousel is one
 *    ailment at a time
 *  - [Popular] — the iOS "Popular strains" rail
 *  - [ForYou] — top picks for the patient's saved ailments;
 *    shown only when the user has saved at least one
 */
sealed class HomeSection {
    data object Recents : HomeSection()
    data object Sativa : HomeSection()
    data object Hybrid : HomeSection()
    data object Indica : HomeSection()
    data class Ailment(val name: String) : HomeSection()
    data object Popular : HomeSection()
    data object ForYou : HomeSection()

    val id: String
        get() = when (this) {
            Recents -> "recents"
            Sativa -> "sativa"
            Hybrid -> "hybrid"
            Indica -> "indica"
            is Ailment -> "ailment-$name"
            Popular -> "popular"
            ForYou -> "for-you"
        }

    val title: String
        get() = when (this) {
            Recents -> "Recently viewed"
            Sativa -> "Sativa"
            Hybrid -> "Hybrid"
            Indica -> "Indica"
            is Ailment -> name
            Popular -> "Popular strains"
            ForYou -> "Top picks for your symptoms"
        }
}

/** Navigation destinations inside the Home tab. */
sealed class BrowseDestination {
    data class Profile(val profile: StrainProfile) : BrowseDestination()
    data class Grid(val section: HomeSection, val strains: List<StrainProfile>) : BrowseDestination()
}

/**
 * Home view-model. Mirrors the iOS `HomeModel`:
 *
 *  - [popular] is the most recent popular-strains response from
 *    the backend, deduplicated against the bundled
 *    [StrainCatalog] and the catalog's known photos applied.
 *  - [savedAilments] is the signed-in user's saved ailments.
 *    When non-empty, the Home page is tailored: a "Top picks
 *    for your symptoms" rail appears at the top and the
 *    ailment carousel drops the static catalog in favor of
 *    the user's actual list.
 *  - [ailmentsForCarousel] is the user's saved list when
 *    present, otherwise the static [Conditions.catalog].
 */
class HomeModel(
    private val api: StrainAPI = com.strainwise.app.StrainWiseApplication.strainAPI,
) {
    private val _popular = MutableStateFlow<List<StrainProfile>>(emptyList())
    val popular: StateFlow<List<StrainProfile>> = _popular.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _savedAilments = MutableStateFlow<List<String>>(emptyList())
    val savedAilments: StateFlow<List<String>> = _savedAilments.asStateFlow()

    val previewLimit = 6

    val ailmentsForCarousel: List<String>
        get() = _savedAilments.value.ifEmpty { Conditions.catalog }

    val hasSavedAilments: Boolean
        get() = _savedAilments.value.isNotEmpty()

    suspend fun load() {
        if (_isLoading.value) return
        _isLoading.value = _popular.value.isEmpty()
        _errorMessage.value = null
        try {
            val live = api.popular()
            val merged = StrainCatalog.applyingCatalogPhotos(StrainCatalog.unique(live))
            _popular.value = merged
        } catch (t: Throwable) {
            _errorMessage.value = t.localizedMessage ?: "Couldn't load popular strains."
        } finally {
            _isLoading.value = false
        }
    }

    fun updateSavedAilments(next: List<String>) {
        if (next != _savedAilments.value) {
            _savedAilments.value = next
        }
    }

    fun strains(section: HomeSection): List<StrainProfile> {
        val popular = _popular.value
        return when (section) {
            HomeSection.Recents -> emptyList() // caller merges RecentlyViewedStore
            HomeSection.Sativa -> StrainCatalog.merge(popular, preferringType = StrainType.Sativa)
            HomeSection.Hybrid -> StrainCatalog.merge(popular, preferringType = StrainType.Hybrid)
            HomeSection.Indica -> StrainCatalog.merge(popular, preferringType = StrainType.Indica)
            is HomeSection.Ailment -> StrainCatalog.matching(section.name, popular)
            HomeSection.Popular -> StrainCatalog.merge(popular)
            HomeSection.ForYou -> StrainCatalog.matching(_savedAilments.value, popular, limit = previewLimit)
        }
    }

    fun preview(section: HomeSection): List<StrainProfile> =
        strains(section).take(previewLimit)
}
