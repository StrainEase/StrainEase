import FirebaseAuth
import FirebaseFirestore
import Foundation

/// Tried strains list per user — stored as `users/{uid}/triedStrains/{id}`
/// docs with name, type, thc, and addedAt. Mirrors the web `useTriedStrains` hook.
@Observable
@MainActor
final class TriedStrainsStore {
    private(set) var items: [TriedStrainItem] = []
    private(set) var isBusy = false
    var errorMessage: String?

    @ObservationIgnored private var listener: ListenerRegistration?
    @ObservationIgnored private let previewOnly: Bool

    init() {
        previewOnly = false
    }

    static func preview(_ names: [String] = []) -> TriedStrainsStore {
        let now = Int(Date().timeIntervalSince1970 * 1000)
        let items = names.enumerated().map { index, name in
            TriedStrainItem(
                id: "preview-\(index)",
                name: name,
                type: "hybrid",
                thc: "",
                addedAt: now - index
            )
        }
        return TriedStrainsStore(previewItems: items)
    }

    private init(previewItems: [TriedStrainItem]) {
        previewOnly = true
        items = previewItems
    }

    /// Names only, in display order.
    var names: [String] { items.map(\.name) }

    func listen(uid: String) {
        guard !previewOnly else { return }
        listener?.remove()
        listener = Firestore.firestore()
            .collection("users")
            .document(uid)
            .collection("triedStrains")
            .addSnapshotListener { [weak self] snap, error in
                Task { @MainActor in
                    guard let self else { return }
                    if let error {
                        self.errorMessage = error.localizedDescription
                        return
                    }
                    self.items = (snap?.documents ?? []).map { doc in
                        let data = doc.data()
                        return TriedStrainItem(
                            id: doc.documentID,
                            name: data["name"] as? String ?? doc.documentID,
                            type: data["type"] as? String ?? "hybrid",
                            thc: data["thc"] as? String ?? "",
                            addedAt: data["addedAt"] as? Int ?? 0
                        )
                    }
                    .sorted { $0.addedAt > $1.addedAt }
                }
            }
    }

    func reset() {
        listener?.remove()
        listener = nil
        items = []
        errorMessage = nil
        isBusy = false
    }

    func add(_ strain: TriedStrainItem) async {
        let trimmed = strain.name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, !isBusy else { return }
        if items.contains(where: { $0.name.caseInsensitiveCompare(trimmed) == .orderedSame }) {
            return
        }
        let addedAt = Int(Date().timeIntervalSince1970 * 1000)
        let tempId = "tmp-\(addedAt)"
        var newItem = strain
        newItem.id = tempId
        newItem.name = trimmed
        newItem.addedAt = addedAt
        items.insert(newItem, at: 0)
        errorMessage = nil
        guard !previewOnly else { return }
        isBusy = true
        defer { isBusy = false }
        do {
            try await Firestore.firestore()
                .collection("users")
                .document(try currentUID())
                .collection("triedStrains")
                .addDocument(data: [
                    "name": trimmed,
                    "type": strain.type,
                    "thc": strain.thc,
                    "addedAt": addedAt
                ])
        } catch {
            items.removeAll { $0.id == tempId }
            errorMessage = error.localizedDescription
        }
    }

    func remove(_ item: TriedStrainItem) async {
        guard !items.isEmpty else { return }
        let previous = items
        items.removeAll { $0.id == item.id }
        errorMessage = nil
        guard !previewOnly else { return }
        guard !item.id.hasPrefix("tmp-") else { return }
        isBusy = true
        defer { isBusy = false }
        do {
            try await Firestore.firestore()
                .collection("users")
                .document(try currentUID())
                .collection("triedStrains")
                .document(item.id)
                .delete()
        } catch {
            items = previous
            errorMessage = error.localizedDescription
        }
    }

    private func currentUID() throws -> String {
        guard let uid = Auth.auth().currentUser?.uid else {
            throw StrainAPIError.message("Sign in to save tried strains.")
        }
        return uid
    }
}

struct TriedStrainItem: Identifiable, Hashable, Sendable {
    var id: String
    var name: String
    var type: String
    var thc: String
    var addedAt: Int
}
