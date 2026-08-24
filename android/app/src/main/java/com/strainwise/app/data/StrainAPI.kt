package com.strainwise.app.data

import com.strainwise.app.models.DoctorQuery
import com.strainwise.app.models.DoctorResult
import com.strainwise.app.models.ElaboratedSection
import com.strainwise.app.models.Potency
import com.strainwise.app.models.ResearchPrefs
import com.strainwise.app.models.StrainComparison
import com.strainwise.app.models.StrainDescription
import com.strainwise.app.models.StrainProfile
import com.strainwise.app.models.RecommendationResult

/**
 * Strain API surface. The Find / Home / Browse / Strain Detail /
 * Compare screens all talk to a [StrainAPI] so the previews and
 * tests can swap in fake implementations without touching Firebase.
 *
 * The interface is a 1:1 port of the iOS `StrainServicing`
 * protocol, with the same method names + signatures so the
 * cross-platform contract is preserved.
 *
 * Implementations:
 *  - [LiveStrainAPI] — talks to Firebase Functions, the real
 *    backend. Wired in [com.strainwise.app.StrainWiseApplication].
 *  - [PreviewStrainAPI] — returns canned `StrainProfile.sampleGDP`
 *    etc. Used by Compose `@Preview` annotations and screenshot tests.
 *  - [DelayedPreviewAPI] — same as preview but never resolves. Used
 *    to keep a strain-detail loading placeholder visible.
 */
interface StrainAPI {
    suspend fun recommend(
        conditions: List<String>,
        potency: Potency,
        prefs: ResearchPrefs,
        reliefSummary: String?,
        language: String,
    ): RecommendationResult

    suspend fun compare(
        strainNames: List<String>,
        conditions: List<String>,
        prefs: ResearchPrefs,
        reliefSummary: String?,
        language: String,
    ): StrainComparison

    suspend fun search(
        name: String,
        conditions: List<String> = emptyList(),
    ): StrainProfile?

    suspend fun popular(): List<StrainProfile>

    suspend fun findDoctors(query: DoctorQuery): DoctorResult

    /** Three-section, patient-tailored description for a single
     *  strain. Returns null when the server can't return a valid
     *  shape — the caller should fall back to
     *  [StrainProfile.description]. */
    suspend fun describe(
        strain: StrainProfile,
        ailments: List<String>,
        medications: List<String>,
        reliefHistory: String,
        language: String,
    ): StrainDescription?

    /** Expand one of the three tailored-description sections. */
    suspend fun elaborate(
        strain: StrainProfile,
        sectionHeading: String,
        sectionBody: String,
        ailments: List<String>,
        medications: List<String>,
        reliefHistory: String,
        language: String,
    ): String
}

/** Default language for AI-written responses. Matches the iOS
 *  `StrainAILanguage.english`. */
object StrainAILanguage {
    const val English = "English"

    val preferred: String
        get() = English
}
