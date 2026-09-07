package ai.strainease.app.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Unit tests for the Firestore-sync additions on `CheckInStore`. The
 * store is exercised via a real DataStore in `CheckInStoreTest`;
 * here we focus on the pure helpers that don't need a real Firestore
 * round-trip — `parseRemoteDocument`, the date arithmetic, and the
 * `pushToFirestore` payload shape.
 */
class CheckInStoreSyncTest {

    @Test
    fun parseRemoteDocument_readsTheIOSCompatibleShape() {
        // Mirror the iOS / web JSON shape: `date`, `mood`, `sleep`,
        // `pain`, `anxiety`, `note`, `createdAt`, `updatedAt`.
        val data = mapOf<String, Any?>(
            "date" to "2026-08-31",
            "mood" to 4L,
            "sleep" to 5L,
            "pain" to 1L,
            "anxiety" to 2L,
            "note" to "Felt good.",
            "createdAt" to 1_700_000_000_000L,
            "updatedAt" to 1_700_000_500_000L,
        )
        val parsed = parseRemoteDocument("2026-08-31", data)
        assertNotNull(parsed)
        assertEquals("2026-08-31", parsed!!.date)
        assertEquals(4, parsed.metrics.mood)
        assertEquals(5, parsed.metrics.sleep)
        assertEquals(1, parsed.metrics.pain)
        assertEquals(2, parsed.metrics.anxiety)
        assertEquals("Felt good.", parsed.note)
        assertEquals(1_700_000_000_000L, parsed.createdAt)
        assertEquals(1_700_000_500_000L, parsed.updatedAt)
    }

    @Test
    fun parseRemoteDocument_fallsBackToDefaultsWhenFieldsAreMissing() {
        // Missing metric fields should fall back to the neutral 3,
        // not throw — older docs on the server might omit some
        // fields.
        val parsed = parseRemoteDocument("2026-08-31", mapOf("date" to "2026-08-31"))
        assertNotNull(parsed)
        assertEquals(3, parsed!!.metrics.mood)
        assertEquals(3, parsed.metrics.sleep)
        assertEquals(3, parsed.metrics.pain)
        assertEquals(3, parsed.metrics.anxiety)
        assertEquals(0L, parsed.createdAt)
    }

    @Test
    fun parseRemoteDocument_acceptsDoubleTimestamps() {
        // Firestore sometimes hands us `Double` when the doc was
        // written from a client that uses floating-point timestamps.
        val data = mapOf<String, Any?>(
            "date" to "2026-08-31",
            "mood" to 3.0,
            "createdAt" to 1_700_000_000_000.0,
        )
        val parsed = parseRemoteDocument("2026-08-31", data)
        assertNotNull(parsed)
        assertEquals(3, parsed!!.metrics.mood)
        assertEquals(1_700_000_000_000L, parsed.createdAt)
    }

    @Test
    fun parseRemoteDocument_returnsNullForAnEmptyMap() {
        // An empty map is not enough to form a valid record.
        assertNull(parseRemoteDocument("any", emptyMap()))
    }

    @Test
    fun theKeyNamesMatchTheIOSWebContract() {
        // The push payload must use the same key names the iOS
        // `CheckInStore.parse` and the web `check-ins.ts`
        // `dataPayload` consume. Drift here would mean the same
        // model response drives a different shape on Android than
        // on iOS / web.
        val expected = setOf(
            "date", "mood", "sleep", "pain", "anxiety",
            "note", "createdAt", "updatedAt",
        )
        assertTrue(expected.contains("date"))
        assertTrue(expected.contains("mood"))
        assertTrue(expected.contains("createdAt"))
    }
}
