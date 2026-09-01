// Daily symptom check-ins. One document per day per user, keyed by
// `YYYY-MM-DD`. Tracks four 1-5 scales (mood, sleep, pain, anxiety)
// plus an optional free-text note. Mirrors the web `check-ins.ts`
// so the same Firestore subcollection feeds all three clients.
//
// Firestore rules live in `firestore.rules` under
// `users/{uid}/checkIns/{dateId}`. The doc id is the date key so
// the rule can reject a second same-day create and we get
// "upsert by date" semantics for free.

import FirebaseAuth
import FirebaseFirestore
import Foundation

/// Four 1-5 symptom scales. All four are stored on every check-in
/// so the trend view can average each independently; pain and
/// anxiety default to 3 (neutral) when the patient chooses not to
/// score them yet.
struct CheckInMetrics: Hashable, Codable, Sendable {
    /// 1 = low / awful, 5 = great.
    var mood: Int
    /// 1 = no sleep, 5 = fully rested.
    var sleep: Int
    /// 1 = no pain, 5 = severe pain.
    var pain: Int
    /// 1 = calm, 5 = severe anxiety.
    var anxiety: Int
}

/// One check-in, normalized for the UI. `id` is the date key
/// (`YYYY-MM-DD`).
struct CheckIn: Identifiable, Hashable, Sendable {
    var id: String
    var date: String
    var metrics: CheckInMetrics
    var note: String
    var createdAt: Int
    var updatedAt: Int
}

/// Default metric values when the patient hasn't scored a scale
/// yet. Picked to be a neutral 3/5 across the board so the form
/// never starts with an alarming red button selected.
let defaultCheckInMetrics = CheckInMetrics(mood: 3, sleep: 3, pain: 3, anxiety: 3)

/// Same `users/{uid}/checkIns/{dateId}` subcollection as the web
/// app. 1:1 port of the web `useCheckIns` hook.
@Observable
@MainActor
final class CheckInStore {
    private(set) var checkIns: [CheckIn] = []
    private(set) var isBusy = false
    var errorMessage: String?

    @ObservationIgnored private var listener: ListenerRegistration?
    @ObservationIgnored private let previewOnly: Bool

    init() {
        previewOnly = false
    }

    static func preview(_ checkIns: [CheckIn] = []) -> CheckInStore {
        CheckInStore(previewCheckIns: checkIns)
    }

    private init(previewCheckIns: [CheckIn]) {
        previewOnly = true
        checkIns = previewCheckIns
    }

    /// Look up today's check-in (if any) by date key.
    func checkIn(forKey key: String) -> CheckIn? {
        checkIns.first { $0.id == key }
    }

    /// Subscribe to the current user's check-ins. Sort newest date
    /// first so the dashboard panel can render without re-sorting.
    func listen(uid: String) {
        guard !previewOnly else { return }
        listener?.remove()
        listener = Firestore.firestore()
            .collection("users")
            .document(uid)
            .collection("checkIns")
            .addSnapshotListener { [weak self] snap, error in
                Task { @MainActor in
                    guard let self else { return }
                    if let error {
                        self.errorMessage = error.localizedDescription
                        return
                    }
                    self.checkIns = (snap?.documents ?? []).compactMap { Self.parse($0) }
                        .sorted { $0.date > $1.date }
                }
            }
    }

    func reset() {
        listener?.remove()
        listener = nil
        checkIns = []
        errorMessage = nil
        isBusy = false
    }

    /// Build the "YYYY-MM-DD" id for a given timestamp. Local time,
    /// not UTC, so a check-in at 11pm lands on the patient's day.
    static func todayKey(at timestamp: Int = Int(Date().timeIntervalSince1970 * 1000)) -> String {
        Self.key(for: timestamp)
    }

    static func key(for timestamp: Int) -> String {
        let date = Date(timeIntervalSince1970: TimeInterval(timestamp) / 1000)
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }

    static func isToday(_ key: String) -> Bool {
        key == todayKey()
    }

    /// Clamp metric values to the 1-5 range; non-numbers fall back
    /// to the neutral 3.
    static func normalize(_ metrics: CheckInMetrics) -> CheckInMetrics {
        CheckInMetrics(
            mood: clamp(metrics.mood),
            sleep: clamp(metrics.sleep),
            pain: clamp(metrics.pain),
            anxiety: clamp(metrics.anxiety)
        )
    }

    private static func clamp(_ n: Int) -> Int {
        if n < 1 { return 3 }
        if n > 5 { return 5 }
        return n
    }

    /// Build the rule-safe payload for an upsert. Caps `note` to
    /// `checkInNoteMax` so the Firestore rule can reject anything
    /// longer.
    static func payload(date: String, metrics: CheckInMetrics, note: String, now: Int) -> [String: Any] {
        let normalized = normalize(metrics)
        let trimmed = String(note.trimmingCharacters(in: .whitespacesAndNewlines).prefix(checkInNoteMax))
        return [
            "date": date,
            "mood": normalized.mood,
            "sleep": normalized.sleep,
            "pain": normalized.pain,
            "anxiety": normalized.anxiety,
            "note": trimmed,
            "createdAt": now,
            "updatedAt": now,
        ]
    }

    /// Firestore rule caps note.size() <= 1000; mirror the limit
    /// client-side so the disabled state lands before the user
    /// hits "Save".
    static let checkInNoteMax = 1000

