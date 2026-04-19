// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct MapStopDetailSheet: View {
    let stop: ApiStop
    let allStops: [ApiStop]?
    @ObservedObject var favoritesViewModel: FavoritesViewModel

    private var originalStopId: String {
        allStops?.first { original in
            stop.platforms.contains { platform in
                original.platforms.contains { $0.id == platform.id }
            }
        }?.id ?? stop.id
    }

    var body: some View {
        NavigationView {
            SearchStopDetailView(
                stop: stop,
                showsDistanceFromUser: true,
                viewModel: SearchPageDetailViewModel(
                    platformIds: stop.platforms.map(\.id)
                )
            )
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        favoritesViewModel.toggleFavorite(originalStopId)
                    } label: {
                        Image(
                            systemName: favoritesViewModel.isFavorite(originalStopId)
                                ? "star.fill"
                                : "star"
                        )
                        .foregroundStyle(
                            favoritesViewModel.isFavorite(originalStopId)
                                ? .yellow
                                : .gray
                        )
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
}

#Preview {
    @Previewable @StateObject var favoritesViewModel = FavoritesViewModel(
        previewFavoriteStopIds: [PreviewData.metroStop.id]
    )

    MapStopDetailSheet(
        stop: PreviewData.transferStop,
        allStops: PreviewData.stops,
        favoritesViewModel: favoritesViewModel
    )
    .environmentObject(
        LocationViewModel(previewLocation: PreviewData.userLocation)
    )
}
