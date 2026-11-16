// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct FavoritesPageView: View {
    @EnvironmentObject var stopsViewModel: StopsViewModel
    @EnvironmentObject var favoritesViewModel: FavoritesViewModel
    @EnvironmentObject private var appNavigation: AppNavigationViewModel

    private var favoriteStops: [ApiStop] {
        guard let stops = stopsViewModel.stops else { return [] }
        return favoritesViewModel.favoriteStopIds.compactMap { id in
            stops.first { $0.id == id }
        }
    }

    private func openStopOnMap(_ stop: ApiStop) {
        appNavigation.openMap(for: stop)
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
                        Button {
                            openStopOnMap(stop)
                        } label: {
                            let routes = stop.platforms.flatMap(\.routes)
                            SearchPageItemView(
                                label: stop.name,
                                routes: routes
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

#Preview("With favorites") {
    PreviewNavigationContainer {
        FavoritesPageView()
    }
    .environmentObject(StopsViewModel(previewStops: PreviewData.stops))
    .environmentObject(FavoritesViewModel(previewFavoriteStopIds: [PreviewData.metroStop.id]))
    .environmentObject(AppNavigationViewModel())
}

#Preview("Empty") {
    PreviewNavigationContainer {
        FavoritesPageView()
    }
    .environmentObject(StopsViewModel(previewStops: PreviewData.stops))
    .environmentObject(FavoritesViewModel(previewFavoriteStopIds: []))
    .environmentObject(AppNavigationViewModel())
}
