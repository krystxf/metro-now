// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
import Foundation

// Deliberately distinct from the closest-stop page's `stops_all_v2` key:
// this cache carries extra data (metro entrances merged from GraphQL) and
// must not be clobbered by the other view model's entrance-less writes.
private let ALL_STOPS_WITH_ENTRANCES_CACHE_KEY = "stops_all_with_entrances_v1"
private let STOPS_CACHE_MAX_AGE: TimeInterval = 24 * 60 * 60

/// Page size for paginated stop fetching. Backend struggles when asked to
/// hydrate all ~20k stops in a single response, so we chunk requests.
private let STOPS_PAGE_SIZE = 1000
private let STOPS_REFRESH_INTERVAL: Duration = .seconds(6 * 60 * 60)

class StopsViewModel: NSObject, ObservableObject {
    @Published var stops: [ApiStop]?
    @Published private(set) var hasFullStops: Bool = false

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

    /// Seed `stops` with a partial list (e.g. the closest stops fetched by
    /// `ClosestStopPageViewModel`) so the map and search render something
    /// before the full list arrives. No-op if the full list is already loaded.
    func seedIfEmpty(with partialStops: [ApiStop]) {
        guard !hasFullStops, !partialStops.isEmpty else { return }
        stops = partialStops
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
            hasFullStops = true
        } else if let cached = DiskCache.load(
            key: ALL_STOPS_WITH_ENTRANCES_CACHE_KEY,
            maxAge: STOPS_CACHE_MAX_AGE,
            as: [ApiStop].self
        ) {
            stops = cached
            hasFullStops = true
        } else if let stale = DiskCache.loadStale(key: ALL_STOPS_WITH_ENTRANCES_CACHE_KEY, as: [ApiStop].self) {
            // Expired, but better than a blank UI while we refresh.
            stops = stale.data
            hasFullStops = true
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
            self.hasFullStops = true
        }
    }

    private func startPeriodicRefresh() {
        stopPeriodicRefresh()
        refreshTask = Task(priority: .utility) { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: STOPS_REFRESH_INTERVAL)
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
        do {
            var graphQLStops: [MetroNowAPI.AllStopsLightQuery.Data.Stop] = []
            var offset = 0
            while true {
                let page = try await fetchGraphQLQuery(
                    MetroNowAPI.AllStopsLightQuery(
                        limit: .some(Int32(STOPS_PAGE_SIZE)),
                        offset: .some(Int32(offset))
                    )
                ).stops
                graphQLStops.append(contentsOf: page)
                if page.count < STOPS_PAGE_SIZE {
                    break
                }
                offset += STOPS_PAGE_SIZE
            }
            var stops = graphQLStops.map(Self.apiStop(from:))

            let metroStopIds = stops
                .filter { stop in stop.platforms.contains(where: \.isMetro) }
                .map(\.id)

            guard !metroStopIds.isEmpty else {
                return stops
            }

            let graphQLData = try await fetchGraphQLQuery(
                MetroNowAPI.MetroStopEntrancesQuery(ids: .some(metroStopIds))
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
                guard let entrances = entrancesByStopId[stop.id] else {
                    continue
                }

                stops[index] = ApiStop(
                    id: stop.id,
                    name: stop.name,
                    avgLatitude: stop.avgLatitude,
                    avgLongitude: stop.avgLongitude,
                    entrances: entrances,
                    platforms: stop.platforms
                )
            }

            return stops
        } catch {
            print("Failed to fetch stops via GraphQL: \(error)")
            return nil
        }
    }

    /// Maps a minimal GraphQL `Stop` payload onto the richer `ApiStop` shape
    /// consumed across the app. `entrances` is always empty here because the
    /// light query omits it; the caller merges entrances via a follow-up
    /// `MetroStopEntrancesQuery` for metro stops only.
    private static func apiStop(
        from graphQLStop: MetroNowAPI.AllStopsLightQuery.Data.Stop
    ) -> ApiStop {
        ApiStop(
            id: graphQLStop.id,
            name: graphQLStop.name,
            avgLatitude: graphQLStop.avgLatitude,
            avgLongitude: graphQLStop.avgLongitude,
            entrances: [],
            platforms: graphQLStop.platforms.map { platform in
                ApiPlatform(
                    id: platform.id,
                    latitude: platform.latitude,
                    longitude: platform.longitude,
                    name: platform.name,
                    code: platform.code,
                    direction: nil,
                    isMetro: platform.isMetro,
                    routes: platform.routes.map { route in
                        ApiRoute(
                            id: route.id,
                            name: route.name ?? "",
                            color: route.color
                        )
                    }
                )
            }
        )
    }
}
