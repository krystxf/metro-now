// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
import Foundation
import SwiftUI

struct SearchPageView: View {
    @Environment(\.dismiss) private var dismiss
    let location: CLLocation?
    @EnvironmentObject var stopsViewModel: StopsViewModel

    @State private var searchText = ""

    @State private var sorting: SearchPageSorting = .alphabetical
    @State private var stopId: String?

    var metroStops: [ApiStop]? {
        stopsViewModel.stops?.map {
            stop in
            ApiStop(
                id: stop.id,
                name: stop.name,
                avgLatitude: stop.avgLatitude,
                avgLongitude: stop.avgLongitude,
                platforms: stop.platforms.map {
                    platform in
                    ApiPlatform(
                        id: platform.id,
                        latitude: platform.latitude,
                        longitude: platform.longitude,
                        name: platform.name,
                        code: platform.code,
                        isMetro: platform.isMetro,
                        routes: platform.routes.filter { route in
                            isMetro(route.name)
                        }
                    )
                }
                .filter(\.isMetro)
            )
        }.filter {
            $0.platforms.count > 0
        }
    }

    var body: some View {
        NavigationSplitView {
            if let stops = metroStops {
                let filteredStops = stops.filter { stop in
                    normalizeForSearch(searchText).isEmpty
                        || normalizeForSearch(stop.name).contains(normalizeForSearch(searchText))
                }

                List(selection: $stopId) {
                    if searchText.isEmpty {
                        if sorting == .distance, let location {
                            let sortedStops = filteredStops.sorted(by: {
                                getStopDistance(location, $0) < getStopDistance(location, $1)
                            })

                            SearchPageResults(stops: sortedStops)
                        } else {
                            SearchPageAllStopsListView(stops: stops)
                        }
                    } else {
                        Section(header: Text("Search results")) {
                            SearchPageResults(stops: filteredStops)
                        }
                    }
                }
                .navigationTitle("Search")
                .navigationBarTitleDisplayMode(.inline)
                .searchable(
                    text: $searchText,
                    placement: .navigationBarDrawer(displayMode: .always)
                )
                .toolbar {
                    if location != nil {
                        ToolbarItem(placement: .topBarLeading) {
                            SearchPageSortingMenuView(
                                sorting: $sorting
                            )
                        }
                    }

                    ToolbarItem(placement: .topBarTrailing) {
                        Button {
                            dismiss()
                        } label: {
                            Label("Close", systemImage: "xmark")
                        }
                    }
                }
            }

        } detail: {
            if let stop = metroStops?.first(where: { $0.id == stopId }) {
                SearchStopDetailView(
                    stop: stop,
                    viewModel: SearchPageDetailViewModel(stopId: stop.id)
                )
            }
        }
    }
}

#Preview {
    let stopsViewModel = StopsViewModel()

    SearchPageView(
        location: CLLocation(
            latitude: 50.079056991752765,
            longitude: 14.430325878718339
        )
    )
    .environmentObject(stopsViewModel)
}

#Preview {
    let stopsViewModel = StopsViewModel()

    SearchPageView(
        location: nil
    )
    .environmentObject(stopsViewModel)
}
