package com.strainwise.app.ui.browse

import com.strainwise.app.StrainWiseApplication
import com.strainwise.app.data.StrainAPI
import com.strainwise.app.data.StrainCatalog
import com.strainwise.app.models.StrainProfile
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Browse view-model. 1:1 port of the iOS `DirectoryModel`.
 *
 *  - [query] is the free-text search.
 *  - [typeFilter] / [thc] / [effectIDs] / [ailmentFilters]
 *    drive the chip rows.
 *  - [results] is the live filter of [all] + the filters.
 *  - [isLoading] / [errorMessage] track the popularStrains
 *    fetch on first appearance.
 */
class DirectoryModel(
    private val api: StrainAPI = StrainWiseApplication.strainAPI,
) {
    private val _query = MutableStateFlow("")
    val query: StateFlow<String> = _query.asStateFlow()

    private val _typeFilter = MutableStateFlow(DirectoryFilter.TypeFilter.All)
    val typeFilter: StateFlow<DirectoryFilter.TypeFilter> = _typeFilter.asStateFlow()

    private val _thc = MutableStateFlow(DirectoryFilter.ThcBand.Any)
    val thc: StateFlow<DirectoryFilter.ThcBand> = _thc.asStateFlow()

    private val _effectIDs = MutableStateFlow<List<String>>(emptyList())
    val effectIDs: StateFlow<List<String>> = _effectIDs.asStateFlow()

    private val _ailmentFilters = MutableStateFlow<List<String>>(emptyList())
    val ailmentFilters: StateFlow<List<String>> = _ailmentFilters.asStateFlow()

    private val _all = MutableStateFlow<List<StrainProfile>>(emptyList())
    private val _isLoading = MutableStateFlow(false)
    private val _errorMessage = MutableStateFlow<String?>(null)

    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    val filtersActive: Boolean
        get() = _query.value.isNotEmpty() ||
            _typeFilter.value != DirectoryFilter.TypeFilter.All ||
            _thc.value != DirectoryFilter.ThcBand.Any ||
            _effectIDs.value.isNotEmpty() ||
            _ailmentFilters.value.isNotEmpty()

    val results: List<StrainProfile>
        get() = DirectoryFilter.apply(
            profiles = _all.value,
            query = _query.value,
            type = _typeFilter.value,
            thc = _thc.value,
            effectIDs = _effectIDs.value,
            ailments = _ailmentFilters.value,
        )

    suspend fun load() {
        if (_all.value.isNotEmpty() || _isLoading.value) return
        _isLoading.value = true
        _errorMessage.value = null
        try {
            val live = api.popular()
            _all.value = StrainCatalog.applyingCatalogPhotos(StrainCatalog.unique(live))
        } catch (t: Throwable) {
            _errorMessage.value = t.localizedMessage ?: "Couldn't load the directory."
        } finally {
            _isLoading.value = false
        }
    }

    fun setQuery(value: String) { _query.value = value }
    fun setType(value: DirectoryFilter.TypeFilter) { _typeFilter.value = value }
    fun setThc(value: DirectoryFilter.ThcBand) { _thc.value = value }

    fun toggleEffect(id: String) {
        val current = _effectIDs.value
        _effectIDs.value = if (current.contains(id)) current - id else current + id
    }

    fun toggleAilment(name: String) {
        val current = _ailmentFilters.value
        _ailmentFilters.value = if (current.any { it.equals(name, ignoreCase = true) }) {
            current.filterNot { it.equals(name, ignoreCase = true) }
        } else {
            current + name
        }
    }

    fun resetFilters() {
        _query.value = ""
        _typeFilter.value = DirectoryFilter.TypeFilter.All
        _thc.value = DirectoryFilter.ThcBand.Any
        _effectIDs.value = emptyList()
        _ailmentFilters.value = emptyList()
    }
}
