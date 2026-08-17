import Foundation

enum HomeSection: Hashable, Identifiable {
    case recents
    case sativa
    case hybrid
    case indica
    case ailment(String)
    case popular
    case forYou

    var id: String {
        switch self {
        case .recents: "recents"
        case .sativa: "sativa"
        case .hybrid: "hybrid"
        case .indica: "indica"
        case .ailment(let name): "ailment-\(name)"
        case .popular: "popular"
        case .forYou: "for-you"
        }
    }

    var title: String {
        switch self {
        case .recents: "Recently viewed"
        case .sativa: "Sativa"
        case .hybrid: "Hybrid"
        case .indica: "Indica"
        case .ailment(let name): name
        case .popular: "Popular strains"
        case .forYou: "Top picks for your symptoms"
        }
    }
}

@Observable
@MainActor
final class HomeModel {
    var popular: [StrainProfile] = []
    var isLoading = false
    var errorMessage: String?

    /// The signed-in user's saved ailments. When non-empty, the home
    /// page is tailored: a "Top picks for your symptoms" rail appears
    /// at the top and the ailment carousel drops the static catalog
    /// in favor of the user's actual list. Empty for signed-out users
    /// and when nothing has been saved yet.
    var savedAilments: [String] = []

    let previewLimit = 6

    @ObservationIgnored private let api: any StrainServicing

    init(api: any StrainServicing = LiveStrainAPI()) {
        self.api = api
    }

    func load() async {
        isLoading = popular.isEmpty
        errorMessage = nil
        do {
            popular = StrainCatalog.applyingCatalogPhotos(
                StrainCatalog.unique(try await api.popular())
            )
        } catch {
            errorMessage = error.localizedDescription
            if popular.isEmpty { popular = [] }
        }
        isLoading = false
    }

    func updateSavedAilments(_ next: [String]) {
        guard next != savedAilments else { return }
        savedAilments = next
    }

    /// Ailments shown by the carousel: user's saved list when present,
    /// otherwise the static catalog. Recomputed so the carousel
    /// updates instantly when savedAilments changes.
    var ailmentsForCarousel: [String] {
        savedAilments.isEmpty ? Conditions.catalog : savedAilments
    }

    var hasSavedAilments: Bool { !savedAilments.isEmpty }

    func strains(for section: HomeSection) -> [StrainProfile] {
        switch section {
        case .recents:
            []
        case .sativa:
            StrainCatalog.merge(popular, preferringType: .sativa)
        case .hybrid:
            StrainCatalog.merge(popular, preferringType: .hybrid)
        case .indica:
            StrainCatalog.merge(popular, preferringType: .indica)
        case .ailment(let name):
            StrainCatalog.matching(ailment: name, live: popular)
        case .popular:
            StrainCatalog.merge(popular)
        case .forYou:
            StrainCatalog.matching(ailments: savedAilments, live: popular, limit: previewLimit)
        }
    }

    func preview(_ section: HomeSection) -> [StrainProfile] {
        Array(strains(for: section).prefix(previewLimit))
    }
}

enum BrowseDestination: Hashable {
    case profile(StrainProfile)
    case grid(HomeSection, [StrainProfile])
}
