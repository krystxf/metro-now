// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct SearchPageItemView: View {
    let label: String
    let routeNames: [String]

    init(label: String, routeNames: [String]) {
        self.label = label

        let uniqueRoutes = uniqueBy(array: routeNames, by: \.self).sorted()
        let limitedRoutes = uniqueRoutes[..<min(uniqueRoutes.count, 2)]
        self.routeNames = Array(limitedRoutes)
    }

    var body: some View {
        HStack {
            ForEach(routeNames, id: \.self) { route in
                RouteNameIconView(
                    label: route,
                    background: getRouteColor(route)
                )
            }
            Text(label)
        }
    }
}
