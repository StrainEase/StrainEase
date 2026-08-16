import Foundation

@Observable
@MainActor
final class DirectoryModel {
    var strains: [StrainProfile] = []
    var isLoading = false
    var errorMessage: String?
    var query = ""
    var typeFilter: DirectoryFilter.TypeFilter = .all
    var thcBand: DirectoryFilter.ThcBand = .any
    var effectIDs: [String] = []
    var ailmentFilter: [String] = []

    @ObservationIgnored private let api: any StrainServicing

    init(api: any StrainServicing = LiveStrainAPI()) {
        self.api = api
    }

    var filtersActive: Bool {
        typeFilter != .all
            || thcBand != .any
            || !effectIDs.isEmpty
            || !ailmentFilter.isEmpty
            || !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var filtered: [StrainProfile] {
        DirectoryFilter.apply(
            to: strains,
            query: query,
            type: typeFilter,
            thc: thcBand,
            effectIDs: effectIDs,
            ailments: ailmentFilter,
        )
    }

    func toggleEffect(_ id: String) {
        if let index = effectIDs.firstIndex(of: id) {
            effectIDs.remove(at: index)
        } else {
            effectIDs.append(id)
        }
    }

    func toggleAilment(_ name: String) {
        if let index = ailmentFilter.firstIndex(of: name) {
            ailmentFilter.remove(at: index)
        } else {
            ailmentFilter.append(name)
        }
    }

    func resetFilters() {
        query = ""
        typeFilter = .all
        thcBand = .any
        effectIDs = []
        ailmentFilter = []
    }

    func load() async {
        isLoading = strains.isEmpty
        errorMessage = nil
        do {
            let live = StrainCatalog.unique(try await api.popular())
            strains = StrainCatalog.merge(live)
        } catch {
            errorMessage = error.localizedDescription
            if strains.isEmpty {
                strains = StrainCatalog.merge([])
            }
        }
        isLoading = false
    }
}
