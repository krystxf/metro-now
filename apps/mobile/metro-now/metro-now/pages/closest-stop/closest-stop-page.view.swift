// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct ClosestStopPageView: View {
    @StateObject private var viewModel = ClosestStopPageViewModel()

    var body: some View {
        if viewModel.metroStops != nil || viewModel.allStops != nil {
            List {
                if let closestMetroStop = viewModel.closestMetroStop {
                    Section(header: Text("Metro")) {
                        MetroDeparturesListView(
                            closestStop: closestMetroStop,
                            departures: viewModel.departures
                        )
                    }
                }

                if let closestStop = viewModel.closestStop {
                    let platforms = closestStop.platforms
                        .filter { platform in
                            platform.routes.contains(where: {
                                let routeName = $0.name.uppercased()
                                let containsMetro = METRO_LINES.contains(routeName)

                                return !containsMetro
                            })
                        }
                        .sorted(by: {
                            getPlatformLabel($0) < getPlatformLabel($1)
                        })

                    ForEach(platforms, id: \.id) { platform in
                        PlatformDeparturesListView(
                            platform: platform,
                            departures: viewModel.departures
                        )
                    }
                }
            }
            .navigationTitle(viewModel.closestMetroStop?.name ?? "")
        } else {
            ProgressView()
        }
    }
}