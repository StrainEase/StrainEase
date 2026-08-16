import Foundation

/// A curated terpene profile. Same data as `src/lib/terpenes.ts` on web
/// so the strain card and the drill-down sheet show the same copy on
/// both platforms.
struct TerpeneProfile: Equatable, Hashable, Sendable {
    var summary: String
    var description: String
    var characteristics: [String]
    var benefits: [String]
}

enum TerpeneCatalog {
    /// All curated profiles, keyed by lowercased terpene name. Keep in
    /// sync with src/lib/terpenes.ts.
    static let profiles: [String: TerpeneProfile] = [
        "myrcene": TerpeneProfile(
            summary: "Earthy. Often linked with body heaviness and easier sleep.",
            description: "One of the most common terpenes in cannabis. Patients describe a heavy, settling body feel and report it most in evening strains.",
            characteristics: ["Earthy", "Musky", "Herbal"],
            benefits: ["Sleep", "Body relaxation", "Muscle tension"]
        ),
        "limonene": TerpeneProfile(
            summary: "Citrus. Commonly described as mood-lifting and daytime-friendly.",
            description: "Found in citrus peels. Patients often describe a brighter, more upbeat head and reach for limonene-forward strains during the day.",
            characteristics: ["Citrus", "Bright", "Sweet"],
            benefits: ["Mood", "Daytime focus", "Stress"]
        ),
        "caryophyllene": TerpeneProfile(
            summary: "Peppery. Patients often mention it for stress and body tension.",
            description: "Also found in black pepper and cloves. Patients report it pairs well with stress relief and tight muscles. It binds the CB2 receptor directly, which is unusual for a terpene.",
            characteristics: ["Peppery", "Spicy", "Warm"],
            benefits: ["Stress", "Body tension", "Inflammation"]
        ),
        "pinene": TerpeneProfile(
            summary: "Pine. Associated with a clearer, more alert head.",
            description: "Pine trees and rosemary carry it. Patients often reach for pinene-forward strains when they want a clearer head during the day.",
            characteristics: ["Pine", "Fresh", "Crisp"],
            benefits: ["Alertness", "Daytime focus", "Memory"]
        ),
        "linalool": TerpeneProfile(
            summary: "Floral. Frequently reported as calming.",
            description: "Lavender's main terpene. Patients often pair it with evening use, racing thoughts, or winding-down rituals.",
            characteristics: ["Floral", "Soft", "Sweet"],
            benefits: ["Calm", "Sleep", "Anxiety"]
        ),
        "terpinolene": TerpeneProfile(
            summary: "Herbal-citrus. Often a brighter, more stimulating profile.",
            description: "Less common but distinctive. Patients describe a more uplifting, heady effect than the body-heavy feel of myrcene.",
            characteristics: ["Herbal", "Citrus", "Piney"],
            benefits: ["Uplift", "Creativity", "Energy"]
        ),
        "humulene": TerpeneProfile(
            summary: "Hoppy. Sometimes noted as appetite-dampening.",
            description: "Same family as hops. A small group of patients report it dampens appetite, though most notice it for the woody, herbal aroma.",
            characteristics: ["Hoppy", "Woody", "Earthy"],
            benefits: ["Appetite regulation", "Body relaxation"]
        ),
        "ocimene": TerpeneProfile(
            summary: "Sweet-herbal. Usually described as uplifting.",
            description: "Found in mint, basil, and mango. Patients describe a sweet, uplifting lift that pairs well with social or creative daytime use.",
            characteristics: ["Sweet", "Herbal", "Woody"],
            benefits: ["Uplift", "Mood", "Energy"]
        ),
    ]

    static let allNames: [String] = Array(profiles.keys).sorted()

    static func profile(for name: String) -> TerpeneProfile? {
        profiles[name.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()]
    }

    static func isCurated(_ name: String) -> Bool {
        profile(for: name) != nil
    }

    /// URL-safe slug for the terpene.
    static func slug(for name: String) -> String {
        name
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased()
            .replacingOccurrences(of: "[^a-z0-9]+", with: "-", options: .regularExpression)
            .trimmingCharacters(in: CharacterSet(charactersIn: "-"))
    }
}
