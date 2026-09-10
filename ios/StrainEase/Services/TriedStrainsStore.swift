import Foundation
import FirebaseFirestore

struct TriedStrainItem: Identifiable, Hashable, Codable, Sendable {
    var id: String
    var name: String
    var type: String
    var thc: String
    var addedAt: Int
}

@Observable
@MainActor
final class TriedStrainsStore {
    private(set) var strains: [TriedStrainItem] = []
    private(set) var medications: [String] = []

    private var userId: String?
    private let db = Firestore.firestore()

    func setUser(_ userId: String?) {
        self.userId = userId
        if userId != nil {
            Task { await load() }
        } else {
            strains = []
            medications = []
        }
    }

    func load() async {
        guard let userId = userId else { return }

        do {
            let doc = try await db.collection("users").document(userId).getDocument()
            if let data = doc.data() {
                if let strainsData = data["triedStrains"] as? [[String: Any]] {
                    strains = strainsData.compactMap { dict in
                        guard let id = dict["id"] as? String,
                              let name = dict["name"] as? String else { return nil }
                        return TriedStrainItem(
                            id: id,
                            name: name,
                            type: dict["type"] as? String ?? "",
                            thc: dict["thc"] as? String ?? "",
                            addedAt: dict["addedAt"] as? Int ?? 0
                        )
                    }
                }
                if let medsData = data["medications"] as? [String] {
                    medications = medsData
                }
            }
        } catch {
            print("Error loading tried strains: \(error)")
        }
    }

    func addStrain(_ strain: TriedStrainItem) async {
        guard let userId = userId else { return }

        if strains.contains(where: { $0.id == strain.id }) { return }

        strains.append(strain)
        await save()
    }

    func removeStrain(_ item: TriedStrainItem) async {
        strains.removeAll { $0.id == item.id }
        await save()
    }

    func addMedication(_ medication: String) async {
        let trimmed = medication.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, !medications.contains(trimmed) else { return }

        medications.append(trimmed)
        await save()
    }

    func removeMedication(_ medication: String) async {
        medications.removeAll { $0 == medication }
        await save()
    }

    private func save() async {
        guard let userId = userId else { return }

        let strainsData = strains.map { strain in
            [
                "id": strain.id,
                "name": strain.name,
                "type": strain.type,
                "thc": strain.thc,
                "addedAt": strain.addedAt
            ] as [String: Any]
        }

        do {
            try await db.collection("users").document(userId).setData([
                "triedStrains": strainsData,
                "medications": medications
            ], merge: true)
        } catch {
            print("Error saving tried strains: \(error)")
        }
    }
}
