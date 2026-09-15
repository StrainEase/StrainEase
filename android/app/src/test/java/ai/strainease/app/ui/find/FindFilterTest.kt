package ai.strainease.app.ui.find

import ai.strainease.app.models.StrainEffect
import ai.strainease.app.models.StrainProfile
import ai.strainease.app.models.StrainType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * JVM unit tests for [FindFilter]. No Android
 * dependency.
 */
class FindFilterTest {

    @Test
    fun thcMidpointParsesRangeWithEnDash() {
        assertEquals(20.5, FindFilter.thcMidpoint("17–24%")!!, 0.0001)
    }

    @Test
    fun thcMidpointParsesSingleValue() {
        assertEquals(20.0, FindFilter.thcMidpoint("~20%")!!, 0.0001)
    }

    @Test
    fun thcMidpointParsesLessThanOne() {
        assertEquals(0.5, FindFilter.thcMidpoint("<1%")!!, 0.0001)
    }

    @Test
    fun thcMidpointNullForEmpty() {
        val a: String? = null
        assertEquals(null, FindFilter.thcMidpoint(a))
        assertEquals(null, FindFilter.thcMidpoint(""))
    }

    @Test
    fun thcBandContainsMatchesBrackets() {
        val mild = FindFilter.ThcBand.Mild
        assertTrue(mild.contains(10.0))
        assertFalse(mild.contains(20.0))
        val strong = FindFilter.ThcBand.Strong
        assertTrue(strong.contains(25.0))
        assertFalse(strong.contains(15.0))
    }

    @Test
    fun effectBucketMatchesRelaxedKeyword() {
        val p = stub(
            effects = listOf(StrainEffect("Relaxed", 4)),
        )
        assertTrue(FindFilter.matches(p, FindFilter.EffectBucket.Relaxing))
    }

    @Test
    fun typeFilterExcludesWrongType() {
        val p = stub(type = StrainType.Sativa)
        assertFalse(FindFilter.matches(p, type = FindFilter.TypeFilter.Indica))
    }

    @Test
    fun ailmentConditionMatchesCaseInsensitive() {
        assertTrue(FindFilter.matchesCondition("insomnia", listOf("Insomnia")))
        assertTrue(FindFilter.matchesCondition("OCD", listOf("Anxiety")))
        assertFalse(FindFilter.matchesCondition("Insomnia", listOf("Pain")))
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
