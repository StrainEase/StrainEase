package ai.strainease.app.ui.compare

import ai.strainease.app.models.StrainComparison
import ai.strainease.app.models.StrainProfile
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Process-wide state for the "compare 2-3 strains" tray.
 * Direct port of the iOS `CompareSelectionStore`.
 *
 *  - Holds the picked strain names (max 3)
 *  - Holds the last successful [StrainComparison] so the
 *    Find tab can render the results below the form
 *  - [errorMessage] is surfaced inline through [SWErrorBanner]
 *    on the tray (iOS pattern)
 */
class CompareSelectionStore {

    private val _names = MutableStateFlow<List<String>>(emptyList())
    val names: StateFlow<List<String>> = _names.asStateFlow()

    private val _comparison = MutableStateFlow<StrainComparison?>(null)
    val comparison: StateFlow<StrainComparison?> = _comparison.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    val cap: Int = 3

    val atCap: Boolean
        get() = _names.value.size >= cap

    /** Case-insensitive to match the iOS store and the web hook's dedupe. */
    fun isIn(name: String): Boolean =
        _names.value.any { it.equals(name, ignoreCase = true) }

    fun toggle(name: String) {
        val current = _names.value
        _names.value = when {
            current.any { it.equals(name, ignoreCase = true) } ->
                current.filterNot { it.equals(name, ignoreCase = true) }
            current.size >= cap -> current // silently drop when at cap
            else -> current + name
        }
    }

    fun clear() {
        _names.value = emptyList()
        _comparison.value = null
        _errorMessage.value = null
    }

    fun setError(message: String?) {
        _errorMessage.value = message
    }

    fun setComparison(value: StrainComparison?) {
        _comparison.value = value
    }
}
