// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct SearchPageItemView: View {
    let label: String
    let routes: [ApiRoute]

    init(label: String, routes: [ApiRoute]) {
        self.label = label

        let uniqueRoutes = uniqueBy(array: routes, by: \.id).sorted {
            $0.name < $1.name
        }
        let limitedRoutes = uniqueRoutes[..<min(uniqueRoutes.count, 2)]
        self.routes = Array(limitedRoutes)
    }

    var body: some View {
        HStack {
            ForEach(routes, id: \.id) { route in
                RouteNameIconView(
                    label: route.name,
                    background: getRouteColor(route)
                )
            }
            Text(label)
        }
    }
}

#Preview {
    List {
        SearchPageItemView(
            label: PreviewData.transferStop.name,
            routes: PreviewData.transferStop.platforms
                .flatMap(\.routes)
        )
        SearchPageItemView(
            label: PreviewData.cityStop.name,
            routes: PreviewData.cityStop.platforms
                .flatMap(\.routes)
        )
    }
}
