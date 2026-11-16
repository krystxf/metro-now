// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
import Foundation

class LocationViewModel: NSObject, ObservableObject, CLLocationManagerDelegate {
    private let locationManager = CLLocationManager()

    @Published var location: CLLocation?
    @Published var authorizationStatus: CLAuthorizationStatus?

    init(
        initialLocation: CLLocation? = nil,
        initialAuthorizationStatus: CLAuthorizationStatus? = nil,
        shouldStartUpdates: Bool = true
    ) {
        location = initialLocation
        authorizationStatus = initialAuthorizationStatus
        super.init()

        guard shouldStartUpdates else {
            return
        }

        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
        locationManager.requestWhenInUseAuthorization()
        locationManager.startUpdatingLocation()
        authorizationStatus = locationManager.authorizationStatus
    }

    func locationManager(_: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let latestLocation = locations.last else {
            return
        }

        DispatchQueue.main.async {
            self.location = latestLocation
        }
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        DispatchQueue.main.async {
            self.authorizationStatus = manager.authorizationStatus
        }

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
