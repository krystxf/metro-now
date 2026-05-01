// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
import SwiftUI
import WidgetKit

private let REFETCH_INTERVAL: TimeInterval = 3 // seconds
private let SECONDS_BEFORE: TimeInterval = 3 // how many seconds after departure will it still be visible
private let CLOSEST_STOPS_LIMIT: Int32 = 20
private let DEPARTURES_MINUTES_AFTER: Int32 = 60
private let MAX_METRO_DISTANCE: CLLocationDistance = 10000 // 10 km

class ClosestStopPageViewModel: NSObject, ObservableObject, CLLocationManagerDelegate {
    private let locationManager = CLLocationManager()
    private let shouldRefresh: Bool
    @Published var location: CLLocation?

    @Published var nearbyStops: [ApiStop]?

    @Published var closestMetroStop: ApiStop?
    @Published var closestStop: ApiStop?

    @Published var departures: [ApiDeparture]?
    @Published var metroDepartures: [ApiDeparture]?

    var isMetroNearby: Bool {
        guard let location, let closestMetroStop else { return false }
        return closestMetroStop.distance(to: location) <= MAX_METRO_DISTANCE
    }

    private var refreshTask: Task<Void, Never>?
    private var closestStopsTask: Task<Void, Never>?
    private var departuresTask: Task<Void, Never>?
    private var metroDeparturesTask: Task<Void, Never>?

    private func log(_ message: String) {
        print("[DeparturesPage] \(message)")
    }

    private static func authorizationStatusDescription(
        _ status: CLAuthorizationStatus
    ) -> String {
        switch status {
        case .notDetermined:
            return "notDetermined"
        case .restricted:
            return "restricted"
        case .denied:
            return "denied"
        case .authorizedAlways:
            return "authorizedAlways"
        case .authorizedWhenInUse:
            return "authorizedWhenInUse"
        @unknown default:
            return "unknown(\(status.rawValue))"
        }
    }

    private static func locationDescription(_ location: CLLocation?) -> String {
        guard let location else {
            return "nil"
        }

        return String(
            format: "%.5f,%.5f",
            location.coordinate.latitude,
            location.coordinate.longitude
        )
    }

    init(
        initialLocation: CLLocation? = nil,
        initialNearbyStops: [ApiStop]? = nil,
        initialDepartures: [ApiDeparture]? = nil,
        initialMetroDepartures: [ApiDeparture]? = nil,
        shouldRefresh: Bool = true
    ) {
        self.shouldRefresh = shouldRefresh
        location = initialLocation
        nearbyStops = initialNearbyStops
        departures = initialDepartures
        metroDepartures = initialMetroDepartures
        super.init()

        log(
            "init shouldRefresh=\(shouldRefresh) " +
                "initialLocation=\(Self.locationDescription(initialLocation)) " +
                "initialNearbyStops=\(initialNearbyStops?.count ?? 0) " +
                "initialDepartures=\(initialDepartures?.count ?? 0) " +
                "initialMetroDepartures=\(initialMetroDepartures?.count ?? 0)"
        )

        if let initialNearbyStops {
            deriveClosestStops(from: initialNearbyStops)
        }

        guard shouldRefresh else {
            return
        }

        locationManager.delegate = self
        log(
            "requesting location authorization currentStatus=" +
                Self.authorizationStatusDescription(locationManager.authorizationStatus)
        )
        locationManager.requestWhenInUseAuthorization()
        locationManager.startUpdatingLocation()
        log("requested location updates")

        startPeriodicRefresh()
    }

    deinit {
        stopPeriodicRefresh()
        closestStopsTask?.cancel()
        departuresTask?.cancel()
        metroDeparturesTask?.cancel()
    }

    private func deriveClosestStops(from stops: [ApiStop]) {
        closestStop = stops.first
        closestMetroStop = stops.first { stop in
            stop.platforms.contains(where: \.isMetro)
        }
    }

    private struct DepartureTargets {
        let generalStopId: String?
        let metroStopId: String?

        var isEmpty: Bool {
            generalStopId == nil && metroStopId == nil
        }
    }

    private func currentDepartureTargets() -> DepartureTargets {
        DepartureTargets(
            generalStopId: closestStop?.id,
            metroStopId: closestMetroStop?.id
        )
    }

