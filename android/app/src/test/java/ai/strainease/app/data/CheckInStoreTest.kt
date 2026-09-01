package ai.strainease.app.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class CheckInStoreTest {

    @Test
    fun `todayKey is YYYY-MM-DD`() {
        val key = CheckInStore.todayKey()
        assertTrue("expected YYYY-MM-DD, got $key", key.matches(Regex("^\\d{4}-\\d{2}-\\d{2}$")))
    }

    @Test
    fun `isToday recognizes current key`() {
        val now = System.currentTimeMillis()
        assertTrue(CheckInStore.isToday(CheckInStore.todayKey(now), now))
        assertTrue(!CheckInStore.isToday("2000-01-01", now))
    }

    @Test
    fun `normalize clamps each metric to 1 through 5`() {
        val m = CheckInStore.normalize(CheckInMetrics(mood = 0, sleep = 7, pain = 3, anxiety = 4))
        assertEquals(3, m.mood) // out-of-range low → neutral
        assertEquals(5, m.sleep) // out-of-range high → 5
        assertEquals(3, m.pain)
        assertEquals(4, m.anxiety)
    }

    @Test
    fun `buildTrend emits fourteen days oldest first`() {
        val now = System.currentTimeMillis()
        val today = CheckInStore.todayKey(now)
        val trend = buildCheckInTrend(emptyList(), now)
        assertEquals(14, trend.days.size)
        assertEquals(today, trend.days.last().date)
        assertNull(trend.averages)
        assertEquals(0, trend.loggedDays)
    }

    @Test
    fun `buildTrend averages across logged days`() {
        val now = System.currentTimeMillis()
        val today = CheckInStore.todayKey(now)
        val yesterday = addDaysForTest(today, -1)
        val samples = listOf(
            makeCheckIn(date = today, mood = 4, sleep = 5, pain = 1, anxiety = 2),
            makeCheckIn(date = yesterday, mood = 2, sleep = 1, pain = 5, anxiety = 4),
        )
        val trend = buildCheckInTrend(samples, now)
        assertEquals(2, trend.loggedDays)
        assertNotNull(trend.averages)
        assertEquals(3, trend.averages!!.mood)
        assertEquals(3, trend.averages!!.sleep)
        assertEquals(3, trend.averages!!.pain)
        assertEquals(3, trend.averages!!.anxiety)
    }

    @Test
    fun `buildTrend skips gaps as nulls`() {
        val now = System.currentTimeMillis()
        val today = CheckInStore.todayKey(now)
        val samples = listOf(makeCheckIn(date = today, mood = 3, sleep = 3, pain = 3, anxiety = 3))
        val trend = buildCheckInTrend(samples, now)
        assertEquals(addDaysForTest(today, -13), trend.days.first().date)
        assertNotNull(trend.days.last().mood)
        assertNull(trend.days.first().mood) // days with no log → nulls
    }

    private fun makeCheckIn(date: String, mood: Int, sleep: Int, pain: Int, anxiety: Int): CheckIn {
        return CheckIn(
            date = date,
            metrics = CheckInMetrics(mood = mood, sleep = sleep, pain = pain, anxiety = anxiety),
            note = "",
            createdAt = 0,
            updatedAt = 0,
        )
    }

    private fun addDaysForTest(key: String, delta: Int): String {
        val parts = key.split("-").mapNotNull { it.toIntOrNull() }
        if (parts.size != 3) return key
        val cal = java.util.Calendar.getInstance(java.util.TimeZone.getTimeZone("UTC"))
        cal.set(parts[0], parts[1] - 1, parts[2], 0, 0, 0)
        cal.set(java.util.Calendar.MILLISECOND, 0)
        cal.add(java.util.Calendar.DAY_OF_MONTH, delta)
        val y = cal.get(java.util.Calendar.YEAR)
        val m = cal.get(java.util.Calendar.MONTH) + 1
        val d = cal.get(java.util.Calendar.DAY_OF_MONTH)
        return "%04d-%02d-%02d".format(y, m, d)
    }
}
