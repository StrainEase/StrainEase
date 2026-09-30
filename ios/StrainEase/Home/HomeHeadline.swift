import Foundation

/// Time-of-day hero copy. Mirrors `src/lib/time-of-day.ts` so the same
/// local hour and calendar day yield the same headline on web and iOS.
enum DayPart: String, CaseIterable, Sendable {
    case morning
    case afternoon
    case evening
    case night
}

enum HomeHeadline {
    static let subtitle =
        "Popular picks, symptoms, and phenotypes — tap See more for the full grid."

    static let pools: [DayPart: [String]] = [
        .morning: [
            "Ease into the day with the right strain",
            "Find a strain that fits your morning",
            "Start the day a little softer",
        ],
        .afternoon: [
            "Find a strain that fits the afternoon",
            "Something steady for the middle of the day",
            "Pick a strain that keeps you even-keeled",
        ],
        .evening: [
            "Find a strain that fits tonight",
            "Wind down with the right strain",
            "Settle in — pick a strain for the evening",
        ],
        .night: [
            "Find a strain that fits the late hour",
            "Quiet the day with the right strain",
            "Pick a strain for a calmer night",
        ],
    ]

    /// morning 5–11, afternoon 12–16, evening 17–21, night otherwise.
    static func dayPart(for date: Date, calendar: Calendar = .current) -> DayPart {
        let hour = calendar.component(.hour, from: date)
        if hour >= 5 && hour < 12 { return .morning }
        if hour >= 12 && hour < 17 { return .afternoon }
        if hour >= 17 && hour < 22 { return .evening }
        return .night
    }

    /// Deterministic per local calendar day + day-part, matching the web
    /// `Date.UTC(y, m, d)` index from 2024-01-01.
    static func text(for date: Date = Date(), calendar: Calendar = .current) -> String {
        let part = dayPart(for: date, calendar: calendar)
        let pool = pools[part] ?? []
        guard !pool.isEmpty else { return "" }
        let index = calendarDayIndex(for: date, calendar: calendar)
        let offset = index % pool.count
        let safe = offset >= 0 ? offset : offset + pool.count
        return pool[safe]
    }

    static func calendarDayIndex(for date: Date, calendar: Calendar = .current) -> Int {
        let parts = calendar.dateComponents([.year, .month, .day], from: date)
        var utc = Calendar(identifier: .gregorian)
        utc.timeZone = TimeZone(secondsFromGMT: 0)!
        guard
            let year = parts.year,
            let month = parts.month,
            let day = parts.day,
            let thisDay = utc.date(from: DateComponents(year: year, month: month, day: day)),
            let epoch = utc.date(from: DateComponents(year: 2024, month: 1, day: 1))
        else { return 0 }
        return Int(thisDay.timeIntervalSince(epoch) / 86_400)
    }
}
