package ai.strainease.app.ui.compare

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * JVM unit tests for the compare-selection contract that the
 * "press and hold a strain card to add to compare" gesture relies
 * on (mirrors `CompareSelectionStoreTests.swift` on iOS and the
 * web's `use-compare-selection.test.ts`).
 */
class CompareSelectionStoreTest {

    @Test
    fun toggleAddsAndRemoves() {
        val store = CompareSelectionStore()
        store.toggle("Blue Dream")
        assertTrue(store.isIn("Blue Dream"))
        assertEquals(listOf("Blue Dream"), store.names.value)
        store.toggle("Blue Dream")
        assertFalse(store.isIn("Blue Dream"))
        assertTrue(store.names.value.isEmpty())
    }

    @Test
    fun isInIsCaseInsensitive() {
        val store = CompareSelectionStore()
        store.toggle("Blue Dream")
        assertTrue(store.isIn("blue dream"))
        // Toggling a different case removes the original entry.
        store.toggle("BLUE DREAM")
        assertTrue(store.names.value.isEmpty())
    }

    @Test
    fun capDropsAdditionalStrains() {
        val store = CompareSelectionStore()
        store.toggle("One")
        store.toggle("Two")
        store.toggle("Three")
        store.toggle("Four")
        assertEquals(3, store.names.value.size)
        assertTrue(store.atCap)
        assertFalse(store.isIn("Four"))
    }

    @Test
    fun clearResetsSelection() {
        val store = CompareSelectionStore()
        store.toggle("One")
        store.setError("boom")
        store.clear()
        assertTrue(store.names.value.isEmpty())
        assertEquals(null, store.errorMessage.value)
    }
}
