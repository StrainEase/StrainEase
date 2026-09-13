import Foundation

@Observable
@MainActor
final class FindModel {
    var strains: [StrainProfile] = []
    var isLoading = false
    var errorMessage: String?
<<<<<<< HEAD
    var query = ""
    var typeFilter: FindFilter.TypeFilter = .all
    var thcBand: FindFilter.ThcBand = .any
    var effectIDs: [String] = []
    var ailmentFilter: [String] = []
=======
>>>>>>> cad93b0 (feat(ios): swap Find/Browse tab labels+icons, drop 'Look up a strain')

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

<<<<<<< HEAD
    var filtered: [StrainProfile] {
        FindFilter.apply(
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
=======
    func toggleAilment(_ name: String) {
        if let index = ailments.firstIndex(where: { $0.caseInsensitiveCompare(name) == .orderedSame }) {
            ailments.remove(at: index)
        } else {
            ailments.append(name)
        }
    }

    func isSelected(_ name: String) -> Bool {
        ailments.contains { $0.caseInsensitiveCompare(name) == .orderedSame }
    }

    func addCustomAilment() {
        let trimmed = customAilment.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        if !isSelected(trimmed) { ailments.append(trimmed) }
        customAilment = ""
    }

    func applyAilments(_ names: [String], replace: Bool = false) {
        if replace { ailments = [] }
        for raw in names {
            let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmed.isEmpty, !isSelected(trimmed) else { continue }
            ailments.append(trimmed)
        }
    }

    func applyRestored(result: RecommendationResult, conditions: [String]) {
        self.result = result
        errorMessage = nil
        searched = conditions
        applyAilments(conditions, replace: true)
    }

    func find(reliefSummary: String? = nil) async {
        guard canFind else { return }
        isRunning = true
        errorMessage = nil
        searched = ailments
        startSteps()
        defer {
            isRunning = false
            stopSteps()
        }
        do {
            result = try await api.recommend(
                conditions: ailments,
                potency: potency,
                prefs: prefs,
                reliefSummary: reliefSummary,
                language: StrainAILanguage.preferred
            )
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Compare selection (delegates to CompareSelectionStore)

    @discardableResult
    func addToCompare(_ name: String) -> Bool {
        compareStore?.add(name) ?? false
    }

    func removeFromCompare(_ name: String) {
        compareStore?.remove(name)
    }

    @discardableResult
    func toggleCompare(_ name: String) -> Bool {
        compareStore?.toggle(name) ?? false
    }

    func isInCompare(_ name: String) -> Bool {
        compareStore?.isIn(name) ?? false
    }

    var compareAtCap: Bool { compareStore?.atCap ?? false }

    func compareSelected(reliefSummary: String? = nil) async {
        guard let compareStore, canCompare else { return }
        await compareStore.runCompare(
            api: api,
            conditions: ailments,
            prefs: prefs,
            reliefSummary: reliefSummary
        )
    }

    func reset() {
        result = nil
        errorMessage = nil
        ailments = []
        searched = []
        potency = .any
        prefs = ResearchPrefs()
        // Compare-side cleanup. We don't touch `isComparing` or
        // `compareError` mid-run — those clear themselves when
        // `runCompare` finishes.
        compareStore?.clear()
        compareStore?.comparison = nil
    }

    private func startSteps() {
        step = .leafly
        stepTask?.cancel()
        stepTask = Task { [weak self] in
            let order = ResearchStep.allCases
            for (index, next) in order.enumerated() {
                guard !Task.isCancelled else { return }
                await MainActor.run { self?.step = next }
                if index < order.count - 1 {
                    try? await Task.sleep(for: .milliseconds(1600))
                }
            }
>>>>>>> cad93b0 (feat(ios): swap Find/Browse tab labels+icons, drop 'Look up a strain')
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
