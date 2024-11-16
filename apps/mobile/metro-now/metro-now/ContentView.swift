// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct ContentView: View {
    @StateObject private var viewModel = DepartureViewModel()

    var body: some View {
        if viewModel.metroStops != nil || viewModel.allStops != nil {
            NavigationStack {
                List {
                    if let closestMetroStop = viewModel.closestMetroStop {
                        Section(header: Text("Metro")) {
                            ClosestMetroStopSectionView(
                                closestStop: closestMetroStop,
                                departures: viewModel.departures
                            )
                        }
                    }

                    if let closestStop = viewModel.closestStop {
                        let platforms = closestStop.platforms
                            .filter { platform in
                                platform.routes
                                    .contains(
                                        where: {
                                            !["A", "B", "C"].contains(
                                                $0.name.uppercased()
                                            )
                                        }
                                    )
                            }
                            .sorted(by: {
                                getPlatformLabel($0) < getPlatformLabel($1)
                            })

                        ForEach(platforms, id: \.id) {
                            platform in

                            PlatformSectionView(
                                platform: platform,
                                departures: viewModel.departures
                            )
                        }
                    }
                }
                .navigationTitle(viewModel.closestMetroStop?.name ?? "")
            }
        } else {
            ProgressView()
        }
    }
}

#Preview {
    ContentView()
}
