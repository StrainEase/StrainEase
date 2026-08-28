package ai.strainease.app.models

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
 *
 * NOTE: do NOT add a `private companion object` to this class. The
 * kotlinx.serialization plugin generates a public `Companion`
 * implementing `KSerializer<StrainProfile>` that
 * `LiveStrainAPI.call<StrainProfile>()` reaches for via
 * `serializer<T>()`. A user-declared private companion shadows the
 * generated one and breaks runtime deserialization with
 * "Field 'StrainProfile.Companion' is inaccessible" — keep helpers
 * at file scope (see [STARS_REGEX] / [REVIEW_COUNT_REGEX] below).
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
    val weedmapsRating: Double? = null,
    val weedmapsReviewCount: Int? = null,
    val allbudRating: Double? = null,
    val allbudReviewCount: Int? = null,
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
     * One rating card per source that published a star rating, in
     * SOURCE_ORDER (Leafly → Weedmaps → Allbud). Strains with all
     * three sources show 3 cards; with just one, 1. No averaging —
     * a blended count would mislead the reader about which catalog
     * the number came from.
     *
     * Falls back to a parsed "Leafly community" note for older
     * profiles that pre-date the per-source fields.
     *
     * Mirrors the iOS `StrainProfile.resolvedCommunityRatings` so
     * the iOS / web / Android strain detail chips all come from the
     * same shape. The single-source [resolvedLeaflyRating] is kept
     * for the existing call sites (the strain detail header, the
     * Home rail poster) and returns the Leafly card verbatim when
     * present, the Allbud card when only Allbud is, and null
     * otherwise.
     */
    val resolvedCommunityRatings: List<SourceRating>
        get() {
            val out = mutableListOf<SourceRating>()
            leaflyRating?.let {
                out.add(SourceRating("Leafly", it, leaflyReviewCount))
            }
            weedmapsRating?.let {
                out.add(SourceRating("Weedmaps", it, weedmapsReviewCount))
            }
            allbudRating?.let {
                out.add(SourceRating("Allbud", it, allbudReviewCount))
            }
            if (out.isNotEmpty()) return out
            for (note in communityNotes.orEmpty()) {
                if (note.source.lowercase() != "leafly community") continue
                val stars = STARS_REGEX.find(note.text)?.groupValues?.get(1)?.toDoubleOrNull()
                val count = REVIEW_COUNT_REGEX.find(note.text)?.groupValues?.get(1)
                    ?.replace(",", "")?.toIntOrNull()
                if (stars != null) {
                    return listOf(SourceRating("Leafly", stars, count))
                }
            }
            return emptyList()
        }

    /**
     * Single-source rating for the strain detail header and Home rail
     * poster — picks Leafly if present, Allbud otherwise, null when
     * neither publishes. Kept for call sites that want the old
     * Pair-of-(stars, count) shape; the new CommunityVoicesSection
     * uses [resolvedCommunityRatings] directly to render 1-3 cards.
     */
    val resolvedLeaflyRating: Pair<Double, Int?>?
        get() {
            val cards = resolvedCommunityRatings
            if (cards.isEmpty()) return null
            if (cards.size == 1) {
                val card = cards.first()
                return card.stars to card.reviewCount
            }
            // Multi-source profiles never reach the legacy caller — the
            // header prefers [resolvedCommunityRatings] for the chip
            // layout. Fall back to the Leafly card so the existing
            // star-strip render keeps working until callers migrate.
            val leafly = cards.firstOrNull { it.source == "Leafly" }
            if (leafly != null) return leafly.stars to leafly.reviewCount
            val avg = Math.round(cards.map { it.stars }.average() * 10) / 10.0
            return avg to null
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
}

// File-scope (not in a companion) so kotlinx.serialization's
// generated `Companion` stays public and reachable.
private val STARS_REGEX = Regex("""(\d+(?:\.\d+)?)★""")
private val REVIEW_COUNT_REGEX = Regex("""([\d,]+)\s+reviews""")
