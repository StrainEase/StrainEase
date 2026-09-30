package ai.strainease.app.ui.strain

import ai.strainease.app.data.SampleGranddaddyPurple
import ai.strainease.app.models.StrainEffect
import ai.strainease.app.models.StrainProfile
import ai.strainease.app.models.StrainType
import ai.strainease.app.models.Terpene
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * JVM unit tests for the strain detail hydration skeleton
 * state. Mirrors the iOS
 * `testPartialStrainListsEveryAISectionAsPending` so both
 * surfaces agree on which fields force a placeholder and which
 * fields the catalog can leave empty without flashing a
 * skeleton.
 */
class StrainHydrationTest {

    /**
     * A Home-rail stub carries only name / inKnowledgeBase /
     * type / THC. Every researched section must show its
     * hydration placeholder so the detail page never collapses
     * to a blank stack while the search() call is in flight.
     */
    @Test
    fun partialStubHasEverySectionPending() {
        val stub = StrainProfile(
            name = "Green Crack",
            inKnowledgeBase = true,
            type = StrainType.Sativa,
            thcRange = "15–25%",
        )
        val pending = stub.pendingHydrationSections
        assertEquals(
            "A catalog stub must show a placeholder for every researched section",
            StrainHydrationSection.entries.toSet(),
            pending,
        )
    }

    /**
     * Every researched section must carry a non-empty caption
     * so the placeholder card never renders an empty status
     * line. This is the defensive test the iOS suite runs in
     * the same breath — we keep the parity so a new enum case
     * added on one platform without a caption gets caught
     * here too.
     */
    @Test
    fun everySectionHasNonEmptyCaption() {
        val sections = StrainHydrationSection.entries
        assertTrue(
            "Every StrainHydrationSection must declare a caption",
            sections.all { it.caption.isNotEmpty() },
        )
        assertTrue(
            "Every StrainHydrationSection must declare a title",
            sections.all { it.title.isNotEmpty() },
        )
        assertTrue(
            "Every StrainHydrationSection must declare at least one placeholder line",
            sections.all { it.placeholderLines > 0 },
        )
    }

    /**
     * A fully hydrated sample (the iOS / Android preview
     * fixture for Granddaddy Purple) must not flag any of the
     * researched sections as pending. Description, effects,
     * and community in particular — the three the iOS test
     * also pins down.
     */
    @Test
    fun fullyHydratedSampleHasNoResearchedSectionsPending() {
        val pending = SampleGranddaddyPurple.pendingHydrationSections
        assertFalse(
            "Granddaddy Purple's description is already filled in by the preview fixture",
            StrainHydrationSection.Description in pending,
        )
        assertFalse(
            "Granddaddy Purple's effects are already filled in by the preview fixture",
            StrainHydrationSection.Effects in pending,
        )
        assertFalse(
            "Granddaddy Purple's community block (quote notes + rating cards) is already filled in",
            StrainHydrationSection.Community in pending,
        )
    }

    /**
     * Lineage is part of the researched set, so a profile that
     * hasn't seen search() yet must surface it as pending even
     * when the strain has a type (which used to gate
     * dayNight in the original Android implementation).
     */
    @Test
    fun lineagePendingWhenAbsentEvenIfTypePresent() {
        val stub = StrainProfile(
            name = "X",
            inKnowledgeBase = true,
            type = StrainType.Hybrid,
            thcRange = "15–25%",
        )
        val pending = stub.pendingHydrationSections
        assertTrue(
            "Lineage is a researched field; missing lineage must show the spinner",
            StrainHydrationSection.Lineage in pending,
        )
    }

    /**
     * The community placeholder is gated on BOTH `quoteNotes`
     * and `resolvedCommunityRatings` being empty. A profile
     * that has only a star rating (no quotes) should NOT show
     * the community skeleton — the rating card is enough for
     * the reader to feel the section has content. This matches
     * the iOS `quoteNotes.isEmpty && resolvedCommunityRatings.isEmpty`
     * check.
     */
    @Test
    fun communityPendingOnlyWhenBothQuotesAndRatingsAbsent() {
        // Rating only — no quote notes. CommunityVoicesSection
        // will still render a real Leafly card so the skeleton
        // is unnecessary.
        val ratingOnly = StrainProfile(
            name = "X",
            inKnowledgeBase = true,
            type = StrainType.Hybrid,
            leaflyRating = 4.5,
            leaflyReviewCount = 3201,
        )
        assertFalse(
            "A profile with a star rating but no quote notes must not show the community skeleton",
            StrainHydrationSection.Community in ratingOnly.pendingHydrationSections,
        )

        // Quote only — no star rating cards. The Reddit /
        // weed-site tabs are enough to fill the section.
        val quotesOnly = StrainProfile(
            name = "X",
            inKnowledgeBase = true,
            type = StrainType.Hybrid,
            communityNotes = listOf(
                ai.strainease.app.models.CommunityNote(
                    source = "Reddit · r/trees",
                    text = "Genuinely helps me sleep.",
                ),
            ),
        )
        assertFalse(
            "A profile with quote notes but no star rating must not show the community skeleton",
            StrainHydrationSection.Community in quotesOnly.pendingHydrationSections,
        )

        // Neither — the skeleton is required.
        val empty = StrainProfile(
            name = "X",
            inKnowledgeBase = true,
            type = StrainType.Hybrid,
        )
        assertTrue(
            "A profile with neither ratings nor quotes must flag community as pending",
            StrainHydrationSection.Community in empty.pendingHydrationSections,
        )
    }

