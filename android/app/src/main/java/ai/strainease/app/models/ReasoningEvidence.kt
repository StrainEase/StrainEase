package ai.strainease.app.models

import kotlinx.serialization.Serializable

/**
 * Source-anchored evidence bullet. `source` is one of the
 * closed enum values below so the UI can color-code each
 * bullet without parsing the string. `quote` is a 1-sentence
 * reference to a fact actually in the AI's inputs (never
 * invented). 1:1 port of the iOS `ReasoningEvidenceItem` and
 * the web `ReasoningEvidenceItem` type.
 */
@Serializable
data class ReasoningEvidenceItem(
    val source: ReasoningSource,
    val quote: String,
)

/**
 * Where a piece of evidence came from. Closed enum so the
 * server's normalizer can drop anything that doesn't match.
 */
@Serializable
enum class ReasoningSource {
    @kotlinx.serialization.SerialName("Leafly")
    Leafly,
    @kotlinx.serialization.SerialName("Weedmaps")
    Weedmaps,
    @kotlinx.serialization.SerialName("Allbud")
    Allbud,
    @kotlinx.serialization.SerialName("Reddit")
    Reddit,
    @kotlinx.serialization.SerialName("Aggregated")
    Aggregated,
    @kotlinx.serialization.SerialName("Patient history")
    PatientHistory,
}

/**
 * One recommendation's auditable evidence ledger. All four
 * sub-fields can be empty arrays — the UI hides the whole
 * `ReasoningTraceSection` when `totalBullets == 0`.
 */
@Serializable
data class ReasoningEvidence(
    val matchedConditions: List<String> = emptyList(),
    val preferencesApplied: List<String> = emptyList(),
    val evidence: List<ReasoningEvidenceItem> = emptyList(),
    val considerations: List<String> = emptyList(),
) {
    val totalBullets: Int
        get() = matchedConditions.size + preferencesApplied.size + evidence.size + considerations.size

    val isEmpty: Boolean
        get() = totalBullets == 0
}
