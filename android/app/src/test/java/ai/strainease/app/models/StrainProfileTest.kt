package ai.strainease.app.models

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * JVM unit tests for the [StrainProfile] model. No
 * Android dependencies — runs on the host JVM via the
 * JUnit4 test runner, no emulator required.
 *
 * Covers:
 *  - slug generation (lowercase, hyphen, trim)
 *  - subtitle composition
 *  - isPartial flag
 *  - cbdRange / thcRange handling
 *  - resolvedLeaflyRating fallback to community-note text
 */
class StrainProfileTest {

    @Test
    fun slugIsLowercaseHyphenated() {
        val p = sample(name = "Granddaddy Purple")
        assertEquals("granddaddy-purple", p.slug)
    }

    @Test
    fun slugStripsPunctuation() {
        val p = sample(name = "9-Pound Hammer!!")
        assertEquals("9-pound-hammer", p.slug)
    }

    @Test
    fun isPartialTrueWhenDescriptionAndEffectsEmpty() {
        val p = sample(name = "Stub", description = null, effects = null, terpenes = null)
        assertTrue(p.isPartial)
    }

    @Test
    fun isPartialFalseWhenDescriptionPresent() {
        val p = sample(name = "Stub", description = "Real description")
        assertTrue(!p.isPartial)
    }

    @Test
    fun subtitleComposesFromTypeAndRanges() {
        val p = sample(
            name = "GDP",
            type = StrainType.Indica,
            thcRange = "17–23%",
            cbdRange = "<1%",
        )
        // "<1%" is suppressed so the subtitle is "Indica · THC 17–23%".
        assertEquals("Indica · THC 17–23%", p.subtitle)
    }

    @Test
    fun subtitleIncludesCbdWhenAboveOnePercent() {
        val p = sample(
            name = "ACDC",
            type = StrainType.Hybrid,
            thcRange = "1–6%",
            cbdRange = "10–20%",
        )
        assertEquals("Hybrid · THC 1–6% · CBD 10–20%", p.subtitle)
    }

    @Test
    fun resolvedLeaflyRatingFallsBackToCommunityNote() {
        val p = sample(
            name = "X",
            leaflyRating = null,
            communityNotes = listOf(
                CommunityNote(
                    source = "Leafly community",
                    text = "4.6★ from 2,431 reviews",
                ),
            ),
        )
        val resolved = p.resolvedLeaflyRating
        assertNotNull(resolved)
        assertEquals(4.6, resolved!!.first, 0.0001)
        assertEquals(2431, resolved.second)
    }

    @Test
    fun resolvedLeaflyRatingNullWhenAbsent() {
        val p = sample(name = "X", leaflyRating = null, communityNotes = null)
        assertNull(p.resolvedLeaflyRating)
    }

    @Test
    fun quoteNotesExcludesAggregates() {
        val p = sample(
            name = "X",
            communityNotes = listOf(
                CommunityNote(source = "Leafly community", text = "4.5★ from 1000 reviews"),
                CommunityNote(source = "Reddit · r/trees", text = "Knocks me out."),
            ),
        )
        val quotes = p.quoteNotes
        assertEquals(1, quotes.size)
        assertEquals("Reddit · r/trees", quotes.first().source)
    }

    private fun sample(
        name: String = "Blue Dream",
        type: StrainType? = StrainType.Hybrid,
        thcRange: String? = "17–24%",
        cbdRange: String? = "<1%",
        description: String? = "A balanced hybrid.",
        effects: List<StrainEffect>? = listOf(StrainEffect("Relaxed", 3)),
        terpenes: List<Terpene>? = listOf(Terpene("Myrcene", "Earthy")),
        communityNotes: List<CommunityNote>? = null,
        leaflyRating: Double? = null,
    ) = StrainProfile(
        name = name,
        inKnowledgeBase = true,
        type = type,
        thcRange = thcRange,
        cbdRange = cbdRange,
        description = description,
        effects = effects,
        terpenes = terpenes,
        communityNotes = communityNotes,
        leaflyRating = leaflyRating,
    )
}
