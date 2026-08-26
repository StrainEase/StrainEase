package com.strainwise.app.ui.find

import com.strainwise.app.StrainWiseApplication
import com.strainwise.app.data.SavedAilmentsStore
import com.strainwise.app.data.SavedMedicationsStore
import com.strainwise.app.data.StrainAPI
import com.strainwise.app.models.Conditions
import com.strainwise.app.models.Potency
import com.strainwise.app.models.RecommendationResult
import com.strainwise.app.models.ResearchPrefs
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Find view-model. 1:1 port of the iOS `FindModel`.
 *
 *  - [ailments] is the picked set of conditions for the
 *    current recommend run. Hydrated from [SavedAilmentsStore]
 *    on first appearance so the user's saved list is the
 *    starting point; PR-A11's Account screen will keep the
 *    saved + picked lists in sync.
 *  - [prefs] holds the rest of the inputs (time of day,
 *    consume form, THC sensitivity, owned strains,
 *    medications, patient note).
 *  - [potency] is split out from [prefs] because the
 *    recommend callable takes it as a top-level field.
 *  - [customAilment] is the in-flight text for the
 *    "Or type any symptom" add field.
 *  - [result] / [errorMessage] / [isRunning] track the
 *    recommend call's outcome.
 */
class FindModel(
    private val api: StrainAPI = StrainWiseApplication.strainAPI,
) {
    private val _ailments = MutableStateFlow<List<String>>(emptyList())
    val ailments: StateFlow<List<String>> = _ailments.asStateFlow()

    private val _prefs = MutableStateFlow(ResearchPrefs())
    val prefs: StateFlow<ResearchPrefs> = _prefs.asStateFlow()

    private val _potency = MutableStateFlow(Potency.Any)
    val potency: StateFlow<Potency> = _potency.asStateFlow()

    private val _customAilment = MutableStateFlow("")
    val customAilment: StateFlow<String> = _customAilment.asStateFlow()

    private val _result = MutableStateFlow<RecommendationResult?>(null)
    val result: StateFlow<RecommendationResult?> = _result.asStateFlow()

    private val _isRunning = MutableStateFlow(false)
    val isRunning: StateFlow<Boolean> = _isRunning.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private var ailmentsHydrated: Boolean = false

    /** Seed the picked ailments from the user's saved list on
     *  first appearance. Subsequent saved-ailments changes are
     *  surfaced by the FindView's own collect. */
    fun hydrateAilmentsIfNeeded(store: SavedAilmentsStore) {
        if (ailmentsHydrated) return
        _ailments.value = store.ailments
        ailmentsHydrated = true
    }

    fun isSelected(name: String): Boolean =
        _ailments.value.any { it.equals(name, ignoreCase = true) }

    fun toggleAilment(name: String) {
        val current = _ailments.value
        val next = if (isSelected(name)) {
            current.filterNot { it.equals(name, ignoreCase = true) }
        } else {
            current + name
        }
        _ailments.value = next
    }

    fun setCustomAilment(value: String) {
        _customAilment.value = value
    }

    fun addCustomAilment() {
        val trimmed = _customAilment.value.trim()
        if (trimmed.isEmpty()) return
        if (isSelected(trimmed)) {
            _customAilment.value = ""
            return
        }
        _ailments.value = _ailments.value + trimmed
        _customAilment.value = ""
    }

    fun setPotency(value: Potency) {
        _potency.value = value
    }

    fun updatePrefs(transform: (ResearchPrefs) -> ResearchPrefs) {
        _prefs.value = transform(_prefs.value)
    }

    suspend fun recommend(
        savedMedications: SavedMedicationsStore,
        reliefSummary: String? = null,
    ) {
        if (_ailments.value.isEmpty()) {
            _errorMessage.value = "Pick at least one symptom first."
            return
        }
        _isRunning.value = true
        _errorMessage.value = null
        try {
            val result = api.recommend(
                conditions = _ailments.value,
                potency = _potency.value,
                prefs = _prefs.value.copy(medications = savedMedications.names.joinToString(", ")),
                reliefSummary = reliefSummary,
                language = "English",
            )
            _result.value = result
        } catch (t: Throwable) {
            _errorMessage.value = t.localizedMessage ?: "Couldn't reach the server."
        } finally {
            _isRunning.value = false
        }
    }

    companion object {
        /** Quick-pick ailments shown above the catalog on the Find screen. */
        val quickAilments: List<String> = Conditions.quick
    }
}
