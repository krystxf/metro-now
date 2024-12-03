// metro-now
// https://github.com/krystxf/metro-now

import Alamofire
import CoreLocation
import Foundation

class LocationViewModel: NSObject, ObservableObject, CLLocationManagerDelegate {
    private let locationManager = CLLocationManager()

    // Published property to store user's current location
    @Published var location: CLLocation?

    // Published property to handle location access status
    @Published var authorizationStatus: CLAuthorizationStatus?

    override init() {
        super.init()

        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
        locationManager.requestWhenInUseAuthorization()
        locationManager.startUpdatingLocation()

        // Capture the initial authorization status
        authorizationStatus = locationManager.authorizationStatus
    }

    // CLLocationManagerDelegate method: called when location updates
    func locationManager(_: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        // Take the most recent location
        guard let latestLocation = locations.last else { return }
        DispatchQueue.main.async {
            self.location = latestLocation
        }
    }

    // CLLocationManagerDelegate method: called when authorization status changes
    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        DispatchQueue.main.async {
            self.authorizationStatus = manager.authorizationStatus
        }

        // Handle location updates based on the new authorization status
        switch manager.authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways:
            locationManager.startUpdatingLocation()
        case .denied, .restricted:
            locationManager.stopUpdatingLocation()
        default:
            break
        }
    }
}

class StopsViewModel: NSObject, ObservableObject {
    @Published var stops: [ApiStop]?

    func getClosestStop(_ location: CLLocation) -> ApiStop? {
        guard let stops else {
            return nil
        }

        return findClosestStop(
            to: location,
            stops: stops
        )
    }

    private var refreshTimer: Timer?

    override init() {
        super.init()

        Task(priority: .high) {
            await self.updateStops()
        }

        startPeriodicRefresh()
    }

    @MainActor
    private func updateStops() async {
        stops = await fetchStops()
    }

    private func startPeriodicRefresh() {
        stopPeriodicRefresh() // Stop any existing timer to avoid duplication.

        refreshTimer = Timer.scheduledTimer(withTimeInterval: 60, repeats: true) { [weak self] _ in

            guard let self else {
                return
            }

            Task(priority: .low) {
                await self.updateStops()
            }
        }
    }

    deinit {
        stopPeriodicRefresh()
    }

    private func stopPeriodicRefresh() {
        refreshTimer?.invalidate()
        refreshTimer = nil
    }

    private func fetchStops(metroOnly: Bool = false) async -> [ApiStop]? {
        let req = AF.request(
            "\(API_URL)/v1/stop/all",
            method: .get,
            parameters: ["metroOnly": String(metroOnly)]
        )

        return try? await fetchData(req, ofType: [ApiStop].self)
    }
}
