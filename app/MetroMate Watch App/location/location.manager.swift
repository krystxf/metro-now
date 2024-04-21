//
//  location.manager.swift
//  MetroMate
//
//  Created by Kryštof Krátký on 31.03.2024.
//

import CoreLocation
import Foundation

class LocationManager: NSObject, ObservableObject {
    private let manager = CLLocationManager()
    @Published var userLocation: CLLocation?
    static let shared = LocationManager()

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
        manager.startUpdatingLocation()
    }

    func requestLocation() {
        manager.requestWhenInUseAuthorization()
    }
}

extension LocationManager: CLLocationManagerDelegate {
    func locationManager(_: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
        switch status {
        case .notDetermined:
            print("location manager: notDetermined")
        case .restricted:
            print("location manager: restricted")
        case .denied:
            print("location manager: denied")
        case .authorizedAlways:
            print("location manager: authorizedAlways")
        case .authorizedWhenInUse:
            print("location manager: authorizedWhenInUse")
        @unknown default:
            break
        }
    }

    func locationManager(_: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        userLocation = location
    }
}
