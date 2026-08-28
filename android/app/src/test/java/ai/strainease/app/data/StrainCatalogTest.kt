package ai.strainease.app.data

import ai.strainease.app.models.StrainType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * JVM unit tests for the [StrainCatalog] helpers. No Android
 * dependency — runs on the host JVM.
 *
 * Covers:
 *  - unique() de-dupes by slug and merges missing fields
 *  - merge() with preferringType keeps type-bucketed rows
 *  - matches() handles case-insensitive ailment matches
 */
class StrainCatalogTest {

    @Test
    fun uniqueDeduplicatesBySlug() {
        val a = stub(name = "Blue Dream", type = StrainType.Hybrid, thcRange = "17–24%")
        val b = stub(name = "blue-dream", imageUrl = "https://example.com/x.png")
        val merged = StrainCatalog.unique(listOf(a, b))
        assertEquals(1, merged.size)
        assertEquals("https://example.com/x.png", merged.first().imageUrl)
    }

    @Test
    fun mergeKeepsTypeFilter() {
        val popular = listOf(
            stub(name = "Blue Dream", type = StrainType.Hybrid, thcRange = "17–24%"),
        )
        val merged = StrainCatalog.merge(popular, preferringType = StrainType.Sativa)
        // Hybrid is filtered out, catalog fills in the sativa rails.
        assertTrue(merged.none { it.name == "Blue Dream" })
        assertTrue(merged.any { it.type == StrainType.Sativa })
    }

    @Test
    fun matchesReturnsTrueForExactAilment() {
        val p = stub(
            name = "GDP",
            type = StrainType.Indica,
            medicalUses = listOf("Insomnia"),
        )
        assertTrue(StrainCatalog.matches(p, "Insomnia"))
    }

    @Test
    fun matchesCaseInsensitive() {
        val p = stub(
            name = "GDP",
            type = StrainType.Indica,
            medicalUses = listOf("insomnia"),
        )
        assertTrue(StrainCatalog.matches(p, "Insomnia"))
    }

    private fun stub(
        name: String,
        type: StrainType? = null,
        thcRange: String? = null,
        medicalUses: List<String>? = null,
        imageUrl: String? = null,
    ) = ai.strainease.app.models.StrainProfile(
        name = name,
        inKnowledgeBase = true,
        type = type,
        thcRange = thcRange,
        medicalUses = medicalUses,
        imageUrl = imageUrl,
    )
}
