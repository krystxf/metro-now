// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct MetroLineStopsView: View {
    private let route: ApiRoute
    private let stops: [ApiStop]

    init(stops: [ApiStop], route: ApiRoute) {
        self.route = route
        self.stops = stops.filter { stop in
            let stopRoutes = stop.platforms.flatMap { platform in
                platform.routes
            }

            return stopRoutes.contains(where: { $0.id == route.id })
        }.sorted(by: { $0.name < $1.name })
    }

    var body: some View {
        ForEach(stops, id: \.id) { stop in
            let routes = uniqueBy(
                array: stop.platforms.flatMap(\.routes),
                by: { $0.id }
            )

            HStack {
                ForEach(routes, id: \.id) { route in
                    RouteNameIconView(
                        label: route.name,
                        background: getRouteColor(route.name)
                    )
                }
                Text(stop.name)
            }
        }
    }
}
