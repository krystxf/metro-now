// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

@MainActor
class RoutePreviewViewModel: ObservableObject {
    @Published var routeId: String
    @Published var data: ApiRouteDetail?
    @Published var errorMessage: String?

    init(routeId: String) {
        self.routeId = routeId
        Task {
            await fetchRoute(routeId: routeId)
        }
    }

    private func fetchRoute(routeId: String) async {
        do {
            let result = try await fetchGraphQLQuery(
                MetroNowAPI.RouteDetailQuery(id: routeId),
                cachePolicy: .networkFirst
            )

            guard let route = result.route else {
                errorMessage = "Route not found"
                return
            }

            data = mapGraphQLRouteDetail(route)
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
            print("Error fetching route via GraphQL: \(error)")
        }
    }
}
