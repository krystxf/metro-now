// metro-now
// https://github.com/krystxf/metro-now

import Alamofire
import CoreLocation
import Foundation

class StopsViewModel: NSObject, ObservableObject {
    @Published var stops: [ApiStop]?

    private static let cacheFileName = "all_stops_cache.json"
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
        } else if let cached = Self.loadCachedStops() {
            stops = cached
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
        guard let fetched = await fetchStops() else { return }
        Task.detached(priority: .utility) {
            Self.saveCachedStops(fetched)
        }
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
