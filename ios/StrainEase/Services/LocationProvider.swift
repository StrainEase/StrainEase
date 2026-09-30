import CoreLocation
import Foundation

/// Wraps CoreLocation so the rest of the app stays free of CL types and
/// can be stubbed in previews. Returns the user's coordinates on demand
/// after a one-shot authorization prompt.
@MainActor
final class LocationProvider: NSObject, CLLocationManagerDelegate {
    enum LocationError: LocalizedError {
        case denied
        case restricted
        case unknown(String)

        var errorDescription: String? {
            switch self {
            case .denied:
                return "Location access was denied. Enable it in Settings to use nearby doctors."
            case .restricted:
                return "Location access is restricted on this device."
            case .unknown(let message):
                return message
            }
        }
    }

    @MainActor
    final class ContinuationBox: @unchecked Sendable {
        var resume: ((Result<CLLocation, LocationError>) -> Void)?
        deinit { resume = nil }
    }

    private let manager: CLLocationManager
    private let box = ContinuationBox()

    init(manager: CLLocationManager = CLLocationManager()) {
        self.manager = manager
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
    }

    /// One-shot location request. Prompts for permission on first call.
    func requestLocation() async throws -> CLLocation {
        let status = manager.authorizationStatus
        switch status {
        case .denied, .restricted:
            throw LocationError.denied
        case .notDetermined:
            manager.requestWhenInUseAuthorization()
        default:
            break
        }
        return try await withCheckedThrowingContinuation { (cont: CheckedContinuation<CLLocation, Error>) in
            self.box.resume = { result in
                switch result {
                case .success(let location):
                    cont.resume(returning: location)
                case .failure(let error):
                    cont.resume(throwing: error)
                }
            }
            self.manager.requestLocation()
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        Task { @MainActor in
            guard let location = locations.last else { return }
            self.box.resume?(.success(location))
            self.box.resume = nil
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor in
            self.box.resume?(.failure(.unknown(error.localizedDescription)))
            self.box.resume = nil
        }
    }

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        Task { @MainActor in
            switch manager.authorizationStatus {
            case .denied:
                self.box.resume?(.failure(.denied))
                self.box.resume = nil
            case .restricted:
                self.box.resume?(.failure(.restricted))
                self.box.resume = nil
            default:
                break
            }
        }
    }
}
