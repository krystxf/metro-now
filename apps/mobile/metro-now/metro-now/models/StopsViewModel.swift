// metro-now
// https://github.com/krystxf/metro-now

import Alamofire
import CoreLocation
import Foundation

private struct MetroStopEntrancesQueryData: Decodable {
    let stops: [MetroStopEntrancesStop]
}

private struct MetroStopEntrancesStop: Decodable {
    let id: String
    let entrances: [ApiStopEntrance]
}

private struct MetroStopEntrancesQueryVariables: Encodable {
    let ids: [String]
}

private let METRO_STOP_ENTRANCES_QUERY = """
query MetroStopEntrances($ids: [ID!]) {
  stops(ids: $ids) {
    id
    entrances {
      id
      name
      latitude
      longitude
    }
  }
}
"""

class LocationViewModel: NSObject, ObservableObject, CLLocationManagerDelegate {
    private let locationManager = CLLocationManager()

    /// Published property to store user's current location
    @Published var location: CLLocation?

    /// Published property to handle location access status
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

    /// CLLocationManagerDelegate method: called when location updates
    func locationManager(_: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        // Take the most recent location
        guard let latestLocation = locations.last else { return }
        DispatchQueue.main.async {
            self.location = latestLocation
        }
    }

    /// CLLocationManagerDelegate method: called when authorization status changes
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

    private static let cacheFileName = "all_stops_cache.json"

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

        if let cached = Self.loadCachedStops() {
            stops = cached
        }

        Task(priority: .high) {
            await self.updateStops()
        }

        startPeriodicRefresh()
    }

    @MainActor
    private func updateStops() async {
        guard let fetched = await fetchStops() else { return }
        stops = fetched
        Self.saveCachedStops(fetched)
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

    private static var cacheFileURL: URL? {
        FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)
            .first?
            .appendingPathComponent(cacheFileName)
    }

    private static func loadCachedStops() -> [ApiStop]? {
        guard let url = cacheFileURL,
              let data = try? Data(contentsOf: url)
        else { return nil }
        return try? JSONDecoder().decode([ApiStop].self, from: data)
    }

    private static func saveCachedStops(_ stops: [ApiStop]) {
        guard let url = cacheFileURL,
              let data = try? JSONEncoder().encode(stops)
        else { return }
        try? data.write(to: url, options: .atomic)
    }

    private func fetchStops() async -> [ApiStop]? {
        let req = apiSession.request(
            "\(API_URL)/v1/stop/all",
            method: .get
        )

        guard var stops = try? await fetchData(req, ofType: [ApiStop].self) else {
            return nil
        }

        let stopIds = stops.filter { stop in
            stop.platforms.contains(where: \.isMetro)
        }
        .map(\.id)
        guard !stopIds.isEmpty else {
            return stops
        }

        do {
            let graphQLData = try await fetchGraphQLData(
                query: METRO_STOP_ENTRANCES_QUERY,
                variables: MetroStopEntrancesQueryVariables(ids: stopIds),
                ofType: MetroStopEntrancesQueryData.self
            )
            let entrancesByStopId = Dictionary(
                uniqueKeysWithValues: graphQLData.stops.map { stop in
                    (stop.id, stop.entrances)
                }
            )

            for index in stops.indices {
                let stop = stops[index]

                stops[index] = ApiStop(
                    id: stop.id,
                    name: stop.name,
                    avgLatitude: stop.avgLatitude,
                    avgLongitude: stop.avgLongitude,
                    entrances: entrancesByStopId[stop.id] ?? [],
                    platforms: stop.platforms
                )
            }
        } catch {
            print("Failed to fetch metro stop entrances via GraphQL: \(error)")
        }

        return stops
    }
}
