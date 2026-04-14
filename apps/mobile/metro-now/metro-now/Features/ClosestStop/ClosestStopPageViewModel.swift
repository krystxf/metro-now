// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
import SwiftUI
import WidgetKit

private let REFETCH_INTERVAL: TimeInterval = 3 // seconds
private let SECONDS_BEFORE: TimeInterval = 3 // how many seconds after departure will it still be visible
private let METRO_STOPS_CACHE_KEY = "stops_metro_v2"
private let ALL_STOPS_CACHE_KEY = "stops_all_v2"

class ClosestStopPageViewModel: NSObject, ObservableObject, CLLocationManagerDelegate {
    private let locationManager = CLLocationManager()
    private let shouldRefresh: Bool
    @Published var location: CLLocation?

    @Published var metroStops: [ApiStop]?
    @Published var allStops: [ApiStop]?

    @Published var closestMetroStop: ApiStop?
    @Published var closestStop: ApiStop?

    @Published var departures: [ApiDeparture]?

    private var refreshTimer: Timer?

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
            getStops(metroOnly: true)
        }
        if allStops == nil {
            getStops()
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

    func refresh() {
        getStops(metroOnly: true)
        getStops()

        let stopIds = [closestMetroStop?.id ?? "", closestStop?.id ?? ""]

        getDepartures(
            stopsIds: stopIds.filter { !$0.isEmpty },
            platformsIds: []
        )
    }

    private func startPeriodicRefresh() {
        stopPeriodicRefresh() // Stop any existing timer to avoid duplication.
        refreshTimer = Timer.scheduledTimer(
            withTimeInterval: REFETCH_INTERVAL,
            repeats: true
        ) { [weak self] _ in
            guard
                let self,
                let closestMetroStop,
                let closestStop
            else {
                return
            }

            getDepartures(
                stopsIds: [closestMetroStop.id, closestStop.id],
                platformsIds: []
            )
        }
    }

    private func stopPeriodicRefresh() {
        refreshTimer?.invalidate()
        refreshTimer = nil
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

        if let metroStops,
           let nextValue = findClosestStop(to: location, stops: metroStops),
           nextValue.id != self.closestMetroStop?.id
        {
            closestMetroStop = nextValue
            getDepartures(stopsIds: [nextValue.id], platformsIds: [])
            WidgetCenter.shared.reloadAllTimelines()
        }

        if let allStops,
           let nextValue = findClosestStop(to: location, stops: allStops),
           nextValue.id != self.closestStop?.id
        {
            closestStop = nextValue
            getDepartures(stopsIds: [nextValue.id], platformsIds: [])
        }
    }

    private func getStops(metroOnly: Bool = false) {
        let request = apiSession.request(
            "\(API_URL)/v1/stop/all",
            method: .get,
            parameters: ["metroOnly": String(metroOnly)]
        )

        request
            .validate()
            .responseDecodable(of: [ApiStop].self) { response in
                switch response.result {
                case let .success(fetchedStops):
                    DispatchQueue.main.async {
                        if metroOnly {
                            self.metroStops = fetchedStops
                            DiskCache.save(fetchedStops, key: METRO_STOPS_CACHE_KEY)
                            print("Fetched \(fetchedStops.count) metro stops")
                        } else {
                            self.allStops = fetchedStops
                            DiskCache.save(fetchedStops, key: ALL_STOPS_CACHE_KEY)
                            print("Fetched \(fetchedStops.count) stops")
                        }

                        self.updateClosestStop()
                    }
                case let .failure(error):
                    print(
                        metroOnly
                            ? "Error fetching metroStops: \(error)"
                            : "Error fetching stops: \(error)"
                    )
                }
            }
    }

    private func getDepartures(
        stopsIds: [String],
        platformsIds: [String]
    ) {
        Task {
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

                await MainActor.run {
                    if let oldDepartures = self.departures {
                        let oldStuff = oldDepartures.filter { oldDeparture in
                            !fetchedDepartures.contains(where: { fetchedDeparture in
                                fetchedDeparture.id == oldDeparture.id
                            })
                        }
                        self.departures = uniqueBy(
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
                        self.departures = fetchedDepartures
                    }

                    print("Fetched \(fetchedDepartures.count) departures")
                }
            } catch {
                print("Error fetching departures: \(error)")
            }
        }
    }
}
