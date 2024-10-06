import CoreLocation
import os
import SwiftUI

final class LocationManager: NSObject, CLLocationManagerDelegate, ObservableObject {
    @Published var lastKnownLocation: CLLocationCoordinate2D?
    var manager = CLLocationManager()

    func checkLocationAuthorization() {
        manager.delegate = self
        manager.startUpdatingLocation()

        switch manager.authorizationStatus {
        case .notDetermined: // The user choose allow or denny your app to get the location yet
            manager.requestWhenInUseAuthorization()

        case .restricted: // The user cannot change this app’s status, possibly due to active restrictions such as parental controls being in place.
            print("Location restricted")

        case .denied: // The user dennied your app to get location or disabled the services location or the phone is in airplane mode
            print("Location denied")

        case .authorizedAlways: // This authorization allows you to use all location services and receive location events whether or not your app is in use.
            print("Location authorizedAlways")

        case .authorizedWhenInUse: // This authorization allows you to use all location services and receive location events only when your app is in use
            print("Location authorized when in use")
            lastKnownLocation = manager.location?.coordinate

        @unknown default:
            print("Location service disabled")
        }
    }

    func locationManagerDidChangeAuthorization(_: CLLocationManager) { // Trigged every time authorization status changes
        checkLocationAuthorization()
    }

    func locationManager(_: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        lastKnownLocation = locations.first?.coordinate
    }
}

struct ContentView: View {
    @StateObject private var locationManager = LocationManager()
    var stopManager = StopManager()

    var body: some View {
        StationDeparturesView()

            .task {
                let stops = await getAllMetroStops()
                print("Helloooooo")
                stopManager.stops = stops
                stopManager.closestStop = stops.first
                print(stops)
            }
            .environmentObject(stopManager)
    }
}

#Preview {
    ContentView()
}
