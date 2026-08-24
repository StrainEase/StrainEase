package com.strainwise.app.models

import kotlinx.serialization.Serializable

/**
 * One condition pick inside a `StrainAnalysis`. The "best" entry is
 * the strain the model recommends for the patient's conditions;
 * `runnerUp` is the close second.
 */
@Serializable
data class ConditionPick(
    val best: String,
    val why: String,
    val runnerUp: String,
)

/**
 * AI-written analysis that comes back from a `compareStrains` call.
 * Mirrors the iOS `StrainAnalysis` struct.
 */
@Serializable
data class StrainAnalysis(
    val headline: String,
    val summary: String,
    val forCondition: ConditionPick? = null,
    val keyDifferences: List<String> = emptyList(),
    val commonGround: List<String> = emptyList(),
    val cautions: List<String> = emptyList(),
    val redditSources: List<RedditSource>? = null,
)

/**
 * Full result of a `compareStrains` call: the strains being
 * compared + the AI analysis. Mirrors the iOS `StrainComparison`
 * struct.
 */
@Serializable
data class StrainComparison(
    val strains: List<StrainProfile>,
    val analysis: StrainAnalysis,
    val resultId: String? = null,
)