    func refresh() async {
        log(
            "manual refresh location=\(Self.locationDescription(location)) " +
                "closestStop=\(closestStop?.id ?? "nil") " +
                "closestMetroStop=\(closestMetroStop?.id ?? "nil")"
        )
        if let location {
            await fetchClosestStops(
                location: location,
                forceDeparturesRefresh: true
            )
            return
        }

        let targets = await MainActor.run { currentDepartureTargets() }
        guard !targets.isEmpty else {
            log("manual refresh skipped departures fetch because there are no stop ids yet")
            return
        }
        await requestDepartures(targets: targets)
    }

    private func startPeriodicRefresh() {
        stopPeriodicRefresh()
        log("starting periodic departures refresh interval=\(REFETCH_INTERVAL)s")
        refreshTask = Task(priority: .utility) { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(REFETCH_INTERVAL))
                guard !Task.isCancelled, let self else { return }

                let targets: DepartureTargets = await MainActor.run {
                    self.currentDepartureTargets()
                }
                guard !targets.isEmpty else { continue }

                await requestDepartures(targets: targets)
            }
        }
    }

    private func stopPeriodicRefresh() {
        refreshTask?.cancel()
        refreshTask = nil
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        log("location authorization changed status=\(Self.authorizationStatusDescription(status))")

        switch status {
        case .authorizedWhenInUse, .authorizedAlways:
            log("authorization granted, starting location updates")
            locationManager.startUpdatingLocation()
        case .denied, .restricted:
            log("authorization denied or restricted, stopping location updates")
            locationManager.stopUpdatingLocation()
        case .notDetermined:
            log("authorization still pending")
        @unknown default:
            log("authorization changed to unknown state rawValue=\(status.rawValue)")
        }
    }

    func locationManager(_: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else {
            log("location update callback received with no locations")
            return
        }
        self.location = location
        log(
            "received location update count=\(locations.count) " +
                "latest=\(Self.locationDescription(location))"
        )

        scheduleClosestStopsFetch(for: location)
    }

    func locationManager(_: CLLocationManager, didFailWithError error: Error) {
        log("location manager failed: \(error.localizedDescription)")
    }

    private func scheduleClosestStopsFetch(for location: CLLocation) {
        closestStopsTask?.cancel()
        closestStopsTask = Task(priority: .utility) { [weak self] in
            guard let self else { return }
            await fetchClosestStops(location: location)
        }
    }

    private func fetchClosestStops(
        location: CLLocation,
        forceDeparturesRefresh: Bool = false
    ) async {
        do {
            log(
                "fetching closest stop ids for location=\(Self.locationDescription(location)) " +
                    "limit=\(CLOSEST_STOPS_LIMIT)"
            )
            let lightResponse = try await fetchGraphQLQuery(
                MetroNowAPI.ClosestStopsLightQuery(
                    latitude: location.coordinate.latitude,
                    longitude: location.coordinate.longitude,
                    limit: .some(CLOSEST_STOPS_LIMIT)
                )
            )
            try Task.checkCancellation()

            let orderedIds = lightResponse.closestStops.map(\.id)
            log("closest stop ids fetched count=\(orderedIds.count), hydrating stop details")

            let stops: [ApiStop]
            if orderedIds.isEmpty {
                stops = []
            } else {
                let detailsResponse = try await fetchGraphQLQuery(
                    MetroNowAPI.ClosestStopsDetailsQuery(ids: .some(orderedIds))
                )
                try Task.checkCancellation()

                let stopById = Dictionary(
                    uniqueKeysWithValues: detailsResponse.stops.map { stop in
                        (stop.id, mapGraphQLClosestStopDetail(stop))
                    }
                )
                stops = orderedIds.compactMap { stopById[$0] }
            }

            let previousMetroId = await MainActor.run { closestMetroStop?.id }
            let previousStopId = await MainActor.run { closestStop?.id }
            let shouldFetchInitialDepartures = await MainActor.run {
                departures == nil && metroDepartures == nil
            }

            let currentState = await MainActor.run {
                nearbyStops = stops
                deriveClosestStops(from: stops)

                if closestMetroStop?.id != previousMetroId {
                    WidgetCenter.shared.reloadAllTimelines()
                }

                return (
                    nearbyStopsCount: nearbyStops?.count ?? 0,
                    closestStopId: closestStop?.id ?? "nil",
                    closestMetroStopId: closestMetroStop?.id ?? "nil",
                    targets: currentDepartureTargets(),
                    shouldFetchDepartures: forceDeparturesRefresh
                        || shouldFetchInitialDepartures
                        || closestMetroStop?.id != previousMetroId
                        || closestStop?.id != previousStopId
                )
            }

            log(
                "closest stops updated fetched=\(stops.count) " +
                    "nearbyStops=\(currentState.nearbyStopsCount) " +
                    "closestStop=\(currentState.closestStopId) " +
                    "closestMetroStop=\(currentState.closestMetroStopId)"
            )

            if currentState.shouldFetchDepartures, !currentState.targets.isEmpty {
                log(
                    "requesting departures general=\(currentState.targets.generalStopId ?? "nil") " +
                        "metro=\(currentState.targets.metroStopId ?? "nil")"
                )
                await requestDepartures(targets: currentState.targets)
            }
        } catch is CancellationError {
            log("closest stops fetch cancelled")
        } catch {
            log("error fetching closest stops: \(error.localizedDescription)")
        }
    }

    private func requestDepartures(targets: DepartureTargets) async {
        guard !targets.isEmpty else {
            log("skipping departures fetch because there are no stop ids")
            return
        }

        departuresTask?.cancel()
        metroDeparturesTask?.cancel()

        let generalTask: Task<Void, Never>? = {
            guard let stopId = targets.generalStopId else { return nil }
            return Task(priority: .utility) { [weak self] in
                guard let self else { return }
                await fetchAndApplyDepartures(stopId: stopId)
            }
        }()
        departuresTask = generalTask

        let metroTask: Task<Void, Never>? = {
            guard let stopId = targets.metroStopId else { return nil }
            return Task(priority: .utility) { [weak self] in
                guard let self else { return }
                await fetchAndApplyMetroDepartures(stopId: stopId)
            }
        }()
        metroDeparturesTask = metroTask

        await generalTask?.value
        await metroTask?.value
    }

    private func fetchAndApplyDepartures(stopId: String) async {
        do {
            log("fetching departures stopId=\(stopId) metroOnly=false")
            let response = try await fetchGraphQLQuery(
                MetroNowAPI.DeparturesQuery(
                    stopIds: .some([stopId]),
                    platformIds: .some([]),
                    limit: .some(10),
                    metroOnly: .none,
                    minutesBefore: .some(1),
                    minutesAfter: .some(DEPARTURES_MINUTES_AFTER)
                )
            )
            try Task.checkCancellation()

            let fetchedDepartures = response.departures.compactMap {
                mapGraphQLDeparture($0)
            }
            let oldDepartures = await MainActor.run { self.departures }
            let merged = Self.mergeDepartures(old: oldDepartures, fetched: fetchedDepartures)

            await MainActor.run {
                self.departures = merged
            }

            log("departures updated fetched=\(fetchedDepartures.count) displayed=\(merged.count)")
        } catch is CancellationError {
            log("departures fetch cancelled stopId=\(stopId)")
        } catch {
            log("error fetching departures stopId=\(stopId): \(error.localizedDescription)")
        }
    }

    private func fetchAndApplyMetroDepartures(stopId: String) async {
        do {
            log("fetching metro departures stopId=\(stopId)")
            let response = try await fetchGraphQLQuery(
                MetroNowAPI.DeparturesQuery(
                    stopIds: .some([stopId]),
                    platformIds: .some([]),
                    limit: .some(10),
                    metroOnly: .some(true),
                    minutesBefore: .some(1),
                    minutesAfter: .some(DEPARTURES_MINUTES_AFTER)
                )
            )
            try Task.checkCancellation()

            let fetchedDepartures = response.departures.compactMap {
                mapGraphQLDeparture($0)
            }
            let oldDepartures = await MainActor.run { self.metroDepartures }
            let merged = Self.mergeDepartures(old: oldDepartures, fetched: fetchedDepartures)

            await MainActor.run {
                self.metroDepartures = merged
            }

            log("metro departures updated fetched=\(fetchedDepartures.count) displayed=\(merged.count)")
        } catch is CancellationError {
            log("metro departures fetch cancelled stopId=\(stopId)")
        } catch {
            log("error fetching metro departures stopId=\(stopId): \(error.localizedDescription)")
        }
    }

    private static func mergeDepartures(
        old: [ApiDeparture]?,
        fetched: [ApiDeparture]
    ) -> [ApiDeparture] {
        guard let old else { return fetched }

        let fetchedIds = Set(fetched.compactMap(\.id))
        let retainedOld = old.filter { departure in
            guard let id = departure.id else { return true }
            return !fetchedIds.contains(id)
        }
        return uniqueBy(array: retainedOld + fetched, by: \.id)
            .filter { $0.departure.predicted > Date.now - SECONDS_BEFORE }
            .sorted(by: { $0.departure.scheduled < $1.departure.scheduled })
    }
}
