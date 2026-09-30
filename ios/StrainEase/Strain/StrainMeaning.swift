import Foundation

enum StrainMeaning {
    private static let night = Set(["sleepy", "relaxed", "sedated", "hungry", "tingly"])
    private static let day = Set(["energetic", "focused", "uplifted", "creative", "talkative", "happy"])

    /// Reads from the curated TerpeneCatalog so the strain card and the
    /// drill-down sheet show the same copy. Falls back to nil when the
    /// terpene isn't in the curated set, letting callers fall back to
    /// the strain's raw `profile` text.
    static func terpeneMeaning(_ name: String) -> String? {
        TerpeneCatalog.profile(for: name)?.summary
    }

    /// 0 = firmly night, 100 = firmly day.
    static func dayNightScore(_ strain: StrainProfile) -> Int {
        var dayScore = 0
        var nightScore = 0
        for effect in strain.effects ?? [] {
            let key = effect.name.lowercased()
            let weight = max(1, effect.intensity)
            if day.contains(key) { dayScore += weight }
            if night.contains(key) { nightScore += weight }
        }
        if strain.type == .indica { nightScore += 2 }
        if strain.type == .sativa { dayScore += 2 }
        let total = dayScore + nightScore
        guard total > 0 else { return 50 }
        return Int((Double(dayScore) / Double(total) * 100).rounded())
    }

    static func dayNightLabel(_ score: Int) -> String {
        if score >= 65 { return "Better as a daytime strain" }
        if score <= 35 { return "Better as an evening strain" }
        return "Works either side of the day"
    }
}
