// metro-now
// https://github.com/krystxf/metro-now


import SwiftUI

struct ClosestStopListView: View {
    @StateObject private var viewModel = ClosestStopListViewModel()

    var body: some View {
        VStack {
            if let closestStop = viewModel.closestStop {
                let platforms = closestStop.platforms.filter { $0.routes.count > 0 }

                StopDeparturesView(
                    title: closestStop.name,
                    platforms: platforms.map { platform in
                        let metroLine = MetroLine(rawValue: platform.routes[0].name)

                        return MainPagePlatform(
                            id: platform.id,
                            metroLine: metroLine,
                            departures: viewModel.departures?.filter { departure in
                                departure.platformId == platform.id
                            }
                        )
                    }
                )
            } else {
                ProgressView()
            }
        }
    }
}
