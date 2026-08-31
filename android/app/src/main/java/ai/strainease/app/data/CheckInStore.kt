package ai.strainease.app.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

/**
 * Four 1-5 symptom scales. All four are stored on every
 * check-in so the trend view can average each independently;
 * pain and anxiety default to 3 (neutral) when the patient
 * chooses not to score them yet.
 */
@Serializable
data class CheckInMetrics(
    val mood: Int = 3,
    val sleep: Int = 3,
    val pain: Int = 3,
    val anxiety: Int = 3,
)

/**
 * One check-in. The id is the date key (`YYYY-MM-DD`) so the
 * Firestore rule on the web side (and the local upsert here)
 * can reject a second same-day create. Mirrors the iOS
 * `CheckIn` struct and the web `check-ins.ts` shape.
 */
@Serializable
data class CheckIn(
    val date: String,
    val metrics: CheckInMetrics,
    val note: String = "",
    val createdAt: Long,
    val updatedAt: Long,
) {
    val id: String get() = date
}

private val Context.checkInDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "strainease_check_ins",
)

private val CHECK_INS_KEY = stringPreferencesKey("check_ins_v1")

/**
 * Local store for the signed-in user's daily check-ins.
 * Mirrors the iOS `CheckInStore` and the web
 * `useCheckIns` hook so the same data flows across all three
 * clients. Uses DataStore preferences (single JSON list)
 * so a full history can be re-hydrated at boot and the trend
 * view can render without waiting for Firestore.
 *
 * The web Firestore subcollection stays the source of truth
 * for cross-device sync; the Android local cache is the
 * primary read path so the dashboard / trend view render
 * instantly. The PR-A14 follow-up will round-trip the local
 * store to Firestore via the same pattern `ReliefLogStore`
 * already uses.
 */
class CheckInStore(private val context: Context) {

    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    @Volatile
    private var cached: List<CheckIn> = emptyList()

    val checkInsFlow: Flow<List<CheckIn>> =
        context.checkInDataStore.data.map { prefs ->
            prefs[CHECK_INS_KEY]?.let { decode(it) } ?: emptyList()
        }

    val checkIns: List<CheckIn>
        get() = cached

    suspend fun refresh() {
        cached = checkInsFlow.first()
    }

    fun checkInForDate(date: String): CheckIn? = cached.firstOrNull { it.date == date }

    fun checkInForToday(): CheckIn? = checkInForDate(todayKey())

    suspend fun upsert(metrics: CheckInMetrics, note: String) {
        val now = System.currentTimeMillis()
        val date = todayKey()
        val cleanedNote = note.trim().take(CHECK_IN_NOTE_MAX)
        val normalized = normalize(metrics)
        val next = cached.toMutableList()
        val existing = next.indexOfFirst { it.date == date }
        if (existing >= 0) {
            val old = next[existing]
            next[existing] = old.copy(
                metrics = normalized,
                note = cleanedNote,
                updatedAt = now
            )
        } else {
            next.add(
                CheckIn(
                    date = date,
                    metrics = normalized,
                    note = cleanedNote,
                    createdAt = now,
                    updatedAt = now,
                )
            )
        }
        persist(next)
    }

    suspend fun delete(date: String) {
        val next = cached.filterNot { it.date == date }
        persist(next)
    }

    suspend fun clearAll() {
        persist(emptyList())
    }

    private suspend fun persist(next: List<CheckIn>) {
        cached = next
        context.checkInDataStore.edit { prefs ->
            prefs[CHECK_INS_KEY] = json.encodeToString(next)
        }
    }

    private fun decode(raw: String): List<CheckIn> {
        return runCatching { json.decodeFromString<List<CheckIn>>(raw) }
            .getOrDefault(emptyList())
    }

