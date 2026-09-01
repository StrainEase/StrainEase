package ai.strainease.app.data

import android.content.Context
import android.util.Log
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.google.firebase.FirebaseApp
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.SetOptions
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
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
 * Firestore rule on the web side rejects a second same-day
 * create and the local upsert is a merge by date.
 *
 * Mirrors the iOS `CheckIn` struct and the web `check-ins.ts`
 * shape exactly — JSON key names match across all three
 * clients so cross-device sync is a no-op rename.
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
 * The signed-in user's daily check-ins.
 *
 * Mirrors the iOS `CheckInStore` and the web `useCheckIns` hook
 * so the same data shape flows across all three clients.
 *
 * **Sync model**
 *
 * - **Read path** — `checkInsFlow` reads from a local
 *   DataStore cache (`strainease_check_ins`). UI can render
 *   the dashboard / trend view instantly without waiting for
 *   Firestore.
 * - **Write path** — `upsert` writes to the local cache first
 *   (optimistic) and then pushes the same doc to
 *   `users/{uid}/checkIns/{dateId}` so a sign-in on another
 *   device sees the update.
 * - **Remote pull** — `start(uid)` opens a Firestore snapshot
 *   listener on `users/{uid}/checkIns`. Each remote snapshot
 *   is reconciled into the local cache so the UI's local
 *   data always converges to whatever Firestore has.
 * - **Sign-out** — `stop()` removes the listener and forgets
 *   the cached UID. The DataStore cache is preserved so a
 *   re-sign-in (even as a different user, briefly) renders
 *   something rather than a blank page; a future PR can add
 *   a per-uid namespace if the team wants hard isolation.
 *
 * The pattern is intentionally the same as the iOS
 * `CheckInStore` (Firestore listener) layered on top of the
 * existing `ReliefLogStore` DataStore pattern.
 */
class CheckInStore(private val context: Context) {

    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    @Volatile
    private var cached: List<CheckIn> = emptyList()

    @Volatile
    private var currentUid: String? = null

    @Volatile
    private var listener: ListenerRegistration? = null

    /** Read path. Always serves the local DataStore cache. */
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

    /**
     * Open the Firestore listener for the signed-in user. Idempotent —
     * calling `start(uid)` twice with the same UID is a no-op. Callers
     * should invoke this on sign-in and `stop()` on sign-out.
     */
    fun start(uid: String) {
        if (currentUid == uid && listener != null) return
        stop()
        currentUid = uid
        val db = firestore() ?: return
        listener = db.collection("users").document(uid).collection("checkIns")
            .addSnapshotListener { snap, error ->
                if (error != null) {
                    Log.w(TAG, "checkIns listener error: ${error.message}")
                    return@addSnapshotListener
                }
                val remote = (snap?.documents ?: emptyList()).mapNotNull { d ->
                    parseRemote(d.id, d.data ?: return@mapNotNull null)
                }.sortedBy { it.date }
                // Reconcile remote into the local cache. We never delete a
                // local row on a remote snapshot — the local write is the
                // optimistic copy, and Firestore will round-trip back.
                // The remote `updatedAt` is the authority for ordering.
                val byDate = (cached + remote)
                    .groupBy { it.date }
                    .map { (_, items) -> items.maxByOrNull { it.updatedAt }!! }
                    .sortedBy { it.date }
                persistSync(byDate)
            }
    }

    /** Remove the Firestore listener and forget the cached UID. */
    fun stop() {
        listener?.remove()
        listener = null
        currentUid = null
    }

