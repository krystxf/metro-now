// metro-now
// https://github.com/krystxf/metro-now

import Alamofire
import CoreLocation
import Foundation

// Deliberately distinct from the closest-stop page's `stops_all_v2` key:
// this cache carries extra data (metro entrances merged from GraphQL) and
// must not be clobbered by the other view model's entrance-less writes.
private let ALL_STOPS_WITH_ENTRANCES_CACHE_KEY = "stops_all_with_entrances_v1"
private let STOPS_CACHE_MAX_AGE: TimeInterval = 24 * 60 * 60

class StopsViewModel: NSObject, ObservableObject {
    @Published var stops: [ApiStop]?

    private let shouldRefresh: Bool

    func getClosestStop(_ location: CLLocation) -> ApiStop? {
        guard let stops else {
            return nil
        }

        return findClosestStop(
            to: location,
            stops: stops
        )
    }

    private var refreshTask: Task<Void, Never>?

    init(
        initialStops: [ApiStop]? = nil,
        shouldRefresh: Bool = true
    ) {
        self.shouldRefresh = shouldRefresh
        super.init()

        if let initialStops {
            stops = initialStops
        } else if let cached = DiskCache.load(
            key: ALL_STOPS_WITH_ENTRANCES_CACHE_KEY,
            maxAge: STOPS_CACHE_MAX_AGE,
            as: [ApiStop].self
        ) {
            stops = cached
        } else if let stale = DiskCache.loadStale(key: ALL_STOPS_WITH_ENTRANCES_CACHE_KEY, as: [ApiStop].self) {
            // Expired, but better than a blank UI while we refresh.
            stops = stale.data
        }

        guard shouldRefresh else {
            return
        }

        Task(priority: .high) {
            await self.updateStops()
        }
        startPeriodicRefresh()
    }

    private func updateStops() async {
        guard let fetched = await fetchStops() else {
            // Fetch failed — keep whatever we already have (fresh or stale).
            return
        }
        DiskCache.save(fetched, key: ALL_STOPS_WITH_ENTRANCES_CACHE_KEY)
        await MainActor.run {
            self.stops = fetched
        }
    }

    private func startPeriodicRefresh() {
        stopPeriodicRefresh()
        refreshTask = Task(priority: .utility) { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(60))
                guard !Task.isCancelled, let self else { return }

                await updateStops()
            }
        }
    }

    deinit {
        stopPeriodicRefresh()
    }

    private func stopPeriodicRefresh() {
        refreshTask?.cancel()
        refreshTask = nil
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
            let graphQLData = try await fetchGraphQLQuery(
                MetroNowAPI.MetroStopEntrancesQuery(ids: .some(stopIds))
            )
            let entrancesByStopId = Dictionary(
                uniqueKeysWithValues: graphQLData.stops.map { stop in
                    (
                        stop.id,
                        stop.entrances.map { entrance in
                            ApiStopEntrance(
                                id: entrance.id,
                                name: entrance.name,
                                latitude: entrance.latitude,
                                longitude: entrance.longitude
                            )
                        }
                    )
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
