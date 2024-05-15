//
//  LocationModel.swift
//  metro-now
//
//  Created by Kryštof Krátký on 15.05.2024.
//

import Foundation
import MapKit

final class LocationModel: NSObject, ObservableObject, CLLocationManagerDelegate {
    var locationManager: CLLocationManager?

    func checkLocationServicesEnabled() {
        let isEnabled = CLLocationManager.locationServicesEnabled()

        if isEnabled {
            locationManager = CLLocationManager()
            locationManager!.delegate = self
        } else {
            print("Location services not enabled")
        }
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