    /**
     * `copyHydratedFrom` is the bridge that patches a stub
     * with the fresh search() result. It must leave any
     * already-filled field alone and fill in only the
     * sections we asked it to patch.
     */
    @Test
    fun copyHydratedFromFillsRequestedSections() {
        val stub = StrainProfile(
            name = "Green Crack",
            inKnowledgeBase = true,
            type = StrainType.Sativa,
            thcRange = "15–25%",
        )
        val fresh = StrainProfile(
            name = "Green Crack",
            inKnowledgeBase = true,
            type = StrainType.Sativa,
            thcRange = "15–25%",
            lineage = "Skunk #1 × Unknown",
            description = "Energetic sativa for daytime focus.",
            medicalUses = listOf("Fatigue", "Depression"),
            effects = listOf(StrainEffect("Energetic", 4), StrainEffect("Uplifted", 3)),
            terpenes = listOf(Terpene("Limonene", "Citrus")),
            sideEffects = listOf("Dry mouth"),
        )
        val merged = stub.copyHydratedFrom(fresh, StrainHydrationSection.entries.toSet())
        assertEquals("Skunk #1 × Unknown", merged.lineage)
        assertEquals("Energetic sativa for daytime focus.", merged.description)
        assertEquals(listOf("Fatigue", "Depression"), merged.medicalUses)
        assertEquals(2, merged.effects?.size)
        assertEquals(1, merged.terpenes?.size)
        assertEquals(listOf("Dry mouth"), merged.sideEffects)
        assertEquals("Green Crack", merged.name)
    }

    /**
     * `copyHydratedFrom` must not overwrite a populated
     * field — even if a `other` payload has a value for it.
     * This protects callers that pass a wider `sections` set
     * than the stub actually needs.
     */
    @Test
    fun copyHydratedFromLeavesPopulatedFieldsAlone() {
        val full = SampleGranddaddyPurple
        val stub = StrainProfile(
            name = full.name,
            inKnowledgeBase = true,
            type = StrainType.Indica,
            thcRange = "17–23%",
            // Stub already has a lineage; search() will overwrite
            // it but `copyHydratedFrom` must keep the stub's
            // value when the requested set does NOT include
            // `.Lineage`.
            lineage = "Purple Urkle × Big Bud",
        )
        val fresh = stub.copy(description = "Different description", lineage = "Different lineage")
        val merged = stub.copyHydratedFrom(
            other = fresh,
            sections = setOf(StrainHydrationSection.Description),
        )
        assertEquals("Purple Urkle × Big Bud", merged.lineage)
        assertEquals("Different description", merged.description)
    }

    /**
     * Lineage has an extra defensive guard on top of the
     * standard `in sections && other != null` check: even when
     * `.Lineage` IS in [sections], the helper must keep the
     * stub's lineage if the stub already has one. This protects
     * any future caller that constructs a wider-than-pending
     * `sections` set from silently losing the local value.
     */
    @Test
    fun copyHydratedFromKeepsStubLineageEvenWhenSectionRequested() {
        val stub = StrainProfile(
            name = "Green Crack",
            inKnowledgeBase = true,
            type = StrainType.Sativa,
            thcRange = "15–25%",
            lineage = "Skunk #1 × Afghani",
        )
        val fresh = stub.copy(lineage = "Different lineage from search()")
        val merged = stub.copyHydratedFrom(
            other = fresh,
            sections = setOf(StrainHydrationSection.Lineage),
        )
        assertEquals(
            "Stub lineage must be preserved when the stub already has one",
            "Skunk #1 × Afghani",
            merged.lineage,
        )
    }

