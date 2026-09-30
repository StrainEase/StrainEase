import Foundation

/// Strain-detail blocks that come from the Leafly / Weedmaps / research
/// lookup (`searchStrain`). User notes and relief logs are not included.
enum StrainHydrationSection: String, CaseIterable, Sendable {
    case description
    case lineage
    case dayNight
    case uses
    case effects
    case terpenes
    case sideEffects
    case community

    var title: String {
        switch self {
        case .description: "Overview"
        case .lineage: "Lineage"
        case .dayNight: "Day to night"
        case .uses: "Commonly used for"
        case .effects: "Effects"
        case .terpenes: "Terpenes"
        case .sideEffects: "Watch for"
        case .community: "Community voices"
        }
    }

    var caption: String {
        switch self {
        case .description: "Researching this strain…"
        case .lineage: "Looking up parent strains…"
        case .dayNight: "Scoring day vs night from reported effects…"
        case .uses: "Collecting commonly reported uses…"
        case .effects: "Pulling reported effects…"
        case .terpenes: "Reading the terpene profile…"
        case .sideEffects: "Checking commonly reported side effects…"
        case .community: "Pulling Leafly reviews and Reddit comments…"
        }
    }

    var placeholderLines: Int {
        switch self {
        case .description: 3
        case .lineage: 1
        case .dayNight: 2
        case .uses: 2
        case .effects: 4
        case .terpenes: 2
        case .sideEffects: 2
        case .community: 3
        }
    }
}

extension StrainProfile {
    /// Sections that still need the live lookup before they have content.
    var pendingHydrationSections: Set<StrainHydrationSection> {
        var pending: Set<StrainHydrationSection> = []
        if description?.isEmpty ?? true { pending.insert(.description) }
        if lineage?.isEmpty ?? true { pending.insert(.lineage) }
        if medicalUses?.isEmpty ?? true { pending.insert(.uses) }
        if effects?.isEmpty ?? true {
            pending.insert(.effects)
            pending.insert(.dayNight)
        }
        if terpenes?.isEmpty ?? true { pending.insert(.terpenes) }
        if sideEffects?.isEmpty ?? true { pending.insert(.sideEffects) }
        if quoteNotes.isEmpty && resolvedCommunityRatings.isEmpty {
            pending.insert(.community)
        }
        return pending
    }
}
