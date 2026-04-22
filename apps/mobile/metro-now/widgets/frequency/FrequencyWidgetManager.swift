// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation

class FrequencyWidgetManager: NSObject, ObservableObject, CLLocationManagerDelegate {
    private let locationManager = CLLocationManager()
    @Published var location: CLLocation?
    @Published var metroStops: [ApiStop]?
    @Published var closestMetroStop: ApiStop?
    @Published var nearestDepartures: [ApiDeparture] = []

    override init() {
        super.init()
        locationManager.delegate = self
        locationManager.requestWhenInUseAuthorization()
        locationManager.startUpdatingLocation()
        fetchMetroStops()
    }

    func locationManager(_: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        self.location = location
        updateClosestMetroStop()
        fetchDeparturesForClosestStop()
    }

    private func fetchMetroStops() {
        Task {
            guard let stops = await fetchStopsWithCache(metroOnly: true) else {
                print("Failed to fetch metro stops")
                return
            }
            await MainActor.run {
                self.metroStops = stops
                self.updateClosestMetroStop()
            }
        }
    }

    private func updateClosestMetroStop() {
        guard let location, let metroStops else { return }
        closestMetroStop = metroStops.min(by: {
            let distance1 = $0.distance(to: location)
            let distance2 = $1.distance(to: location)
            return distance1 < distance2
        })
    }

    private func fetchDeparturesForClosestStop() {
        guard let closestStop = closestMetroStop else { return }

        let platformIds = closestStop.platforms.map(\.id)
        guard !platformIds.isEmpty else {
            return
        }

        Task {
            do {
                let departures = try await fetchDeparturesGraphQL(
                    stopIds: [],
                    platformIds: platformIds,
                    limit: 4,
                    metroOnly: nil,
                    minutesBefore: 0,
                    minutesAfter: 12 * 60
                )
                await MainActor.run {
                    self.nearestDepartures = departures
                }
            } catch {
                print("Failed to fetch departures: \(error)")
            }
        }
    }
}
