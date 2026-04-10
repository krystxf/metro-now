// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct FavoritesPageView: View {
    @EnvironmentObject var stopsViewModel: StopsViewModel
    @EnvironmentObject var favoritesViewModel: FavoritesViewModel

    private var favoriteStops: [ApiStop] {
        guard let stops = stopsViewModel.stops else { return [] }
        return favoritesViewModel.favoriteStopIds.compactMap { id in
            stops.first { $0.id == id }
        }
    }

    var body: some View {
        Group {
            if stopsViewModel.stops == nil {
                ProgressView()
            } else if favoriteStops.isEmpty {
                ContentUnavailableView(
                    "No Favorites",
                    systemImage: "star",
                    description: Text("Stops you mark as favorite will appear here.")
                )
            } else {
                List {
                    ForEach(favoriteStops, id: \.id) { stop in
                        NavigationLink {
                            SearchStopDetailView(
                                stop: stop,
                                viewModel: SearchPageDetailViewModel(
                                    platformIds: stop.platforms.map(\.id)
                                )
                            )
                        } label: {
                            let routes = stop.platforms.flatMap(\.routes)
                            SearchPageItemView(
                                label: stop.name,
                                routeNames: routes.map(\.name)
                            )
                        }
                    }
                    .onDelete { indexSet in
                        for index in indexSet {
                            let stop = favoriteStops[index]
                            favoritesViewModel.removeFavorite(stop.id)
                        }
                    }
                }
            }
        }
        .navigationTitle("Favorites")
    }
}
