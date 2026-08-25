package com.strainwise.app.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * A strain as returned by the backend's AI callables
 * (`recommendStrainsForConditions`, `compareStrains`, `searchStrain`,
 * `popularStrains`, `describeStrainForUser`). Direct port of the
 * iOS `StrainProfile` struct, with the same wire format so the
 * iOS Codable + Kotlinx Serialization layers produce identical
 * JSON for the same input.
 *
 * The shape is deliberately wide — only the fields the UI actually
 * reads are guaranteed to be populated. A "stub" profile from
 * `popularStrains()` carries only `name`, `type`, `thcRange`, and
 * `medicalUses`; the rest is filled in later by `searchStrain()` or
 * `describeStrainForUser()`. See [isPartial].
 */
@Serializable
data class StrainProfile(
    val name: String,
    val inKnowledgeBase: Boolean = false,
    val type: StrainType? = null,
    val thcRange: String? = null,
    val cbdRange: String? = null,
    val lineage: String? = null,
    val terpenes: List<Terpene>? = null,
    val medicalUses: List<String>? = null,
    val effects: List<StrainEffect>? = null,
    val sideEffects: List<String>? = null,
    val description: String? = null,
    val communityNotes: List<CommunityNote>? = null,
    val imageUrl: String? = null,
    val leaflyRating: Double? = null,
    val leaflyReviewCount: Int? = null,
) {
    /**
     * Home catalog stubs only carry name / type / THC / uses.
     * UI surfaces use this to decide whether to show a "tap to
     * load full profile" placeholder.
     */
    val isPartial: Boolean
        get() = description.isNullOrEmpty()
            && effects.isNullOrEmpty()
            && terpenes.isNullOrEmpty()

    /**
     * Patient quote notes, with aggregates (Leafly star ratings,
     * Weedmaps blurbs) filtered out. Mirrors the iOS
     * `StrainProfile.quoteNotes` extension.
     */
    val quoteNotes: List<CommunityNote>
        get() = communityNotes.orEmpty().filter { !it.isAggregate }

    /**
     * Slug derived from [name]. The web and iOS clients use the
     * same slug everywhere, so URLs / Firestore doc ids are
     * interchangeable across surfaces.
     */
    val slug: String
        get() = name
            .trim()
            .lowercase()
            .replace(Regex("[^a-z0-9]+"), "-")
            .trim('-')

    val id: String get() = slug

    /**
     * Aggregate Leafly rating, preferring the dedicated field on
     * the new backend and falling back to a `Leafly community`
     * community note text match for older profiles.
     */
    val resolvedLeaflyRating: Pair<Double, Int?>?
        get() {
            if (leaflyRating != null) return leaflyRating to leaflyReviewCount
            for (note in communityNotes.orEmpty()) {
                if (note.source.lowercase() != "leafly community") continue
                val stars = STARS_REGEX.find(note.text)?.groupValues?.get(1)?.toDoubleOrNull()
                val count = REVIEW_COUNT_REGEX.find(note.text)?.groupValues?.get(1)
                    ?.replace(",", "")?.toIntOrNull()
                if (stars != null) return stars to count
            }
            return null
        }

    /** Subtitle used in rail cards: "Indica · THC 17–23% · CBD <1%". */
    val subtitle: String
        get() = listOfNotNull(
            type?.let { TypeLabel(it) },
            thcRange?.let { "THC $it" },
            cbdRange?.takeIf { it != "<1%" }?.let { "CBD $it" },
        ).joinToString(" · ")

    private fun TypeLabel(t: StrainType): String = when (t) {
        StrainType.Indica -> "Indica"
        StrainType.Sativa -> "Sativa"
        StrainType.Hybrid -> "Hybrid"
    }

    private companion object {
        val STARS_REGEX = Regex("""(\d+(?:\.\d+)?)★""")
        val REVIEW_COUNT_REGEX = Regex("""([\d,]+)\s+reviews""")
    }
}
