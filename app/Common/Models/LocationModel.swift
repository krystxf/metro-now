//
//  metro-now
//
//  Created by Kryštof Krátký on 15.05.2024.
//

import Foundation
import MapKit

final class LocationModel: NSObject, ObservableObject, CLLocationManagerDelegate {
    @Published var location: CLLocation?
    var locationManager: CLLocationManager?

    func checkLocationServicesEnabled() {
        let isEnabled = CLLocationManager.locationServicesEnabled()

        if isEnabled {
            locationManager = CLLocationManager()
            if let locationManager {
                locationManager.delegate = self
                locationManager.distanceFilter = 10.0
                locationManager.startUpdatingLocation()
            }
        } else {
            print("Location services not enabled")
        }
    }

    func locationManager(_: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        location = locations.last
    }

    private func checkLocationAuthorization() {
        guard let locationManager else { return }

        switch locationManager.authorizationStatus {
        case .notDetermined:
            locationManager.requestWhenInUseAuthorization()
        case .restricted:
            print("Location is restricted")
        case .denied:
            print("User denied location permission, change permissions in settings")
        case .authorizedAlways, .authorizedWhenInUse:
            break
        @unknown default:
            break
        }
    }

    func locationManagerDidChangeAuthorization(_: CLLocationManager) {
        checkLocationAuthorization()
    }
}
