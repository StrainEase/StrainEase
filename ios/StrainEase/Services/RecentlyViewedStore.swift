import Foundation

@Observable
@MainActor
final class RecentlyViewedStore {
    private(set) var items: [StrainProfile] = []

    @ObservationIgnored private let previewOnly: Bool
    @ObservationIgnored private let defaults: UserDefaults
    @ObservationIgnored private let key = "recentlyViewedStrains.v1"
    private let limit = 24

    init(defaults: UserDefaults = .standard) {
        previewOnly = false
        self.defaults = defaults
        load()
    }

    static func preview(_ items: [StrainProfile] = []) -> RecentlyViewedStore {
        RecentlyViewedStore(previewItems: items)
    }

    private init(previewItems: [StrainProfile]) {
        previewOnly = true
        defaults = .standard
        items = previewItems
    }

    func record(_ profile: StrainProfile) {
        var next = items.filter { $0.slug != profile.slug }
        next.insert(profile, at: 0)
        if next.count > limit { next = Array(next.prefix(limit)) }
        items = next
        persist()
    }

    private func load() {
        guard !previewOnly,
              let data = defaults.data(forKey: key),
              let decoded = try? JSONDecoder().decode([StrainProfile].self, from: data)
        else { return }
        items = decoded
    }

    private func persist() {
        guard !previewOnly, let data = try? JSONEncoder().encode(items) else { return }
        defaults.set(data, forKey: key)
    }
}