    companion object {
        /** Mirrors the iOS `CheckInStore.checkInNoteMax` and the
         *  Firestore rule cap. */
        const val CHECK_IN_NOTE_MAX = 1000

        /** Clamp metric values to the 1-5 range; out-of-band
         *  values fall back to the neutral 3. */
        fun normalize(metrics: CheckInMetrics): CheckInMetrics {
            return CheckInMetrics(
                mood = clamp(metrics.mood),
                sleep = clamp(metrics.sleep),
                pain = clamp(metrics.pain),
                anxiety = clamp(metrics.anxiety),
            )
        }

        private fun clamp(n: Int): Int = when {
            n < 1 -> 3
            n > 5 -> 5
            else -> n
        }

        /** Default metric values when the patient hasn't scored
         *  a scale yet — picked to be a neutral 3 across the
         *  board so the form never starts with an alarming red
         *  button selected. */
        val defaultMetrics = CheckInMetrics(3, 3, 3, 3)

        /** Build the "YYYY-MM-DD" id for the current local day. */
        fun todayKey(now: Long = System.currentTimeMillis()): String {
            val cal = java.util.Calendar.getInstance()
            cal.timeInMillis = now
            val year = cal.get(java.util.Calendar.YEAR)
            val month = cal.get(java.util.Calendar.MONTH) + 1
            val day = cal.get(java.util.Calendar.DAY_OF_MONTH)
            return "%04d-%02d-%02d".format(year, month, day)
        }

        fun keyFor(now: Long): String = todayKey(now)

        fun isToday(date: String, now: Long = System.currentTimeMillis()): Boolean =
            date == todayKey(now)
    }
}

// MARK: - Trend rollup

/**
 * One row of the 14-day trend. Each metric is `null` when no
 * check-in was logged that day, so the sparkline can render a
 * gap.
 */
data class CheckInTrendPoint(
    val date: String,
    val mood: Int?,
    val sleep: Int?,
    val pain: Int?,
    val anxiety: Int?,
)

data class CheckInTrend(
    val days: List<CheckInTrendPoint>,
    /** Days where a check-in was actually logged. */
    val loggedDays: Int,
    /** Average of the 4 metrics across the trend window, or
     *  null when nothing was logged. */
    val averages: CheckInMetrics?,
)

/**
 * Build a 14-day trend (oldest → newest). Days with no
 * check-in are `null` per-metric so the sparkline can render
 * a gap. Pure function — no DataStore access — so it's
 * trivially testable.
 */
fun buildCheckInTrend(
    checkIns: List<CheckIn>,
    now: Long = System.currentTimeMillis(),
    days: Int = 14,
): CheckInTrend {
    val today = CheckInStore.todayKey(now)
    val start = addDays(today, -(days - 1))
    val byDate = checkIns.associateBy { it.date }
    val points = mutableListOf<CheckInTrendPoint>()
    var logged = 0
    var moodSum = 0
    var sleepSum = 0
    var painSum = 0
    var anxietySum = 0
    for (i in 0 until days) {
        val date = addDays(start, i)
        val entry = byDate[date]
        if (entry != null) {
            logged += 1
            moodSum += entry.metrics.mood
            sleepSum += entry.metrics.sleep
            painSum += entry.metrics.pain
            anxietySum += entry.metrics.anxiety
            points.add(
                CheckInTrendPoint(
                    date = date,
                    mood = entry.metrics.mood,
                    sleep = entry.metrics.sleep,
                    pain = entry.metrics.pain,
                    anxiety = entry.metrics.anxiety,
                )
            )
        } else {
            points.add(
                CheckInTrendPoint(
                    date = date,
                    mood = null,
                    sleep = null,
                    pain = null,
                    anxiety = null,
                )
            )
        }
    }
    val averages = if (logged > 0) {
        CheckInMetrics(
            mood = moodSum / logged,
            sleep = sleepSum / logged,
            pain = painSum / logged,
            anxiety = anxietySum / logged,
        )
    } else {
        null
    }
    return CheckInTrend(days = points, loggedDays = logged, averages = averages)
}

private fun addDays(key: String, delta: Int): String {
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
