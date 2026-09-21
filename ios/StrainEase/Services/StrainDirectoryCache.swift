import FirebaseFirestore
import Foundation

/// Per-type strain directory cache. Reads three Firestore documents
/// (`strainDirectory/byType/{indica,sativa,hybrid}/current`) written by
/// the daily `warmStrainDirectory` Cloud Function and makes them
/// available to `StrainCatalog.merge(_:preferringType:)`. Mirrors the
/// web client (`src/lib/strain-cache.ts`); the bundled `strain-directory.json`
/// stays as the cold-start fallback when Firestore is offline or the doc
/// is missing.
enum StrainDirectoryCache {
    /// In-memory per-type profiles. Empty until `warm()` resolves (or fails).
    private static var byType: [StrainType: [StrainProfile]] = [:]
    private static var isLoaded: Bool = false
    private static var inflight: Task<Void, Never>?

    /// Kick off the per-type fetch. Idempotent — repeated calls reuse the
    /// in-flight Task. Called from `StrainEaseApp.init` so the cache is
    /// usually loaded by the time `StrainCatalog.merge` runs.
    @MainActor
    static func warm() {
        if isLoaded { return }
        if inflight != nil { return }
        inflight = Task {
            await loadAllTypes()
        }
    }

    /// Force-reload (e.g. pull-to-refresh on Discover). Cancels any
    /// in-flight fetch before starting a new one.
    @MainActor
    static func reload() async {
        inflight?.cancel()
        inflight = nil
        isLoaded = false
        byType = [:]
        await loadAllTypes()
    }

    /// Per-type snapshot loaded from Firestore, or nil if the cache is
    /// still loading / failed. Callers should fall back to the bundled
    /// directory when nil.
    static func profiles(for type: StrainType) -> [StrainProfile]? {
        guard isLoaded else { return nil }
        return byType[type] ?? []
    }

    /// True once the per-type cache has resolved at least one document.
    /// Useful for tests and for the Discover view that wants to wait
    /// for the rich snapshot before rendering the empty-state.
    static var loaded: Bool { isLoaded }

    private static func loadAllTypes() async {
        let types: [StrainType] = [.indica, .sativa, .hybrid]
        let fetched: [(StrainType, [StrainProfile])] = await withTaskGroup(
            of: (StrainType, [StrainProfile]).self
        ) { group in
            for type in types {
                group.addTask {
                    let profiles = (try? await fetch(type: type)) ?? []
                    return (type, profiles)
                }
            }
            var collected: [(StrainType, [StrainProfile])] = []
            for await pair in group {
                collected.append(pair)
            }
            return collected
        }
        for (type, profiles) in fetched {
            byType[type] = profiles
        }
        // Loaded means we hit Firestore (even if every doc was missing).
        // Callers fall back to bundled JSON per-type on empty buckets.
        isLoaded = true
    }

    private static func fetch(type: StrainType) async throws -> [StrainProfile] {
        let snap = try await Firestore.firestore()
            .collection("strainDirectory")
            .document("byType")
            .collection(type.rawValue)
            .document("current")
            .getDocument()
        guard snap.exists, let data = snap.data() else { return [] }
        guard
            let previews = data["previews"] as? [[String: Any]],
            let fetchedAt = data["fetchedAt"] as? Int
        else { return [] }
        // 24h freshness rule matches the web client. Stale docs fall
        // back to the bundled JSON on the merge side.
        let ageMs = Int(Date().timeIntervalSince1970 * 1000) - fetchedAt
        if ageMs > 24 * 60 * 60 * 1000 { return [] }
        return previews.compactMap { row in
            guard
                let name = row["name"] as? String,
                !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            else { return nil }
            let rawType = row["type"] as? String ?? ""
            let resolved: StrainType?
            switch rawType {
            case "indica": resolved = .indica
            case "sativa": resolved = .sativa
            case "hybrid": resolved = .hybrid
            default: resolved = nil
            }
            guard let resolved else { return nil }
            return StrainProfile(
                name: name,
                inKnowledgeBase: true,
                type: resolved,
                thcRange: row["thcRange"] as? String,
                medicalUses: row["medicalUses"] as? [String],
                imageUrl: row["imageUrl"] as? String,
                leaflyRating: row["leaflyRating"] as? Double,
                weedmapsRating: row["weedmapsRating"] as? Double
            )
        }
    }
}
