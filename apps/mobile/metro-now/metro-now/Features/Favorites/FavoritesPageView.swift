// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
import SwiftUI

enum FavoritesSortOrder: String {
    case name
    case distance
}

struct FavoritesPageView: View {
    @EnvironmentObject var stopsViewModel: StopsViewModel
    @EnvironmentObject var favoritesViewModel: FavoritesViewModel
    @EnvironmentObject private var appNavigation: AppNavigationViewModel
    @EnvironmentObject private var locationModel: LocationViewModel

    @AppStorage(AppStorageKeys.favoritesSortOrder.rawValue)
    private var sortOrderRaw: String = FavoritesSortOrder.name.rawValue

    private var sortOrder: FavoritesSortOrder {
        FavoritesSortOrder(rawValue: sortOrderRaw) ?? .name
    }

    private var favoriteStops: [ApiStop] {
        guard let stops = stopsViewModel.stops else { return [] }
        let favorites = favoritesViewModel.favoriteStopIds.compactMap { id in
            stops.first { $0.id == id }
        }
        switch sortOrder {
        case .name:
            return favorites.sorted { $0.name < $1.name }
        case .distance:
            guard let location = locationModel.location else {
                return favorites.sorted { $0.name < $1.name }
            }
            return favorites.sorted { $0.distance(to: location) < $1.distance(to: location) }
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
                            FavoriteStopRowView(stop: stop)
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
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button {
                        sortOrderRaw = FavoritesSortOrder.name.rawValue
                    } label: {
                        Label("Sort by Name", systemImage: sortOrder == .name ? "checkmark" : "textformat")
                    }
                    Button {
                        sortOrderRaw = FavoritesSortOrder.distance.rawValue
                    } label: {
                        Label("Sort by Distance", systemImage: sortOrder == .distance ? "checkmark" : "location")
                    }
                } label: {
                    Image(systemName: "arrow.up.arrow.down")
                }
            }
        }
    }
}

#Preview("With favorites") {
    PreviewNavigationContainer {
        FavoritesPageView()
    }
    .environmentObject(StopsViewModel(previewStops: PreviewData.stops))
    .environmentObject(FavoritesViewModel(previewFavoriteStopIds: [PreviewData.metroStop.id]))
    .environmentObject(AppNavigationViewModel())
    .environmentObject(LocationViewModel(previewLocation: PreviewData.userLocation))
}

#Preview("Empty") {
    PreviewNavigationContainer {
        FavoritesPageView()
    }
    .environmentObject(StopsViewModel(previewStops: PreviewData.stops))
    .environmentObject(FavoritesViewModel(previewFavoriteStopIds: []))
    .environmentObject(AppNavigationViewModel())
    .environmentObject(LocationViewModel(previewLocation: nil))
}