    /**
     * Save today's check-in. Writes to the local DataStore first
     * (optimistic update so the UI reflects the change immediately)
     * and then pushes the same doc to Firestore when the user is
     * signed in.
     */
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
                updatedAt = now,
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
        val createdAt = if (existing < 0) now else null
        pushToFirestore(date, normalized, cleanedNote, now, createdAt)
    }

    suspend fun delete(date: String) {
        val next = cached.filterNot { it.date == date }
        persist(next)
        pushDeleteToFirestore(date)
    }

    suspend fun clearAll() {
        persist(emptyList())
        // Best-effort remote wipe; ignore errors (the caller likely
        // has no UID set in the first place if everything is local).
        val uid = currentUid ?: return
        val db = firestore() ?: return
        runCatching {
            db.collection("users").document(uid).collection("checkIns")
                .get()
                .await()
                .documents
                .forEach { it.reference.delete().await() }
        }.onFailure { Log.w(TAG, "clearAll remote wipe failed: ${it.message}") }
    }

    /**
     * Push the local doc to Firestore. Uses `setData(merge = true)`
     * so the second same-day create from another device wins on
     * `updatedAt` without nuking other fields the server might
     * surface (server-set metadata, future fields).
     */
    private suspend fun pushToFirestore(
        date: String,
        metrics: CheckInMetrics,
        note: String,
        updatedAt: Long,
        createdAt: Long?,
    ) {
        val uid = currentUid ?: return
        val db = firestore() ?: return
        val payload = mapOf(
            "date" to date,
            "mood" to metrics.mood,
            "sleep" to metrics.sleep,
            "pain" to metrics.pain,
            "anxiety" to metrics.anxiety,
            "note" to note,
            "updatedAt" to updatedAt,
            // Only set `createdAt` on a brand-new doc so the server
            // doesn't keep moving the floor forward on every edit.
            "createdAt" to (createdAt ?: updatedAt),
        )
        runCatching {
            db.collection("users").document(uid).collection("checkIns")
                .document(date)
                .set(payload, SetOptions.merge())
                .await()
        }.onFailure { Log.w(TAG, "pushToFirestore failed: ${it.message}") }
    }

    private suspend fun pushDeleteToFirestore(date: String) {
        val uid = currentUid ?: return
        val db = firestore() ?: return
        runCatching {
            db.collection("users").document(uid).collection("checkIns")
                .document(date)
                .delete()
                .await()
        }.onFailure { Log.w(TAG, "pushDeleteToFirestore failed: ${it.message}") }
    }

    private fun firestore(): FirebaseFirestore? {
        return try {
            if (FirebaseApp.getApps(context).isEmpty()) {
                // The app hasn't bootstrapped Firebase yet (e.g. before
                // `StrainEaseApplication.onCreate`). The store still
                // works in local-only mode.
                Log.w(TAG, "firestore() called before FirebaseBootstrap.configure")
                return null
            }
            FirebaseFirestore.getInstance()
        } catch (t: Throwable) {
            Log.w(TAG, "firestore() unavailable: ${t.message}")
            null
        }
    }

    private suspend fun persist(next: List<CheckIn>) {
        cached = next
        context.checkInDataStore.edit { prefs ->
            prefs[CHECK_INS_KEY] = json.encodeToString(next)
        }
    }

    /** Fire-and-forget variant used by the Firestore listener thread. */
    private fun persistSync(next: List<CheckIn>) {
        cached = next
        // The DataStore edit is suspending but the Firestore listener
        // callback is not — hand off through the app-scoped coroutine
        // so the file write completes without blocking the listener.
        // The in-memory `cached` field is updated synchronously above,
        // so any immediate `cached.firstOrNull { ... }` call sees the
        // new data even before the DataStore write finishes.
        val raw = json.encodeToString(next)
        ioScope.launch {
            context.checkInDataStore.edit { prefs ->
                prefs[CHECK_INS_KEY] = raw
            }
        }
    }

    private fun decode(raw: String): List<CheckIn> {
        return runCatching { json.decodeFromString<List<CheckIn>>(raw) }
            .getOrDefault(emptyList())
    }

    private fun parseRemote(id: String, data: Map<String, Any?>): CheckIn? {
        return parseRemoteDocument(id, data)
    }

    companion object {
        private const val TAG = "CheckInStore"

        /**
         * Process-wide scope for fire-and-forget DataStore writes
         * spawned from non-suspending callbacks (Firestore listeners).
         * Using `SupervisorJob` so a single failed write doesn't tear
         * down the scope for subsequent syncs.
         */
        private val ioScope: CoroutineScope =
            CoroutineScope(SupervisorJob() + Dispatchers.IO)

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

/**
 * Top-level parser so the unit tests can exercise the cross-platform
 * shape contract without needing a real `Context` to construct a
 * `CheckInStore`. Pure function — never touches `this`.
 */
internal fun parseRemoteDocument(id: String, data: Map<String, Any?>): CheckIn? {
    if (data.isEmpty()) return null
    val date = (data["date"] as? String) ?: id
    val mood = (data["mood"] as? Long)?.toInt() ?: 3
    val sleep = (data["sleep"] as? Long)?.toInt() ?: 3
    val pain = (data["pain"] as? Long)?.toInt() ?: 3
    val anxiety = (data["anxiety"] as? Long)?.toInt() ?: 3
    val note = (data["note"] as? String) ?: ""
    val createdAt = (data["createdAt"] as? Long)
        ?: (data["createdAt"] as? Double)?.toLong() ?: 0L
    val updatedAt = (data["updatedAt"] as? Long)
        ?: (data["updatedAt"] as? Double)?.toLong() ?: createdAt
    return CheckIn(
        date = date,
        metrics = CheckInMetrics(mood = mood, sleep = sleep, pain = pain, anxiety = anxiety),
        note = note,
        createdAt = createdAt,
        updatedAt = updatedAt,
    )
}
