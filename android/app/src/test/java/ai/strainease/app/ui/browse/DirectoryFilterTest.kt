package ai.strainease.app.ui.browse

import ai.strainease.app.models.StrainEffect
import ai.strainease.app.models.StrainProfile
import ai.strainease.app.models.StrainType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * JVM unit tests for [DirectoryFilter]. No Android
 * dependency.
 */
class DirectoryFilterTest {

    @Test
    fun thcMidpointParsesRangeWithEnDash() {
        assertEquals(20.5, DirectoryFilter.thcMidpoint("17–24%")!!, 0.0001)
    }

    @Test
    fun thcMidpointParsesSingleValue() {
        assertEquals(20.0, DirectoryFilter.thcMidpoint("~20%")!!, 0.0001)
    }

    @Test
    fun thcMidpointParsesLessThanOne() {
        assertEquals(0.5, DirectoryFilter.thcMidpoint("<1%")!!, 0.0001)
    }

    @Test
    fun thcMidpointNullForEmpty() {
        val a: String? = null
        assertEquals(null, DirectoryFilter.thcMidpoint(a))
        assertEquals(null, DirectoryFilter.thcMidpoint(""))
    }

    @Test
    fun thcBandContainsMatchesBrackets() {
        val mild = DirectoryFilter.ThcBand.Mild
        assertTrue(mild.contains(10.0))
        assertFalse(mild.contains(20.0))
        val strong = DirectoryFilter.ThcBand.Strong
        assertTrue(strong.contains(25.0))
        assertFalse(strong.contains(15.0))
    }

    @Test
    fun effectBucketMatchesRelaxedKeyword() {
        val p = stub(
            effects = listOf(StrainEffect("Relaxed", 4)),
        )
        assertTrue(DirectoryFilter.matches(p, DirectoryFilter.EffectBucket.Relaxing))
    }

    @Test
    fun typeFilterExcludesWrongType() {
        val p = stub(type = StrainType.Sativa)
        assertFalse(DirectoryFilter.matches(p, type = DirectoryFilter.TypeFilter.Indica))
    }

    @Test
    fun ailmentConditionMatchesCaseInsensitive() {
        assertTrue(DirectoryFilter.matchesCondition("insomnia", listOf("Insomnia")))
        assertTrue(DirectoryFilter.matchesCondition("OCD", listOf("Anxiety")))
        assertFalse(DirectoryFilter.matchesCondition("Insomnia", listOf("Pain")))
    }

    private fun stub(
        type: StrainType? = StrainType.Hybrid,
        effects: List<StrainEffect>? = null,
    ) = StrainProfile(
        name = "Stub",
        inKnowledgeBase = true,
        type = type,
        thcRange = "17–24%",
        effects = effects,
    )
}
