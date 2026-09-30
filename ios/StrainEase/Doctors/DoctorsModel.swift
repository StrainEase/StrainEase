import CoreLocation
import Foundation

@Observable
@MainActor
final class DoctorsModel {
    enum Status: Equatable {
        case idle
        case locating
        case searching
        case ready
        case error
    }

    var status: Status = .idle
    var errorMessage: String?
    var result: DoctorResult?
    var radiusMiles: Double = 25
    var city: String = ""
    var state: String = ""
    var lastResolvedLocation: DoctorResolvedLocation?

    @ObservationIgnored private let api: any StrainServicing
    @ObservationIgnored private let location: LocationProvider

    init(
        api: any StrainServicing = LiveStrainAPI(),
        location: LocationProvider? = nil,
    ) {
        self.api = api
        self.location = location ?? LocationProvider()
    }

    func useMyLocation() async {
        status = .locating
        errorMessage = nil
        do {
            let coords = try await location.requestLocation()
            await runSearch(query: DoctorQuery(
                lat: coords.coordinate.latitude,
                lon: coords.coordinate.longitude,
                radiusMiles: radiusMiles,
            ))
        } catch let error as LocationProvider.LocationError {
            status = .idle
            errorMessage = error.errorDescription
        } catch {
            status = .idle
            errorMessage = error.localizedDescription
        }
    }

    func searchByCity() async {
        let city = city.trimmingCharacters(in: .whitespacesAndNewlines)
        let state = state.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !city.isEmpty, !state.isEmpty else {
            errorMessage = "Enter a city and state."
            return
        }
        await runSearch(query: DoctorQuery(
            city: city,
            state: state,
            radiusMiles: radiusMiles,
        ))
    }

    func runSearch(query: DoctorQuery) async {
        status = .searching
        errorMessage = nil
        do {
            let found = try await api.findDoctors(query: query)
            result = found
            if let resolved = found.resolvedLocation {
                lastResolvedLocation = resolved
                city = resolved.city
                state = resolved.state
            }
            status = .ready
        } catch {
            errorMessage = error.localizedDescription
            status = .error
        }
    }

    static var previewEmpty: DoctorsModel {
        let model = DoctorsModel(api: PreviewStrainAPI())
        return model
    }

    static var previewLoaded: DoctorsModel {
        let model = DoctorsModel(api: PreviewStrainAPI())
        model.result = DoctorResult(
            doctors: [.sample],
            resolvedLocation: DoctorResolvedLocation(city: "Denver", state: "CO", lat: 39.74, lon: -104.99),
            source: "leafly.com/medical-marijuana-doctors/colorado/denver",
        )
        model.city = "Denver"
        model.state = "CO"
        model.status = .ready
        return model
    }
}
