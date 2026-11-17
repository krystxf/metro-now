// metro-now
// https://github.com/krystxf/metro-now

import Foundation

extension SearchPageView {
    func stopMatchesSelectedVehicleType(_ stop: ApiStop) -> Bool {
        guard !isAllFilterSelected else {
            return true
        }

        return stop.platforms.contains { platform in
            if vehicleTypeFilter == .metro, platform.isMetro {
                return true
            }

            return platform.routes.contains { route in
                vehicleTypeFilter.matches(route: route)
            }
        }
    }

    func filteredRoutes(for stop: ApiStop) -> [ApiRoute] {
        let routes = stop.platforms.flatMap(\.routes)

        guard !isAllFilterSelected else {
            return routes
        }

        let filteredRoutes = routes.filter { route in
            vehicleTypeFilter.matches(route: route)
        }

        return filteredRoutes.isEmpty ? routes : filteredRoutes
    }

    func openStopOnMap(_ stop: ApiStop) {
        appNavigation.openMap(for: stop)
    }

    func fetchNearbyStops() async {
        guard let location = locationModel.location else { return }

        do {
            let response = try await fetchGraphQLQuery(
                MetroNowAPI.ClosestStopsQuery(
                    latitude: location.coordinate.latitude,
                    longitude: location.coordinate.longitude,
                    limit: .some(20)
                )
            )

            nearbyStops = response.closestStops.map { mapGraphQLClosestStop($0) }
            hasFetchedNearby = true
        } catch {
            print("Error fetching nearby stops: \(error)")
        }
    }
}
