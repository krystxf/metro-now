// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
import SwiftUI
import WidgetKit

private let REFETCH_INTERVAL: TimeInterval = 3 // seconds
private let SECONDS_BEFORE: TimeInterval = 3 // how many seconds after departure will it still be visible
private let METRO_STOPS_CACHE_KEY = "stops_metro_v2"
private let ALL_STOPS_CACHE_KEY = "stops_all_v2"
private let MAX_METRO_DISTANCE: CLLocationDistance = 20000 // 20 km

class ClosestStopPageViewModel: NSObject, ObservableObject, CLLocationManagerDelegate {
    private let locationManager = CLLocationManager()
    private let shouldRefresh: Bool
    @Published var location: CLLocation?

    @Published var metroStops: [ApiStop]?
    @Published var allStops: [ApiStop]?

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
        initialMetroStops: [ApiStop]? = nil,
        initialAllStops: [ApiStop]? = nil,
        initialDepartures: [ApiDeparture]? = nil,
        shouldRefresh: Bool = true
    ) {
        self.shouldRefresh = shouldRefresh
        location = initialLocation
        metroStops = initialMetroStops
        allStops = initialAllStops
        departures = initialDepartures
        super.init()

        if let initialLocation {
            if let initialMetroStops {
                closestMetroStop = findClosestStop(to: initialLocation, stops: initialMetroStops)
            }

            if let initialAllStops {
                closestStop = findClosestStop(to: initialLocation, stops: initialAllStops)
            }
        }

        guard shouldRefresh else {
            return
        }

        locationManager.delegate = self
        locationManager.requestWhenInUseAuthorization()
        locationManager.startUpdatingLocation()

        if metroStops == nil || allStops == nil {
            loadCachedStops()
        }
        if metroStops == nil {
            Task { await self.getStops(metroOnly: true) }
        }
        if allStops == nil {
            Task { await self.getStops() }
        }

        startPeriodicRefresh()
    }

    private func loadCachedStops() {
        let oneDay: TimeInterval = 24 * 60 * 60

        if let cached = DiskCache.load(key: METRO_STOPS_CACHE_KEY, maxAge: oneDay, as: [ApiStop].self) {
            metroStops = cached
        }
        if let cached = DiskCache.load(key: ALL_STOPS_CACHE_KEY, maxAge: oneDay, as: [ApiStop].self) {
            allStops = cached
        }
        updateClosestStop()
    }

    deinit {
        stopPeriodicRefresh()
    }

    func refresh() async {
        await getStops(metroOnly: true)
        await getStops(metroOnly: false)

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

        updateClosestStop()
    }

    func updateClosestStop() {
        guard let location else {
            return
        }

        let metroStopsCopy = metroStops
        let allStopsCopy = allStops
        let currentMetroId = closestMetroStop?.id
        let currentStopId = closestStop?.id

        Task.detached(priority: .userInitiated) { [weak self] in
            let newMetro = metroStopsCopy.flatMap { findClosestStop(to: location, stops: $0) }
            let newAll = allStopsCopy.flatMap { findClosestStop(to: location, stops: $0) }

            await MainActor.run {
                guard let self else { return }

                if let newMetro, newMetro.id != currentMetroId {
                    self.closestMetroStop = newMetro
                    self.getDepartures(stopsIds: [newMetro.id], platformsIds: [])
                    WidgetCenter.shared.reloadAllTimelines()
                }

                if let newAll, newAll.id != currentStopId {
                    self.closestStop = newAll
                    self.getDepartures(stopsIds: [newAll.id], platformsIds: [])
                }
            }
        }
    }

    private func getStops(metroOnly: Bool = false) async {
        let request = apiSession.request(
            "\(API_URL)/v1/stop/all",
            method: .get,
            parameters: ["metroOnly": String(metroOnly)]
        )

        guard let fetchedStops = try? await fetchData(request, ofType: [ApiStop].self) else {
            print(metroOnly ? "Error fetching metroStops" : "Error fetching stops")
            return
        }

        let cacheKey = metroOnly ? METRO_STOPS_CACHE_KEY : ALL_STOPS_CACHE_KEY
        Task.detached(priority: .utility) {
            DiskCache.save(fetchedStops, key: cacheKey)
        }

        await MainActor.run {
            if metroOnly {
                self.metroStops = fetchedStops
                print("Fetched \(fetchedStops.count) metro stops")
            } else {
                self.allStops = fetchedStops
                print("Fetched \(fetchedStops.count) stops")
            }
            self.updateClosestStop()
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
