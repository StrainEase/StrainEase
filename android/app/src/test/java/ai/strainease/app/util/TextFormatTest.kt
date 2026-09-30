package ai.strainease.app.util

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * JVM unit tests for the shared string helpers. Mirrors the
 * iOS / web Title Case rules for symptoms, effects, and
 * medication names so the three surfaces stay in lockstep.
 */
class TextFormatTest {

    @Test
    fun titleCaseCapitalizesFirstLetterOfEachWord() {
        assertEquals("Insomnia", "insomnia".toTitleCase())
        assertEquals("Chronic Pain", "chronic pain".toTitleCase())
        assertEquals("Dry Mouth", "dry mouth".toTitleCase())
        assertEquals("Dry Eyes", "dry eyes".toTitleCase())
    }

    @Test
    fun titleCaseIsIdempotent() {
        // Running the same input through twice should not change it.
        val once = "Chronic Pain".toTitleCase()
        val twice = once.toTitleCase()
        assertEquals(once, twice)
    }

    @Test
    fun titleCaseIsNoOpForAlreadyTitledStrings() {
        assertEquals("Insomnia", "Insomnia".toTitleCase())
        assertEquals("Stress", "Stress".toTitleCase())
        assertEquals("Relaxed", "Relaxed".toTitleCase())
    }

    @Test
    fun titleCaseHandlesEmptyAndSingleWord() {
        assertEquals("", "".toTitleCase())
        assertEquals("A", "a".toTitleCase())
        assertEquals("Insomnia", "INSOMNIA".toTitleCase())
    }

    @Test
    fun titleCaseLowercasesTheRestOfEachWord() {
        // "PTSD" should become "Ptsd" — we don't try to detect
        // acronyms. Tests pin the current behavior so callers
        // that need acronym preservation can see when this
        // contract changes.
        assertEquals("Ptsd", "PTSD".toTitleCase())
    }
}
