package ai.strainease.app.ui.discover

import ai.strainease.app.StrainEaseApplication
import ai.strainease.app.data.SavedAilmentsStore
import ai.strainease.app.data.SavedMedicationsStore
import ai.strainease.app.data.StrainAPI
import ai.strainease.app.models.Conditions
import ai.strainease.app.models.Potency
import ai.strainease.app.models.RecommendationResult
import ai.strainease.app.models.ResearchPrefs
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * Phases the Dr. Kaya recommend call moves through. Mirrors the iOS
 * `ResearchStep` enum and the web `RESEARCH_STEPS` array so the three
 * platforms stay in lockstep. Surfaced via [DiscoverModel.step] while a
 * recommend run is in flight; the DiscoverView forwards the active
 * label to the Find button so the spinner has a meaningful caption.
 */
enum class ResearchStep(val message: String) {
    Reading("Reading your symptoms…"),
    Pulling("Pulling strain profiles…"),
    Quoting("Collecting Reddit quotes…"),
    Ranking("Ranking with Dr. Kaya…");

    companion object {
        /** Same cadence as iOS / web — advance every 1.6s while busy. */
        const val STEP_INTERVAL_MS: Long = 1_600
    }
}

/**
 * Discover view-model. 1:1 port of the iOS `DiscoverModel`.
 *
 *  - [ailments] is the picked set of conditions for the
 *    current recommend run. Hydrated from [SavedAilmentsStore]
 *    on first appearance so the user's saved list is the
 *    starting point.
 *  - [prefs] holds the rest of the inputs (time of day,
 *    consume form, THC sensitivity, owned strains,
 *    medications, patient note).
 *  - [potency] is split out from [prefs] because the
 *    recommend callable takes it as a top-level field.
 *  - [customAilment] is the in-flight text for the
 *    "Or type any symptom" add field.
 *  - [result] / [errorMessage] / [isRunning] track the
 *    recommend call's outcome.
 *  - [step] is the active phase of the recommend run; cycles
 *    every [ResearchStep.STEP_INTERVAL_MS] while [isRunning] is
 *    true so the Find button can label the spinner.
 *  - [searched] records the ailments that were active when
 *    the last [recommend] call succeeded; used by the inline
 *    comparison results to surface "for X, Y" labels.
 */
class DiscoverModel(
    private val api: StrainAPI = StrainEaseApplication.strainAPI,
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

    private val _searched = MutableStateFlow<List<String>>(emptyList())
    val searched: StateFlow<List<String>> = _searched.asStateFlow()

    private val _isRunning = MutableStateFlow(false)
    val isRunning: StateFlow<Boolean> = _isRunning.asStateFlow()

    private val _step = MutableStateFlow(ResearchStep.Reading)
    val step: StateFlow<ResearchStep> = _step.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private var ailmentsHydrated: Boolean = false
    private var stepJob: Job? = null
    private val stepScope = CoroutineScope(Dispatchers.Main)

    /** Seed the picked ailments from the user's saved list on
     *  first appearance. Subsequent saved-ailments changes are
     *  surfaced by the DiscoverView's own collect. */
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

    /**
     * Replace (or augment) the picked ailments with a fresh
     * list. Mirrors the iOS `applyAilments(_:replace:)` used by
     * the Account "Find for these" handoff and the Past-research
     * round-trip. When [replace] is true the picked list is wiped
     * first; when false the new entries are appended unless
     * already present (case-insensitive).
     */
    fun applyAilments(names: List<String>, replace: Boolean = false) {
        if (replace) {
            ailmentsHydrated = true
            _ailments.value = emptyList()
        }
        for (raw in names) {
            val trimmed = raw.trim()
            if (trimmed.isEmpty()) continue
            if (isSelected(trimmed)) continue
            _ailments.value = _ailments.value + trimmed
        }
    }

    /**
     * Re-hydrate the form from a Past-research Find entry. Sets
     * the picked ailments, the rendered result, and the
     * `searched` list so the iOS parity surface ("Best strains
     * for X, Y" headline) is the same.
     */
    fun applyRestored(result: RecommendationResult, conditions: List<String>) {
        applyAilments(conditions, replace = true)
        _searched.value = conditions
        _result.value = result
        _errorMessage.value = null
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
        _searched.value = _ailments.value
        startStepTicker()
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
            stopStepTicker()
            _isRunning.value = false
        }
    }

    /**
     * Reset the step ticker to [ResearchStep.Reading] and start
     * a coroutine that advances through the steps every
     * [ResearchStep.STEP_INTERVAL_MS]. Replaces any in-flight ticker.
     */
    private fun startStepTicker() {
        stepJob?.cancel()
        _step.value = ResearchStep.Reading
        stepJob = stepScope.launch {
            val order = ResearchStep.entries
            for (index in 0 until order.size - 1) {
                delay(ResearchStep.STEP_INTERVAL_MS)
                _step.value = order[index + 1]
            }
        }
    }

    private fun stopStepTicker() {
        stepJob?.cancel()
        stepJob = null
    }

    companion object {
        /** Quick-pick ailments shown above the catalog on the Find screen. */
        val quickAilments: List<String> = Conditions.quick
    }
}
