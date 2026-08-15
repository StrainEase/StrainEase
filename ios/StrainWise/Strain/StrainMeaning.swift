import Foundation

enum StrainMeaning {
    private static let terpeneCopy: [String: String] = [
        "myrcene": "Earthy. Often linked with body heaviness and easier sleep.",
        "limonene": "Citrus. Commonly described as mood-lifting and daytime-friendly.",
        "caryophyllene": "Peppery. Patients often mention it for stress and body tension.",
        "pinene": "Pine. Associated with a clearer, more alert head.",
        "linalool": "Floral. Frequently reported as calming.",
        "terpinolene": "Herbal-citrus. Often a brighter, more stimulating profile.",
        "humulene": "Hoppy. Sometimes noted as appetite-dampening.",
        "ocimene": "Sweet-herbal. Usually described as uplifting.",
    ]

    private static let night = Set(["sleepy", "relaxed", "sedated", "hungry", "tingly"])
    private static let day = Set(["energetic", "focused", "uplifted", "creative", "talkative", "happy"])

    static func terpeneMeaning(_ name: String) -> String? {
        terpeneCopy[name.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()]
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
