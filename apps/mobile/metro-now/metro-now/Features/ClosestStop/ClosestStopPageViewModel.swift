// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
import SwiftUI
import WidgetKit

private let REFETCH_INTERVAL: TimeInterval = 3 // seconds
private let SECONDS_BEFORE: TimeInterval = 3 // how many seconds after departure will it still be visible
private let CLOSEST_STOPS_LIMIT: Int32 = 20
private let MAX_METRO_DISTANCE: CLLocationDistance = 20000 // 20 km

class ClosestStopPageViewModel: NSObject, ObservableObject, CLLocationManagerDelegate {
    private let locationManager = CLLocationManager()
    private let shouldRefresh: Bool
    @Published var location: CLLocation?

    @Published var nearbyStops: [ApiStop]?

    @Published var closestMetroStop: ApiStop?
    @Published var closestStop: ApiStop?

    @Published var departures: [ApiDeparture]?

    var isMetroNearby: Bool {
        guard let location, let closestMetroStop else { return false }
        return closestMetroStop.distance(to: location) <= MAX_METRO_DISTANCE
    }

    private var refreshTask: Task<Void, Never>?

    init(
        initialLocation: CLLocation? = nil,
        initialNearbyStops: [ApiStop]? = nil,
        initialDepartures: [ApiDeparture]? = nil,
        shouldRefresh: Bool = true
    ) {
        self.shouldRefresh = shouldRefresh
        location = initialLocation
        nearbyStops = initialNearbyStops
        departures = initialDepartures
        super.init()

        if let initialNearbyStops {
            deriveClosestStops(from: initialNearbyStops)
        }

        guard shouldRefresh else {
            return
        }

        locationManager.delegate = self
        locationManager.requestWhenInUseAuthorization()
        locationManager.startUpdatingLocation()

        startPeriodicRefresh()
    }

    deinit {
        stopPeriodicRefresh()
    }

    private func deriveClosestStops(from stops: [ApiStop]) {
        closestStop = stops.first
        closestMetroStop = stops.first { stop in
            stop.platforms.contains(where: \.isMetro)
        }
    }

    func refresh() async {
        if let location {
            await fetchClosestStops(location: location)
        }

        let stopIds = [closestMetroStop?.id, closestStop?.id].compactMap { $0 }
        guard !stopIds.isEmpty else { return }
        await fetchAndApplyDepartures(stopsIds: stopIds, platformsIds: [])
    }

    private func startPeriodicRefresh() {
        stopPeriodicRefresh()
        refreshTask = Task(priority: .utility) { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(REFETCH_INTERVAL))
                guard !Task.isCancelled, let self else { return }

                let stopIds: [String] = await MainActor.run {
                    [self.closestMetroStop?.id, self.closestStop?.id].compactMap { $0 }
                }
                guard !stopIds.isEmpty else { continue }

                await fetchAndApplyDepartures(
                    stopsIds: stopIds,
                    platformsIds: []
                )
            }
        }
    }

    private func stopPeriodicRefresh() {
        refreshTask?.cancel()
        refreshTask = nil
    }

    func locationManager(_: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else {
            return
        }
        self.location = location

        Task {
            await fetchClosestStops(location: location)
        }
    }

    private func fetchClosestStops(location: CLLocation) async {
        do {
            let response = try await fetchGraphQLQuery(
                MetroNowAPI.ClosestStopsQuery(
                    latitude: location.coordinate.latitude,
                    longitude: location.coordinate.longitude,
                    limit: .some(CLOSEST_STOPS_LIMIT)
                )
            )

            let stops = response.closestStops.map { mapGraphQLClosestStop($0) }

            let previousMetroId = await MainActor.run { closestMetroStop?.id }
            let previousStopId = await MainActor.run { closestStop?.id }

            await MainActor.run {
                nearbyStops = stops
                deriveClosestStops(from: stops)

                if closestMetroStop?.id != previousMetroId {
                    if let id = closestMetroStop?.id {
                        getDepartures(stopsIds: [id], platformsIds: [])
                    }
                    WidgetCenter.shared.reloadAllTimelines()
                }

                if closestStop?.id != previousStopId {
                    if let id = closestStop?.id {
                        getDepartures(stopsIds: [id], platformsIds: [])
                    }
                }
            }

            print("Fetched \(stops.count) closest stops")
        } catch {
            print("Error fetching closest stops: \(error)")
        }
    }

    private func getDepartures(
        stopsIds: [String],
        platformsIds: [String]
    ) {
        Task(priority: .utility) {
            await self.fetchAndApplyDepartures(stopsIds: stopsIds, platformsIds: platformsIds)
        }
    }

    private func fetchAndApplyDepartures(
        stopsIds: [String],
        platformsIds: [String]
    ) async {
        do {
            let response = try await fetchGraphQLQuery(
                MetroNowAPI.DeparturesQuery(
                    stopIds: .some(stopsIds),
                    platformIds: .some(platformsIds),
                    limit: .some(10),
                    metroOnly: .none,
                    minutesBefore: .some(1),
                    minutesAfter: .some(Int32(6 * 60))
                )
            )

            let fetchedDepartures = response.departures.compactMap {
                mapGraphQLDeparture($0)
            }

            let oldDepartures = await MainActor.run { self.departures }

            let newDepartures: [ApiDeparture]
            if let oldDepartures {
                let oldStuff = oldDepartures.filter { oldDeparture in
                    !fetchedDepartures.contains(where: { fetchedDeparture in
                        fetchedDeparture.id == oldDeparture.id
                    })
                }
                newDepartures = uniqueBy(
                    array: oldStuff + fetchedDepartures,
                    by: \.id
                )
                .filter {
                    $0.departure.predicted > Date.now - SECONDS_BEFORE
                }
                .sorted(by: {
                    $0.departure.scheduled < $1.departure.scheduled
                })
            } else {
                newDepartures = fetchedDepartures
            }

            await MainActor.run {
                self.departures = newDepartures
            }

            print("Fetched \(fetchedDepartures.count) departures")
        } catch {
            print("Error fetching departures: \(error)")
        }
    }
}
