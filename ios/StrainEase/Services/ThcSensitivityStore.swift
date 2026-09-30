import FirebaseAuth
import FirebaseFirestore
import Foundation

/// Single-value store for the patient's THC sensitivity — the same
/// `users/{uid}.thcSensitivity` field the web app and the Kaya
/// describeStrainForUser callable already understand. nil means the
/// patient hasn't picked one yet, which the backend maps to the
/// "no sensitivity line" branch of describePrompt.
@Observable
@MainActor
final class ThcSensitivityStore {
    private(set) var value: ThcSensitivity = .typical
    private(set) var isBusy = false
    var errorMessage: String?

    @ObservationIgnored private var listener: ListenerRegistration?
    @ObservationIgnored private let previewOnly: Bool

    init() {
        previewOnly = false
    }

    static func preview(_ value: ThcSensitivity = .typical) -> ThcSensitivityStore {
        ThcSensitivityStore(previewValue: value)
    }

    private init(previewValue: ThcSensitivity) {
        previewOnly = true
        value = previewValue
    }

    func listen(uid: String) {
        guard !previewOnly else { return }
        listener?.remove()
        listener = Firestore.firestore()
            .collection("users")
            .document(uid)
            .addSnapshotListener { [weak self] snap, error in
                Task { @MainActor in
                    guard let self else { return }
                    if let error {
                        self.errorMessage = error.localizedDescription
                        return
                    }
                    self.value = Self.parse(snap?.data()?["thcSensitivity"] as? String)
                }
            }
    }

    func reset() {
        listener?.remove()
        listener = nil
        value = .typical
        errorMessage = nil
        isBusy = false
    }

    /// Save the pick. `.typical` writes a null so the backend treats
    /// it as "no sensitivity line" on the next describe call.
    func save(_ next: ThcSensitivity) async {
        let previous = value
        value = next
        errorMessage = nil
        guard !previewOnly else { return }
        isBusy = true
        defer { isBusy = false }
        do {
            try await Firestore.firestore()
                .collection("users")
                .document(try currentUID())
                .setData(
                    [
                        "thcSensitivity": next == .typical
                            ? NSNull()
                            : next.rawValue,
                        "thcSensitivityUpdatedAt": Int(Date().timeIntervalSince1970 * 1000),
                    ],
                    merge: true
                )
        } catch {
            value = previous
            errorMessage = error.localizedDescription
        }
    }

    private static func parse(_ raw: String?) -> ThcSensitivity {
        guard let raw, !raw.isEmpty else { return .typical }
        return ThcSensitivity(rawValue: raw) ?? .typical
    }

    private func currentUID() throws -> String {
        guard let uid = Auth.auth().currentUser?.uid else {
            throw StrainAPIError.message("Sign in to save THC sensitivity.")
        }
        return uid
    }
}
