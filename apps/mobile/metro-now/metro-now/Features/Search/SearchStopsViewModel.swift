// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
import Foundation

@MainActor
final class SearchStopsViewModel: ObservableObject {
    typealias SearchStopsFetcher = @Sendable (
        _ query: String,
        _ coordinate: CLLocationCoordinate2D?,
        _ limit: Int
    ) async throws -> [ApiStop]

    @Published private(set) var stops: [ApiStop] = []
    @Published private(set) var isLoading = false
    @Published private(set) var errorMessage: String?

    private var searchTask: Task<Void, Never>?
    private var currentQuery = ""

    private let resultLimit = 50
    private let searchDelay: Duration
    private let searchStopsFetcher: SearchStopsFetcher

    init(
        searchDelay: Duration = .milliseconds(300),
        searchStopsFetcher: @escaping SearchStopsFetcher = defaultSearchStopsFetcher
    ) {
        self.searchDelay = searchDelay
        self.searchStopsFetcher = searchStopsFetcher
    }

    deinit {
        searchTask?.cancel()
    }

    func updateSearch(query: String, coordinate: CLLocationCoordinate2D? = nil) {
        let normalizedQuery = query.trimmingCharacters(in: .whitespacesAndNewlines)
        let resultLimit = resultLimit

        currentQuery = normalizedQuery
        searchTask?.cancel()

        guard !normalizedQuery.isEmpty else {
            stops = []
            isLoading = false
            errorMessage = nil
            return
        }

        searchTask = Task { [weak self] in
            do {
                try await Task.sleep(for: searchDelay)

                guard let self, !Task.isCancelled else {
                    return
                }

                setLoadingState()
                let response = try await searchStopsFetcher(
                    normalizedQuery,
                    coordinate,
                    resultLimit
                )

                guard !Task.isCancelled else {
                    return
                }

                applyResponse(response, for: normalizedQuery)
            } catch is CancellationError {
                return
            } catch {
                guard let self, !Task.isCancelled else {
                    return
                }

                applyError(error, for: normalizedQuery)
            }
        }
    }

    private func setLoadingState() {
        isLoading = true
        errorMessage = nil
    }

    private func applyResponse(_ stops: [ApiStop], for query: String) {
        guard currentQuery == query else {
            return
        }

        self.stops = stops
        isLoading = false
        errorMessage = nil
    }

    private func applyError(_ error: Error, for query: String) {
        guard currentQuery == query else {
            return
        }

        stops = []
        isLoading = false
        errorMessage = error.localizedDescription
    }

    private static func defaultSearchStopsFetcher(
        query: String,
        coordinate: CLLocationCoordinate2D?,
        limit: Int
    ) async throws -> [ApiStop] {
        let latitude: GraphQLNullable<Double> = coordinate.map { .some($0.latitude) } ?? .none
        let longitude: GraphQLNullable<Double> = coordinate.map { .some($0.longitude) } ?? .none

        let response = try await fetchGraphQLQuery(
            MetroNowAPI.SearchOtherStopsQuery(
                query: query,
                limit: Int32(limit),
                latitude: latitude,
                longitude: longitude
            )
        )

        return response.searchStops.map { stop in
            ApiStop(
                id: stop.id,
                name: stop.name,
                avgLatitude: stop.avgLatitude,
                avgLongitude: stop.avgLongitude,
                entrances: stop.entrances.map { entrance in
                    ApiStopEntrance(
                        id: entrance.id,
                        name: entrance.name,
                        latitude: entrance.latitude,
                        longitude: entrance.longitude
                    )
                },
                platforms: stop.platforms.map { platform in
                    ApiPlatform(
                        id: platform.id,
                        latitude: platform.latitude,
                        longitude: platform.longitude,
                        name: platform.name,
                        code: platform.code,
                        isMetro: platform.isMetro,
                        routes: platform.routes.map { route in
                            ApiRoute(
                                id: route.id,
                                name: route.name ?? route.id,
                                color: route.color,
                                feed: route.feed.value?.rawValue,
                                vehicleType: route.vehicleType.value?.rawValue,
                                isNight: route.isNight
                            )
                        }
                    )
                }
            )
        }
    }
}
