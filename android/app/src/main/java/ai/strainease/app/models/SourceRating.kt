package ai.strainease.app.models

/**
 * One per-source rating card for the strain detail surface. Each
 * source that published a star rating (Leafly, Weedmaps, Allbud) gets
 * its own [SourceRating]; [StrainProfile.resolvedCommunityRatings]
 * produces the list in SOURCE_ORDER (Leafly → Weedmaps → Allbud).
 *
 * The companion iOS / web surfaces pass the same shape into their
 * own SourceRating rendering, so the same backend data produces
 * the same chip layout on every platform.
 */
data class SourceRating(
    /** Display name for the source — matches the chip label
     *  ("Leafly", "Weedmaps", "Allbud"). One word, title-cased. */
    val source: String,
    /** Star rating (0–5). Always present for any card the UI renders. */
    val stars: Double,
    /** Published review count for the star rating, if the source
     *  published one. Dropped (null) when unknown rather than shown
     *  as "0 reviews" — a 4.5★ with no count is more honest than
     *  a fake zero. */
    val reviewCount: Int?,
)
