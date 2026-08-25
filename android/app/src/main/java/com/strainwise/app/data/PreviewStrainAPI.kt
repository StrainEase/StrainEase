package com.strainwise.app.data

import com.strainwise.app.models.Doctor
import com.strainwise.app.models.DoctorQuery
import com.strainwise.app.models.DoctorResult
import com.strainwise.app.models.Potency
import com.strainwise.app.models.ResearchPrefs
import com.strainwise.app.models.StrainComparison
import com.strainwise.app.models.StrainDescription
import com.strainwise.app.models.StrainDescriptionSection
import com.strainwise.app.models.StrainProfile
import com.strainwise.app.models.RecommendationResult

/**
 * Test / preview [StrainAPI] that returns canned fixtures. The
 * 1:1 port of the iOS `PreviewStrainAPI` struct. Used by Compose
 * `@Preview` annotations and screenshot tests.
 *
 * [search] switches on a substring of the query name (so
 * "granddaddy" / "purple" returns [SampleGranddaddyPurple],
 * "blue" returns [SampleBlueDream]).
 */
class PreviewStrainAPI(
    private val result: RecommendationResult = SampleRecommendation,
    private val searchResult: StrainProfile? = SampleGranddaddyPurple,
) : StrainAPI {

    override suspend fun recommend(
        conditions: List<String>,
        potency: Potency,
        prefs: ResearchPrefs,
        reliefSummary: String?,
        language: String,
    ): RecommendationResult = result

    override suspend fun compare(
        strainNames: List<String>,
        conditions: List<String>,
        prefs: ResearchPrefs,
        reliefSummary: String?,
        language: String,
    ): StrainComparison = SampleComparison

    override suspend fun search(
        name: String,
        conditions: List<String>,
    ): StrainProfile? {
        val key = name.lowercase()
        if (key.contains("blue")) return SampleBlueDream
        if (key.contains("granddaddy") || key.contains("purple")) return SampleGranddaddyPurple
        return searchResult
    }

    override suspend fun popular(): List<StrainProfile> = StrainCatalog.all

    override suspend fun findDoctors(query: DoctorQuery): DoctorResult =
        DoctorResult(doctors = listOf(Doctor.SampleDoctor), resolvedLocation = null, source = "preview")

    override suspend fun describe(
        strain: StrainProfile,
        ailments: List<String>,
        medications: List<String>,
        reliefHistory: String,
        language: String,
    ): StrainDescription? = SampleDescription

    override suspend fun elaborate(
        strain: StrainProfile,
        sectionHeading: String,
        sectionBody: String,
        ailments: List<String>,
        medications: List<String>,
        reliefHistory: String,
        language: String,
    ): String = "Maya's take on $sectionHeading: ${strain.name} shines for the symptoms you flagged — start low, give it time to settle, and check in with how you feel before layering more on top."
}

private val SampleDescription = StrainDescription(
    sections = listOf(
        StrainDescriptionSection(
            heading = "Overview",
            body = "A classic daytime-leaning hybrid from the West Coast. Berry- and herbal-leaning aroma with a reputation for a calm, clear-headed lift.",
        ),
        StrainDescriptionSection(
            heading = "What it might do for you",
            body = "Reported by patients for chronic pain, stress, and depression — useful when symptoms are dragging you down and you still need to stay functional.",
        ),
        StrainDescriptionSection(
            heading = "What to expect",
            body = "Onset is gradual; expect two to three hours of effect. Start with a small amount if you're THC-sensitive, and check in with how you feel before taking more.",
        ),
    ),
)

private val SampleComparison = StrainComparison(
    strains = emptyList(),
    analysis = com.strainwise.app.models.StrainAnalysis(
        headline = "",
        summary = "",
        forCondition = null,
        keyDifferences = emptyList(),
        commonGround = emptyList(),
        cautions = emptyList(),
    ),
    resultId = null,
)
