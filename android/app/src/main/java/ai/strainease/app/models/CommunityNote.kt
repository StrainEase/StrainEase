package ai.strainease.app.models

import kotlinx.serialization.Serializable

/**
 * One community note attached to a strain. The backend's
 * `consolidate.ts` fills in [kind] for new profiles
 * (`leafly` / `weedmaps` / `reddit` / `other`); older profiles +
 * preview data only have the human-readable [source] string
 * ("Leafly review · sleepseeker", "Reddit · r/trees", …), so
 * [resolvedKind] falls back to a heuristic off [source] when
 * [kind] is missing.
 */
@Serializable
data class CommunityNote(
    val source: String,
    val text: String,
    val kind: String? = null,
) {
    val id: String get() = "$source|${text.take(80)}"

    val isReddit: Boolean
        get() = resolvedKind == "reddit"

    /**
     * Rating aggregates and site blurbs — not individual patient
     * comments. The web client filters these out before rendering
     * the patient reviews section; the mobile clients do the same.
     */
    val isAggregate: Boolean
        get() {
            val src = source.lowercase()
            if (src == "leafly community" || src == "weedmaps" || src == "weedmaps listing" || src == "allbud" || src == "allbud listing") {
                return true
            }
            val trimmed = text.trim()
            if (!trimmed.contains("★")) return false
            return Regex("""^\d+(?:\.\d+)?★""").containsMatchIn(trimmed)
        }

    /** Tag used for the reviews tab filter. */
    val resolvedKind: String
        get() {
            kind?.takeIf { it.isNotEmpty() }?.lowercase()?.let { return it }
            val s = source.lowercase()
            return when {
                s.contains("reddit") -> "reddit"
                s.contains("weedmaps") -> "weedmaps"
                s.contains("leafly") -> "leafly"
                else -> "other"
            }
        }
}
