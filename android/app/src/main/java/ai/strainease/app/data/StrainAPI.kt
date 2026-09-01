package ai.strainease.app.data

import ai.strainease.app.models.DoctorQuery
import ai.strainease.app.models.DoctorResult
import ai.strainease.app.models.ElaboratedSection
import ai.strainease.app.models.Potency
import ai.strainease.app.models.RedditSource
import ai.strainease.app.models.ResearchPrefs
import ai.strainease.app.models.StrainComparison
import ai.strainease.app.models.StrainDescription
import ai.strainease.app.models.StrainProfile
import ai.strainease.app.models.RecommendationResult

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
 *    backend. Wired in [ai.strainease.app.StrainEaseApplication].
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

    /**
     * Curated Reddit threads relevant to a single strain, drawn
     * from the vetted `reddit-seed` pool (no LLM in the loop).
     * Returns up to 5 threads; empty when nothing matches. Public
     * callable, so the strain detail can prefetch it before the
     * user signs in.
     */
    suspend fun redditThreads(
        name: String,
        conditions: List<String>,
    ): List<RedditSource>

    /**
     * Server-rendered Clinician Report PDF. The backend reads the
     * patient's data via the Admin SDK, calls Groq for Dr. Kaya's
     * prose section, and renders a PDF with Puppeteer. Returns the
     * PDF bytes plus a safe filename so the screen can hand the file
     * off to the system PDF viewer / share sheet. Mirrors the web
     * `/report` page and the iOS `ClinicianReportView` so every
     * platform downloads the same document.
     */
    suspend fun clinicianReportPdf(
        language: String = StrainAILanguage.English,
        includeKayaSummary: Boolean = true,
    ): ClinicianReportPdf
}

/** Result of a [StrainAPI.clinicianReportPdf] call. The PDF comes
 *  back base64-encoded; we decode it to raw bytes so callers can
 *  write to a [java.io.File] or stream into an Intent. */
data class ClinicianReportPdf(
    val pdfBytes: ByteArray,
    val filename: String,
    val contentType: String,
    val byteLength: Int,
    val kayaIncluded: Boolean,
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is ClinicianReportPdf) return false
        if (filename != other.filename) return false
        if (contentType != other.contentType) return false
        if (byteLength != other.byteLength) return false
        if (kayaIncluded != other.kayaIncluded) return false
        if (!pdfBytes.contentEquals(other.pdfBytes)) return false
        return true
    }

    override fun hashCode(): Int {
        var result = filename.hashCode()
        result = 31 * result + contentType.hashCode()
        result = 31 * result + byteLength
        result = 31 * result + kayaIncluded.hashCode()
        result = 31 * result + pdfBytes.contentHashCode()
        return result
    }
}

/** Default language for AI-written responses. Matches the iOS
 *  `StrainAILanguage.english`. */
object StrainAILanguage {
    const val English = "English"

    val preferred: String
        get() = English
}
