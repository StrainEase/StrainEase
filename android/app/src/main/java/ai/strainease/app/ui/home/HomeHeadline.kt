package com.strainwise.app.ui.home

import java.util.Calendar

/**
 * Time-of-day hero copy. Mirrors `src/lib/time-of-day.ts` so the same
 * local hour and calendar day yield the same headline on web and Android.
 *
 * Hour buckets (local time):
 *   morning  → 05:00–11:59
 *   afternoon → 12:00–16:59
 *   evening  → 17:00–21:59
 *   night    → everything else
 *
 * The headline pool index is deterministic per local calendar day
 * (same calendar day = same headline, no jitter on re-renders).
 * Epoch for day-index is 2024-01-01, matching iOS and web.
 */
object HomeHeadline {

    const val SUBTITLE = "Popular picks, symptoms, and phenotypes — tap See more for the full grid."

    private val HEADLINES = mapOf(
        DayPart.MORNING to listOf(
            "Ease into the day with the right strain",
            "Find a strain that fits your morning",
            "Start the day a little softer",
        ),
        DayPart.AFTERNOON to listOf(
            "Find a strain that fits the afternoon",
            "Something steady for the middle of the day",
            "Pick a strain that keeps you even-keeled",
        ),
        DayPart.EVENING to listOf(
            "Find a strain that fits tonight",
            "Wind down with the right strain",
            "Settle in — pick a strain for the evening",
        ),
        DayPart.NIGHT to listOf(
            "Find a strain that fits the late hour",
            "Quiet the day with the right strain",
            "Pick a strain for a calmer night",
        ),
    )

    /** Primary headline string, selected deterministically by local day + day-part. */
    fun text(calendar: Calendar = Calendar.getInstance()): String {
        val part = dayPart(calendar)
        val pool = HEADLINES[part] ?: return ""
        if (pool.isEmpty()) return ""
        val index = calendarDayIndex(calendar)
        val offset = ((index % pool.size) + pool.size) % pool.size
        return pool[offset]
    }

    /** Maps a calendar to one of four day-part buckets. */
    private fun dayPart(calendar: Calendar): DayPart {
        val hour = calendar.get(Calendar.HOUR_OF_DAY)
        return when {
            hour in 5..11  -> DayPart.MORNING
            hour in 12..16 -> DayPart.AFTERNOON
            hour in 17..21 -> DayPart.EVENING
            else           -> DayPart.NIGHT
        }
    }

    /**
     * Day index since 2024-01-01 (local calendar day).
     * Same formula as the web `timeOfDayHeadline` so all three
     * surfaces land on the same pool entry on the same day.
     */
    private fun calendarDayIndex(calendar: Calendar): Int {
        val cal = Calendar.getInstance().apply {
            timeInMillis = calendar.timeInMillis
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        val epoch = Calendar.getInstance().apply {
            set(2024, Calendar.JANUARY, 1, 0, 0, 0)
            set(Calendar.MILLISECOND, 0)
        }
        val diffMs = cal.timeInMillis - epoch.timeInMillis
        return (diffMs / (24 * 60 * 60 * 1000)).toInt()
    }

    enum class DayPart {
        MORNING,
        AFTERNOON,
        EVENING,
        NIGHT,
    }
}
