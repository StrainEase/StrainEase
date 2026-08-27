package ai.strainease.app.models

import kotlinx.serialization.Serializable

/**
 * One strain in a recommendation set, with a patient-facing reason
 * and a caution line. Mirrors the iOS `StrainRecommendation` struct.
 */
@Serializable
data class StrainRecommendation(
    val strainName: String,
    val reason: String,
    val bestFor: String,
    val caution: String,
) {
    val id: String get() = strainName.lowercase()
}

/**
 * Result of a `recommendStrainsForConditions` call. Carries the
 * AI-written headline + summary, the per-strain reasoning, the
 * full [StrainProfile]s for each pick, and any Reddit threads
 * the model cited.
 */
@Serializable
data class RecommendationResult(
    val headline: String,
    val summary: String,
    val recommendations: List<StrainRecommendation>,
    val strains: List<StrainProfile>,
    val redditSources: List<RedditSource>? = null,
    val resultId: String? = null,
) {
    /** Look up a [StrainProfile] by name (case-insensitive). */
    fun profile(named: String): StrainProfile? =
        strains.firstOrNull { it.name.equals(named, ignoreCase = true) }
}
