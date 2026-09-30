import FirebaseAuth
import FirebaseFirestore
import Foundation

/// Same `users/{uid}/history/{id}` index the web app writes after Find / Compare.
enum HistoryKind: String, Hashable, Sendable {
    case find
    case compare
}

struct HistoryEntry: Identifiable, Hashable, Sendable {
    var id: String
    var kind: HistoryKind
    var title: String
    var createdAt: Int
}

enum RestoredResearch: Hashable, Sendable {
    case find(RecommendationResult, conditions: [String])
    case compare(StrainComparison)
}

@Observable
@MainActor
final class ResearchHistoryStore {
    /// Firestore create rule is title.size() < 200.
    static let titleMax = 199

    private(set) var entries: [HistoryEntry] = []
    var errorMessage: String?

    @ObservationIgnored private var listener: ListenerRegistration?
    @ObservationIgnored private let previewOnly: Bool

    init() {
        previewOnly = false
    }

    static func preview(_ entries: [HistoryEntry] = []) -> ResearchHistoryStore {
        ResearchHistoryStore(previewEntries: entries)
    }

    private init(previewEntries: [HistoryEntry]) {
        previewOnly = true
        entries = entries.sorted { $0.createdAt > $1.createdAt }
    }

    func listen(uid: String) {
        guard !previewOnly else { return }
        listener?.remove()
        listener = Firestore.firestore()
            .collection("users")
            .document(uid)
            .collection("history")
            .addSnapshotListener { [weak self] snap, error in
                Task { @MainActor in
                    guard let self else { return }
                    if let error {
                        self.errorMessage = error.localizedDescription
                        return
                    }
                    self.entries = (snap?.documents ?? []).compactMap { doc in
                        let data = doc.data()
                        guard let kindRaw = data["kind"] as? String,
                              let kind = HistoryKind(rawValue: kindRaw)
                        else { return nil }
                        return HistoryEntry(
                            id: doc.documentID,
                            kind: kind,
                            title: data["title"] as? String ?? doc.documentID,
                            createdAt: data["createdAt"] as? Int ?? 0
                        )
                    }
                    .sorted { $0.createdAt > $1.createdAt }
                }
            }
    }

    func reset() {
        listener?.remove()
        listener = nil
        entries = []
        errorMessage = nil
    }

    func remember(id: String, kind: HistoryKind, title: String) async {
        let entry = HistoryEntry(
            id: id,
            kind: kind,
            title: Self.clipTitle(title),
            createdAt: Int(Date().timeIntervalSince1970 * 1000)
        )
        if previewOnly {
            entries = [entry] + entries.filter { $0.id != id }
            return
        }
        guard let uid = Auth.auth().currentUser?.uid else { return }
        do {
            try await Firestore.firestore()
                .collection("users")
                .document(uid)
                .collection("history")
                .document(id)
                .setData(Self.cloudData(for: entry))
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func remember(find result: RecommendationResult, conditions: [String]) async {
        guard let id = result.resultId, !id.isEmpty else { return }
        await remember(id: id, kind: .find, title: Self.titleForFind(conditions: conditions))
    }

    func remember(compare comparison: StrainComparison, names: [String], conditions: [String]) async {
        guard let id = comparison.resultId, !id.isEmpty else { return }
        await remember(
            id: id,
            kind: .compare,
            title: Self.titleForCompare(names: names, conditions: conditions)
        )
    }

    func loadResearch(id: String) async -> RestoredResearch? {
        if previewOnly {
            return nil
        }
        do {
            let snap = try await Firestore.firestore()
                .collection("researchResults")
                .document(id)
                .getDocument()
            return Self.decodeResearch(snap.data())
        } catch {
            errorMessage = error.localizedDescription
            return nil
        }
    }

    static func clipTitle(_ title: String) -> String {
        String(title.prefix(titleMax))
    }

    static func titleForFind(conditions: [String]) -> String {
        let joined = conditions.joined(separator: ", ")
        return clipTitle("Best strains for \(joined)")
    }

    static func titleForCompare(names: [String], conditions: [String]) -> String {
        var title = names.joined(separator: " vs. ")
        if !conditions.isEmpty {
            title += " · \(conditions.joined(separator: ", "))"
        }
        return clipTitle(title)
    }

    static func cloudData(for entry: HistoryEntry) -> [String: Any] {
        [
            "kind": entry.kind.rawValue,
            "title": clipTitle(entry.title),
            "createdAt": entry.createdAt,
        ]
    }

    static func decodeResearch(_ data: [String: Any]?) -> RestoredResearch? {
        guard let data,
              let kind = data["kind"] as? String,
              let result = data["result"],
              JSONSerialization.isValidJSONObject(result)
        else { return nil }
        do {
            let json = try JSONSerialization.data(withJSONObject: result)
            let decoder = JSONDecoder()
            if kind == HistoryKind.find.rawValue {
                let rec = try decoder.decode(RecommendationResult.self, from: json)
                let args = data["args"] as? [String: Any]
                let conditions = args?["conditions"] as? [String] ?? []
                return .find(rec, conditions: conditions)
            }
            if kind == HistoryKind.compare.rawValue {
                let comparison = try decoder.decode(StrainComparison.self, from: json)
                return .compare(comparison)
            }
            return nil
        } catch {
            return nil
        }
    }
}
