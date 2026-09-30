// Unit tests for the pure parts of CheckInStore — date-key
// formatting, metric clamping, and the 14-day trend rollup.
// Network and Firestore side-effects are not exercised here; the
// store's `preview` initializer avoids those so the tests stay
// hermetic.

import XCTest
@testable import StrainEase

@MainActor
final class CheckInStoreTests: XCTestCase {
    func testKeyIsLocalYYYYMMDD() {
        let now: Int = 1_700_000_000_000
        let key = CheckInStore.key(for: now)
        XCTAssertTrue(key.range(of: #"^\d{4}-\d{2}-\d{2}$"#, options: .regularExpression) != nil,
                      "expected YYYY-MM-DD, got \(key)")
    }

    func testTodayKeyMatchesNow() {
        XCTAssertEqual(CheckInStore.todayKey(at: Int(Date().timeIntervalSince1970 * 1000)),
                       CheckInStore.key(for: Int(Date().timeIntervalSince1970 * 1000)))
    }

    func testIsTodayRecognisesCurrentKey() {
        let now = Int(Date().timeIntervalSince1970 * 1000)
        XCTAssertTrue(CheckInStore.isToday(CheckInStore.key(for: now)))
        XCTAssertFalse(CheckInStore.isToday("2000-01-01"))
    }

    func testNormalizeClampsEachMetricToOneThroughFive() {
        let m = CheckInStore.normalize(CheckInMetrics(mood: 0, sleep: 7, pain: 3, anxiety: 4))
        XCTAssertEqual(m.mood, 3, "out-of-range low falls back to neutral")
        XCTAssertEqual(m.sleep, 5, "out-of-range high clamps to 5")
        XCTAssertEqual(m.pain, 3)
        XCTAssertEqual(m.anxiety, 4)
    }

    func testBuildTrendEmitsFourteenDaysOldestFirst() {
        let now = Int(Date().timeIntervalSince1970 * 1000)
        let todayKey = CheckInStore.key(for: now)
        let trend = CheckInStore.buildTrend(from: [], now: now)
        XCTAssertEqual(trend.days.count, 14)
        XCTAssertEqual(trend.days.last?.date, todayKey, "trend ends today")
        XCTAssertNil(trend.averages, "no data → averages are nil")
        XCTAssertEqual(trend.loggedDays, 0)
    }

    func testBuildTrendAveragesAcrossLoggedDays() {
        let now = Int(Date().timeIntervalSince1970 * 1000)
        let today = CheckInStore.key(for: now)
        let yesterday = CheckInStore.addDaysPublic(today, by: -1)
        let samples = [
            makeCheckIn(date: today, mood: 4, sleep: 5, pain: 1, anxiety: 2),
            makeCheckIn(date: yesterday, mood: 2, sleep: 1, pain: 5, anxiety: 4),
        ]
        let trend = CheckInStore.buildTrend(from: samples, now: now)
        XCTAssertEqual(trend.loggedDays, 2)
        XCTAssertEqual(trend.averages?.mood, 3)
        XCTAssertEqual(trend.averages?.sleep, 3)
        XCTAssertEqual(trend.averages?.pain, 3)
        XCTAssertEqual(trend.averages?.anxiety, 3)
    }

    func testBuildTrendSkipsGapsAsNil() {
        let now = Int(Date().timeIntervalSince1970 * 1000)
        let today = CheckInStore.key(for: now)
        let samples = [makeCheckIn(date: today, mood: 3, sleep: 3, pain: 3, anxiety: 3)]
        let trend = CheckInStore.buildTrend(from: samples, now: now)
        XCTAssertEqual(trend.days.first?.date, CheckInStore.addDaysPublic(today, by: -13))
        XCTAssertNotNil(trend.days.last?.mood)
        XCTAssertNil(trend.days.first?.mood, "days with no log → nulls")
    }

    // MARK: - Helpers

    private func makeCheckIn(date: String, mood: Int, sleep: Int, pain: Int, anxiety: Int) -> CheckIn {
        CheckIn(
            id: date,
            date: date,
            metrics: CheckInMetrics(mood: mood, sleep: sleep, pain: pain, anxiety: anxiety),
            note: "",
            createdAt: 0,
            updatedAt: 0
        )
    }
}
