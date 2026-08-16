import Foundation
import Observation

@Observable
@MainActor
final class CompareSelectionStore {
    let cap = 3

    private(set) var names: [String] = []
    var comparison: StrainComparison?
    var isComparing = false
    var compareError: String?

    var count: Int { names.count }
    var atCap: Bool { count >= cap }
    var canRunCompare: Bool { count >= 2 }

    @discardableResult
    func add(_ name: String) -> Bool {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, !atCap, !isIn(trimmed) else { return false }
        names.append(trimmed)
        return true
    }

    func remove(_ name: String) {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        names.removeAll { $0.caseInsensitiveCompare(trimmed) == .orderedSame }
    }

    @discardableResult
    func toggle(_ name: String) -> Bool {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return false }
        if isIn(trimmed) {
            remove(trimmed)
        } else if !atCap {
            add(trimmed)
        }
        return isIn(trimmed)
    }

    func setNames(_ newNames: [String]) {
        names = []
        for name in newNames {
            guard count < cap else { break }
            let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmed.isEmpty, !isIn(trimmed) else { continue }
            names.append(trimmed)
        }
    }

    func clear() {
        names = []
    }

    func isIn(_ name: String) -> Bool {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return false }
        return names.contains { $0.caseInsensitiveCompare(trimmed) == .orderedSame }
    }

    func runCompare(
        api: any StrainServicing,
        conditions: [String],
        prefs: ResearchPrefs,
        reliefSummary: String?
    ) async {
        isComparing = true
        compareError = nil
        comparison = nil
        defer { isComparing = false }

        do {
            comparison = try await api.compare(
                strainNames: names,
                conditions: conditions,
                prefs: prefs,
                reliefSummary: reliefSummary
            )
        } catch {
            compareError = error.localizedDescription
        }
    }
}
