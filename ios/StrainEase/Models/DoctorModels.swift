import Foundation

/// A medical-marijuana doctor clinic scraped from Leafly's public doctors
/// directory (see functions/src/doctors.ts on the backend).
struct Doctor: Codable, Hashable, Identifiable, Sendable {
    var id: String
    var name: String
    var slug: String
    var url: String
    var street: String
    var city: String
    var state: String
    var zip: String
    var lat: Double?
    var lon: Double?
    /// Distance from the caller's coordinates in miles. Nil when no
    /// coordinates were provided.
    var distanceMi: Double?
    var rating: Double?
    var reviewCount: Int?
    var reviewSnippet: String?
    var logoUrl: String?
    var timezone: String?
}

struct DoctorResolvedLocation: Codable, Hashable, Sendable {
    var city: String
    var state: String
    var lat: Double
    var lon: Double
}

struct DoctorQuery: Codable, Hashable, Sendable {
    var lat: Double?
    var lon: Double?
    var city: String?
    var state: String?
    var zip: String?
    var radiusMiles: Double?

    var isEmpty: Bool {
        lat == nil
            && lon == nil
            && (city?.isEmpty ?? true)
            && (state?.isEmpty ?? true)
            && (zip?.isEmpty ?? true)
    }
}

struct DoctorResult: Codable, Hashable, Sendable {
    var doctors: [Doctor]
    var resolvedLocation: DoctorResolvedLocation?
    var source: String
}

extension Doctor {
    var addressLine: String {
        [street, city, state, zip]
            .filter { !$0.isEmpty }
            .joined(separator: ", ")
    }

    /// Apple Maps URL that opens a pin at the clinic's coordinates
    /// (falls back to a name + address search when lat/lon is missing).
    var mapsURL: URL? {
        var components = URLComponents(string: "https://maps.apple.com/")
        if let lat, let lon {
            components?.queryItems = [
                URLQueryItem(name: "ll", value: "\(lat),\(lon)"),
                URLQueryItem(name: "q", value: name),
            ]
        } else {
            let q = [name, street, city, state, zip]
                .filter { !$0.isEmpty }
                .joined(separator: ", ")
            components?.queryItems = [
                URLQueryItem(name: "q", value: q),
            ]
        }
        return components?.url
    }

    static let sample = Doctor(
        id: "305123",
        name: "Doc Morrison",
        slug: "doc-morrison",
        url: "https://www.leafly.com/doctors/doc-morrison",
        street: "2909 Sheridan Blvd",
        city: "Wheat Ridge",
        state: "CO",
        zip: "80214",
        lat: 39.7589363,
        lon: -105.0535268,
        distanceMi: 4.2,
        rating: 4.7,
        reviewCount: 12,
        reviewSnippet: "Friendly staff, easy visit.",
        logoUrl: nil,
        timezone: "America/Denver"
    )
}
