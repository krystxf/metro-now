//
//  Author: Kryštof Krátký
//

import SwiftUI
import WidgetKit

import CoreLocation

class LocationManager: NSObject, ObservableObject, CLLocationManagerDelegate {
    private let locationManager = CLLocationManager()
    @Published var location: CLLocation?

    override init() {
        super.init()
        locationManager.delegate = self
        locationManager.requestWhenInUseAuthorization()
        locationManager.startUpdatingLocation()
    }

    func locationManager(_: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        if let location = locations.last {
            self.location = location
            locationManager.stopUpdatingLocation()
        }
    }

    func locationManager(_: CLLocationManager, didFailWithError error: Error) {
        print("Failed to find user's location: \(error.localizedDescription)")
    }
}

struct Provider: TimelineProvider {
    let locationManager = LocationManager()

    func placeholder(in _: Context) -> WidgetEntry {
        WidgetEntry(date: Date(), stationName: "Loading...", departures: [])
    }

    func getSnapshot(in _: Context, completion: @escaping (WidgetEntry) -> Void) {
        let entry = WidgetEntry(date: Date(), stationName: "Kacerov", departures: [])
        completion(entry)
    }

    func getTimeline(in _: Context, completion: @escaping (Timeline<Entry>) -> Void) {
        Task {
            let departures = []
        }

        var entries: [WidgetEntry] = []

        // Generate a timeline consisting of five entries an hour apart, starting from the current date.
        let currentDate = Date()
        for hourOffset in 0 ..< 5 {
            let entryDate = Calendar.current.date(byAdding: .hour, value: hourOffset, to: currentDate)!
            let entry = WidgetEntry(date: Date(), stationName: "Kacerov", departures: [])
            entries.append(entry)
        }

        let timeline = Timeline(entries: entries, policy: .atEnd)
        completion(timeline)
    }

    private func fetchNearestMetroStation(completion: @escaping (String) -> Void) {
        guard let location = locationManager.location else {
            completion("Location not available")
            return
        }

        // Replace with actual API call to fetch nearest metro station using location.coordinate
        let nearestStation = "Mock Metro Station"
        completion(nearestStation)
    }
}
