// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
import Foundation
import UIKit

struct FlatRoutePolyline: Identifiable {
    let id: String
    let coordinates: [CLLocationCoordinate2D]
    let color: UIColor
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
                    let request = apiSession.request(
                        "\(API_URL)/v1/route/\(routeId)",
                        method: .get
                    )

                    let routeDetail = try? await fetchData(request, ofType: ApiRouteDetail.self)

                    return (routeId, routeDetail)
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
        isLoading = false
    }

    private func normalizeRouteId(_ routeId: String) -> String {
        routeId.hasPrefix("L") ? routeId : "L\(routeId)"
    }
}