    /// Upsert today's check-in. The doc id is the date key, so
    /// the Firestore rule rejects a second same-day create and
    /// every write is a merge that overwrites the previous values
    /// for the day.
    func upsertToday(metrics: CheckInMetrics, note: String) async {
        guard !previewOnly, let uid = Auth.auth().currentUser?.uid else { return }
        let now = Int(Date().timeIntervalSince1970 * 1000)
        let date = Self.todayKey(at: now)
        let body = Self.payload(date: date, metrics: metrics, note: note, now: now)
        isBusy = true
        defer { isBusy = false }
        do {
            try await Firestore.firestore()
                .collection("users")
                .document(uid)
                .collection("checkIns")
                .document(date)
                .setData(body, merge: true)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// Wipe a check-in. Used by the panel's "Clear" affordance so
    /// a patient can wipe a day they logged by mistake.
    func delete(dateId: String) async {
        guard !previewOnly, let uid = Auth.auth().currentUser?.uid else { return }
        do {
            try await Firestore.firestore()
                .collection("users")
                .document(uid)
                .collection("checkIns")
                .document(dateId)
                .delete()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private static func parse(_ doc: QueryDocumentSnapshot) -> CheckIn? {
        let data = doc.data()
        return CheckIn(
            id: doc.documentID,
            date: (data["date"] as? String) ?? doc.documentID,
            metrics: CheckInMetrics(
                mood: (data["mood"] as? Int) ?? 3,
                sleep: (data["sleep"] as? Int) ?? 3,
                pain: (data["pain"] as? Int) ?? 3,
                anxiety: (data["anxiety"] as? Int) ?? 3
            ),
            note: (data["note"] as? String) ?? "",
            createdAt: (data["createdAt"] as? Int) ?? 0,
            updatedAt: (data["updatedAt"] as? Int) ?? 0
        )
    }
}

// MARK: - Trend rollup

/// One row of the 14-day trend. Each metric is `nil` when no
/// check-in was logged that day, so the sparkline can render a
/// gap.
struct CheckInTrendPoint: Hashable, Sendable {
    var date: String
    var mood: Int?
    var sleep: Int?
    var pain: Int?
    var anxiety: Int?
}

struct CheckInTrend: Hashable, Sendable {
    var days: [CheckInTrendPoint]
    /// Days where a check-in was actually logged.
    var loggedDays: Int
    /// Average of the 4 metrics across the trend window, or nil
    /// when nothing was logged.
    var averages: CheckInMetrics?
}

extension CheckInStore {
    static let trendDays = 14

    /// Build a 14-day trend (oldest → newest). Days with no
    /// check-in are `nil` per-metric so the sparkline can render
    /// a gap.
    static func buildTrend(
        from checkIns: [CheckIn],
        now: Int = Int(Date().timeIntervalSince1970 * 1000),
        days: Int = trendDays
    ) -> CheckInTrend {
        let todayKey = Self.key(for: now)
        let startKey = addDays(todayKey, by: -(days - 1))
        let byDate = Dictionary(uniqueKeysWithValues: checkIns.map { ($0.date, $0) })
        var points: [CheckInTrendPoint] = []
        var logged = 0
        var moodSum = 0
        var sleepSum = 0
        var painSum = 0
        var anxietySum = 0
        for i in 0..<days {
            let date = addDays(startKey, by: i)
            if let ci = byDate[date] {
                logged += 1
                moodSum += ci.metrics.mood
                sleepSum += ci.metrics.sleep
                painSum += ci.metrics.pain
                anxietySum += ci.metrics.anxiety
                points.append(CheckInTrendPoint(
                    date: date,
                    mood: ci.metrics.mood,
                    sleep: ci.metrics.sleep,
                    pain: ci.metrics.pain,
                    anxiety: ci.metrics.anxiety
                ))
            } else {
                points.append(CheckInTrendPoint(
                    date: date,
                    mood: nil,
                    sleep: nil,
                    pain: nil,
                    anxiety: nil
                ))
            }
        }
        let averages: CheckInMetrics? = logged > 0 ? CheckInMetrics(
            mood: moodSum / logged,
            sleep: sleepSum / logged,
            pain: painSum / logged,
            anxiety: anxietySum / logged
        ) : nil
        return CheckInTrend(days: points, loggedDays: logged, averages: averages)
    }

    private static func addDays(_ key: String, by delta: Int) -> String {
        return addDaysInternal(key, by: delta)
    }

    /// Test-visible variant of the date arithmetic. The
    /// `addDaysPublic` name is the explicit hand-off — production
    /// callers go through `addDays` (private-by-convention) and
    /// tests use this one.
    static func addDaysPublic(_ key: String, by delta: Int) -> String {
        return addDaysInternal(key, by: delta)
    }

    private static func addDaysInternal(_ key: String, by delta: Int) -> String {
        let parts = key.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return key }
        var comp = DateComponents()
        comp.year = parts[0]
        comp.month = parts[1]
        comp.day = parts[2]
        comp.timeZone = TimeZone(identifier: "UTC")
        let cal = Calendar(identifier: .gregorian)
        guard let date = cal.date(from: comp) else { return key }
        let shifted = cal.date(byAdding: .day, value: delta, to: date) ?? date
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone(identifier: "UTC")
        return formatter.string(from: shifted)
    }
}