    /**
     * The "Home rail stub has a rating but no quote notes" case
     * is the one that motivated splitting the merge out of the
     * `.Community in sections` gate. A stub that ships with
     * `leaflyRating = 4.5` does not put `.Community` in
     * [pendingHydrationSections] (resolvedCommunityRatings is
     * not empty), so `sections` for [StrainDetailView]'s call
     * site never includes `.Community`. The merge must still
     * pick up the fresh `communityNotes` so the CommunityVoices
     * tab shows real reviews, not a permanent "no reviews
     * yet" empty state.
     */
    @Test
    fun copyHydratedFromPullsCommunityNotesEvenWithoutCommunityInSections() {
        val stub = StrainProfile(
            name = "Blue Dream",
            inKnowledgeBase = true,
            type = StrainType.Hybrid,
            thcRange = "17–24%",
            // Stub already has a Leafly rating; this is the
            // common home-rail shape. No communityNotes yet.
            leaflyRating = 4.5,
            leaflyReviewCount = 3201,
        )
        val fresh = stub.copy(
            communityNotes = listOf(
                ai.strainease.app.models.CommunityNote(
                    source = "Reddit · r/trees",
                    text = "Genuinely helpful for sleep.",
                ),
            ),
            weedmapsRating = 4.2,
            weedmapsReviewCount = 88,
        )
        // Caller asks for the standard pending set, which
        // does NOT include .Community for a rating-only stub.
        val sections = setOf(
            StrainHydrationSection.Uses,
            StrainHydrationSection.Effects,
        )
        val merged = stub.copyHydratedFrom(fresh, sections)
        assertEquals(
            "Fresh community notes must win even when .Community is not in sections",
            1,
            merged.communityNotes?.size,
        )
        assertEquals(
            "Fresh Weedmaps rating must surface even without .Community in sections",
            4.2,
            merged.weedmapsRating,
        )
        assertEquals(
            "Fresh Weedmaps review count must surface even without .Community in sections",
            88,
            merged.weedmapsReviewCount,
        )
    }

    /**
     * A stub that has no community data at all should still
     * land on empty communityNotes after merge (not null), so
     * downstream code that reads `quoteNotes` doesn't see a
     * "missing field" surprise. The fresh profile with no
     * communityNotes keeps the stub's null and the resulting
     * `quoteNotes` list is empty.
     */
    @Test
    fun copyHydratedFromLeavesCommunityNotesNullWhenFreshHasNone() {
        val stub = StrainProfile(
            name = "Mystery",
            inKnowledgeBase = true,
            type = StrainType.Hybrid,
        )
        val fresh = stub.copy(description = "Just some text.")
        val merged = stub.copyHydratedFrom(
            fresh,
            setOf(StrainHydrationSection.Description),
        )
        assertNull(
            "A stub with no communityNotes and a fresh profile with no communityNotes should stay null",
            merged.communityNotes,
        )
    }

    /**
     * The hydration metadata is the contract between
     * StrainDetailView and the skeleton composable; if anyone
     * renames a section title the UI eyebrow would silently
     * change. Pin the public-facing strings so a typo is
     * caught by the test runner.
     */
    @Test
    fun sectionTitlesAndCaptionsAreStable() {
        assertEquals("Overview", StrainHydrationSection.Description.title)
        assertEquals("Lineage", StrainHydrationSection.Lineage.title)
        assertEquals("Commonly used for", StrainHydrationSection.Uses.title)
        assertEquals("Effects", StrainHydrationSection.Effects.title)
        assertEquals("Terpenes", StrainHydrationSection.Terpenes.title)
        assertEquals("Watch for", StrainHydrationSection.SideEffects.title)
        assertEquals("Community voices", StrainHydrationSection.Community.title)

        assertEquals(3, StrainHydrationSection.Description.placeholderLines)
        assertEquals(1, StrainHydrationSection.Lineage.placeholderLines)
        assertEquals(2, StrainHydrationSection.Uses.placeholderLines)
        assertEquals(4, StrainHydrationSection.Effects.placeholderLines)
        assertEquals(2, StrainHydrationSection.Terpenes.placeholderLines)
        assertEquals(2, StrainHydrationSection.SideEffects.placeholderLines)
        assertEquals(3, StrainHydrationSection.Community.placeholderLines)
    }

    /**
     * Defensive: a profile with no fields at all (not even a
     * type) must still expose the union of every section as
     * pending, so a truly empty stub doesn't lose any
     * placeholder.
     */
    @Test
    fun emptyProfileListsEverySectionPending() {
        val empty = StrainProfile(name = "X")
        assertNull(empty.type)
        assertNull(empty.description)
        assertNull(empty.lineage)
        assertEquals(
            StrainHydrationSection.entries.toSet(),
            empty.pendingHydrationSections,
        )
    }
}
