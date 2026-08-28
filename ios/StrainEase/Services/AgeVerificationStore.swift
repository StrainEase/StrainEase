import Foundation
import SwiftUI

/// Region codes supported by StrainEase. Mirrors `src/lib/age-policy.ts`.
enum AgeRegion: String, CaseIterable, Codable, Sendable, Identifiable {
    case us = "US"
    case canada = "CA"
    case alberta = "CA-AB"
    case eu = "EU"
    case uk = "UK"
    case australia = "AU"
    case other = "OTHER"

    var id: String { rawValue }

    var label: String {
        switch self {
        case .us: "United States"
        case .canada: "Canada (except Alberta)"
        case .alberta: "Canada (Alberta)"
        case .eu: "European Union"
        case .uk: "United Kingdom"
        case .australia: "Australia"
        case .other: "Other / not listed"
        }
    }

    var minimumAge: Int {
        switch self {
        case .us: 21
        case .canada: 19
        case .alberta: 18
        case .eu: 18
        case .uk: 18
        case .australia: 18
        case .other: 21
        }
    }

    var legalNote: String {
        switch self {
        case .us:
            "Cannabis laws vary by state. StrainEase provides research information only."
        case .canada:
            "Provincial minimum age is 19 in most provinces and territories."
        case .alberta:
            "Alberta's minimum age is 18."
        case .eu:
            "Most EU member states set 18 as the minimum age for medical or adult-use cannabis."
        case .uk:
            "Cannabis is currently prescription-only in the UK. StrainEase is research, not a prescription."
        case .australia:
            "Cannabis is prescription-only nationally except the ACT, where adults 18+ may possess small amounts."
        case .other:
            "When no specific rule applies we default to 21+, the strictest common standard."
        }
    }
}

struct AgeVerificationRecord: Codable, Equatable, Sendable {
    var region: AgeRegion
    var birthDate: String // ISO 8601 yyyy-MM-dd
    var attestedAt: Date
    var expiresAt: Date
    var termsAcceptedAt: Date
    var privacyAcceptedAt: Date
}

/// Mirrors `useAgeVerification` on the web. Persists to UserDefaults with a
/// 30-day TTL. Local gate is the source of truth; no server-side custom claim
/// enforcement.
@Observable
@MainActor
final class AgeVerificationStore {
    private(set) var record: AgeVerificationRecord?

    @ObservationIgnored private let defaults: UserDefaults
    @ObservationIgnored private let key = "strainease.ageVerification.v1"
    @ObservationIgnored private let ttl: TimeInterval = 30 * 24 * 60 * 60

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        load()
    }

    static func preview(_ record: AgeVerificationRecord? = nil) -> AgeVerificationStore {
        AgeVerificationStore(previewOnly: record)
    }

    private init(previewOnly record: AgeVerificationRecord?) {
        defaults = .standard
        self.record = record
    }

    var isVerified: Bool {
        guard let record else { return false }
        return record.expiresAt > Date()
    }

    var region: AgeRegion? {
        isVerified ? record?.region : nil
    }

    var minimumAge: Int { region?.minimumAge ?? 21 }

    func verify(region: AgeRegion, birthDate: Date) -> Result<AgeVerificationRecord, AgeFailure> {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withFullDate]
        let iso = formatter.string(from: birthDate)

        let calendar = Calendar(identifier: .gregorian)
        let now = Date()
        let ageComponents = calendar.dateComponents([.year], from: birthDate, to: now)
        guard let age = ageComponents.year else {
            return .failure(.invalid)
            }

        if birthDate > now {
            return .failure(.future)
            }
        if age < region.minimumAge {
            return .failure(.underage)
            }
        if age > 120 {
            return .failure(.invalid)
            }

        let attested = AgeVerificationRecord(
            region: region,
            birthDate: iso,
            attestedAt: now,
            expiresAt: now.addingTimeInterval(ttl),
            termsAcceptedAt: now,
            privacyAcceptedAt: now,
        )
        persist(attested)
        return .success(attested)
    }

    func reset() {
        record = nil
        defaults.removeObject(forKey: key)
    }

    func refresh() {
        load()
    }

    private func load() {
        guard let data = defaults.data(forKey: key),
              let decoded = try? JSONDecoder().decode(AgeVerificationRecord.self, from: data)
        else { return }
        record = decoded
    }

    private func persist(_ record: AgeVerificationRecord) {
        self.record = record
        guard let data = try? JSONEncoder().encode(record) else { return }
        defaults.set(data, forKey: key)
    }
}

enum AgeFailure: Error, Equatable {
    case missingBirthDate
    case invalid
    case future
    case underage
}