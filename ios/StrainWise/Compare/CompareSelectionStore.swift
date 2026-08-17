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
        clearStaleErrorOnSelectionChange()
        return true
    }

    func remove(_ name: String) {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        names.removeAll { $0.caseInsensitiveCompare(trimmed) == .orderedSame }
        clearStaleErrorOnSelectionChange()
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
        clearStaleErrorOnSelectionChange()
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
        clearStaleErrorOnSelectionChange()
    }

    func clear() {
        names = []
        clearStaleErrorOnSelectionChange()
    }

    /// Whenever the user edits the selection, the previous `compareError`
    /// no longer applies. Clearing it hides the inline banner and stops
    /// the sensoryFeedback trigger from looking stale on the next render.
    private func clearStaleErrorOnSelectionChange() {
        if compareError != nil { compareError = nil }
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

    func applyRestored(_ restored: StrainComparison) {
        comparison = restored
        compareError = nil
        setNames(restored.strains.map(\.name))
    }
}
