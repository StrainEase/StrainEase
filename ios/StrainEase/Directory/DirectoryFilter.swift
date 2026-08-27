import Foundation

/// Search + type / THC / effect filters for the popular catalog.
/// Mirrors `src/components/directory/StrainDirectory.tsx`.
enum DirectoryFilter {
    enum TypeFilter: String, CaseIterable, Identifiable, Sendable {
        case all
        case sativa
        case hybrid
        case indica

        var id: String { rawValue }

        var label: String {
            switch self {
            case .all: "All types"
            case .sativa: "Sativa"
            case .hybrid: "Hybrid"
            case .indica: "Indica"
            }
        }

        var strainType: StrainType? {
            switch self {
            case .all: nil
            case .sativa: .sativa
            case .hybrid: .hybrid
            case .indica: .indica
            }
        }
    }

    enum ThcBand: String, CaseIterable, Identifiable, Sendable {
        case any
        case mild
        case balanced
        case strong

        var id: String { rawValue }

        var label: String {
            switch self {
            case .any: "Any THC"
            case .mild: "Mild"
            case .balanced: "Balanced"
            case .strong: "Strong"
            }
        }

        var rangeLabel: String {
            switch self {
            case .any: "no preference"
            case .mild: "under ~15%"
            case .balanced: "~15–22%"
            case .strong: "above ~22%"
            }
        }

        func contains(_ midpoint: Double) -> Bool {
            switch self {
            case .any: true
            case .mild: midpoint < 15
            case .balanced: midpoint >= 15 && midpoint < 22
            case .strong: midpoint >= 22
            }
        }
    }

    struct EffectBucket: Hashable, Identifiable, Sendable {
        let id: String
        let label: String
        let keywords: [String]

        static let relaxing = EffectBucket(
            id: "relaxed",
            label: "Relaxing",
            keywords: ["relaxed", "calm", "calming", "soothing"]
        )
        static let sleepy = EffectBucket(
            id: "sleepy",
            label: "Sleepy",
            keywords: ["sleepy", "sedated", "drowsy"]
        )
        static let happy = EffectBucket(
            id: "happy",
            label: "Happy",
            keywords: ["happy", "euphoric", "uplifted", "giggly"]
        )
        static let focused = EffectBucket(
            id: "focused",
            label: "Focused",
            keywords: ["focused", "creative", "aroused"]
        )
        static let energetic = EffectBucket(
            id: "energetic",
            label: "Energetic",
            keywords: ["energetic", "tingly", "talkative"]
        )
        static let hungry = EffectBucket(
            id: "hungry",
            label: "Hungry",
            keywords: ["hungry", "appetite"]
        )

        static let all: [EffectBucket] = [
            .relaxing, .sleepy, .happy, .focused, .energetic, .hungry,
        ]

        static func named(_ id: String) -> EffectBucket? {
            all.first { $0.id == id }
        }
    }

    /// Parse Leafly-style range strings (`"17-24%"`, `"~20%"`, `"<1%"`)
    /// to a numeric midpoint. En-dashes from the local catalog are
    /// treated as hyphens so `"17–24%"` matches the web hyphen form.
    static func thcMidpoint(_ range: String?) -> Double? {
        guard let range, !range.isEmpty else { return nil }
        let normalized = range
            .replacingOccurrences(of: "–", with: "-")
            .replacingOccurrences(of: "—", with: "-")
        let stripped = normalized.replacingOccurrences(
            of: #"[%~\s<>]"#,
            with: "",
            options: .regularExpression
        ).trimmingCharacters(in: .whitespacesAndNewlines)
        guard !stripped.isEmpty else { return nil }

        if normalized.contains("<") {
            let digits = stripped.replacingOccurrences(
                of: #"[^0-9.]"#,
                with: "",
                options: .regularExpression
            )
            guard let n = Double(digits) else { return nil }
            return max(0, n - 0.5)
        }

        let parts = stripped.split(separator: "-", omittingEmptySubsequences: false)
        if parts.count == 2, let a = Double(parts[0]), let b = Double(parts[1]) {
            return (a + b) / 2
        }
        return Double(stripped)
    }

    static func matches(_ profile: StrainProfile, bucket: EffectBucket) -> Bool {
        let names = Set((profile.effects ?? []).map { $0.name.lowercased() })
        return bucket.keywords.contains { names.contains($0) }
    }

    static func matches(
        _ profile: StrainProfile,
        query: String = "",
        type: TypeFilter = .all,
        thc: ThcBand = .any,
        effectIDs: [String] = [],
        ailments: [String] = []
    ) -> Bool {
        if let wanted = type.strainType, profile.type != wanted {
            return false
        }
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if !q.isEmpty, !profile.name.lowercased().contains(q) {
            return false
        }
        if thc != .any {
            guard let mid = thcMidpoint(profile.thcRange), thc.contains(mid) else {
                return false
            }
        }
        let buckets = effectIDs.compactMap(EffectBucket.named)
        if !buckets.isEmpty, !buckets.allSatisfy({ matches(profile, bucket: $0) }) {
            return false
        }
        if !ailments.isEmpty,
           !ailments.allSatisfy({ matchesCondition(ailment: $0, uses: profile.medicalUses ?? []) }) {
            return false
        }
        return true
    }

    static func apply(
        to profiles: [StrainProfile],
        query: String,
        type: TypeFilter,
        thc: ThcBand,
        effectIDs: [String],
        ailments: [String] = []
    ) -> [StrainProfile] {
        profiles.filter {
            matches(
                $0,
                query: query,
                type: type,
                thc: thc,
                effectIDs: effectIDs,
                ailments: ailments
            )
        }
    }

    /// True when at least one of the strain's reported uses matches the
    /// curated ailment (case-insensitive, alias-aware). Mirrors
    /// `src/lib/strain-ui.ts#matchesCondition` so web + iOS read the
    /// same set of conditions.
    static func matchesCondition(ailment: String, uses: [String]) -> Bool {
        guard !ailment.isEmpty, !uses.isEmpty else { return false }
        let keys = Conditions.matchKeys(for: ailment).map { $0.lowercased() }
        return uses.contains { use in
            keys.contains(use.lowercased())
        }
    }
}
