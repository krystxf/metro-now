// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
import Foundation
import UIKit

struct FlatRoutePolyline: Identifiable {
    let id: String
    let coordinates: [CLLocationCoordinate2D]
    let color: UIColor
    let isMetro: Bool
}

@MainActor
final class MetroMapViewModel: ObservableObject {
    @Published private(set) var isLoading = false
    @Published private(set) var routeDetailsById: [String: ApiRouteDetail] = [:]

    private var lastLoadedRouteIds: [String] = []

    var routes: [ApiRouteDetail] {
        routeDetailsById.values.sorted { left, right in
            left.shortName.localizedCompare(right.shortName) == .orderedAscending
        }
    }

    func loadRoutes(routeIds: [String]) async {
        let normalizedRouteIds = Array(Set(routeIds.map(normalizeRouteId))).sorted()
        print("[map-debug] loadRoutes called with \(routeIds.count) ids -> normalized \(normalizedRouteIds)")

        if normalizedRouteIds.isEmpty {
            lastLoadedRouteIds = []
            routeDetailsById = [:]
            return
        }

        if normalizedRouteIds == lastLoadedRouteIds,
           routeDetailsById.count == normalizedRouteIds.count
        {
            return
        }

        isLoading = true

        var fetchedRouteDetails: [String: ApiRouteDetail] = [:]

        await withTaskGroup(of: (String, ApiRouteDetail?).self) { group in
            for routeId in normalizedRouteIds {
                group.addTask {
                    do {
                        let result = try await fetchGraphQLQuery(
                            MetroNowAPI.RouteDetailQuery(id: routeId),
                            cachePolicy: .networkFirst
                        )

                        guard let route = result.route else {
                            return (routeId, nil)
                        }

                        return (routeId, mapGraphQLRouteDetail(route))
                    } catch {
                        print("Error fetching route via GraphQL for map: \(routeId), \(error)")
                        return (routeId, nil)
                    }
                }
            }

            for await (routeId, routeDetail) in group {
                guard let routeDetail else {
                    continue
                }

                fetchedRouteDetails[routeId] = routeDetail
            }
        }

        guard !Task.isCancelled else {
            isLoading = false
            return
        }

        lastLoadedRouteIds = normalizedRouteIds
        routeDetailsById = fetchedRouteDetails
        print("[map-debug] loadRoutes done: fetched \(fetchedRouteDetails.count) routes; shapeCounts=\(fetchedRouteDetails.mapValues { $0.shapes.count })")
        isLoading = false
    }

    private func normalizeRouteId(_ routeId: String) -> String {
        routeId.hasPrefix("L") ? routeId : "L\(routeId)"
    }
}
