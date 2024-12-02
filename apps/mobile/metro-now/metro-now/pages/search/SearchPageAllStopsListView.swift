// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct SearchPageAllStopsListView: View {
    let stops: [ApiStop]

    var transferStops: [ApiStop] {
        stops.filter { stop in
            stop.platforms.count > 2
        }
    }

    var body: some View {
        Section(header: Text("Transfer stations")) {
            ForEach(transferStops, id: \.id) { stop in
                SearchPageItemView(
                    label: stop.name,
                    routeNames: stop.platforms
                        .flatMap(\.routes)
                        .map(\.name)
                )
            }
        }

        ForEach(["A", "B", "C"], id: \.self) { metroLine in
            let metroLineStops = stops.filter { stop in
                stop.platforms.flatMap(\.routes).contains(where: { $0.name == metroLine })
            }

            Section(header: Text(metroLine)) {
                ForEach(metroLineStops, id: \.id) { stop in
                    let routes = stop.platforms.flatMap(\.routes)

                    SearchPageItemView(
                        label: stop.name,
                        routeNames: routes.map(\.name)
                    )
                }
            }
        }
    }
}
