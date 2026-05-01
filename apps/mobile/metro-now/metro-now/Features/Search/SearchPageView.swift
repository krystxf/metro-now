// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
import Foundation
import SwiftUI

struct SearchPageView: View {
    let showsCloseButton: Bool
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var appNavigation: AppNavigationViewModel
    @EnvironmentObject var locationModel: LocationViewModel
    @EnvironmentObject var stopsViewModel: StopsViewModel

    @State var searchText = ""
    @StateObject var otherStopsViewModel = SearchStopsViewModel()

    @State var vehicleTypeFilter: SearchPageVehicleTypeFilter = .all

    @State var nearbyStops: [ApiStop]?
    @State var hasFetchedNearby = false

    init(showsCloseButton: Bool = false) {
        self.showsCloseButton = showsCloseButton
    }

    var normalizedSearchText: String {
        searchText.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    var isAllFilterSelected: Bool {
        vehicleTypeFilter == .all
    }

    var searchResults: [ApiStop] {
        guard !normalizedSearchText.isEmpty else { return [] }
        return otherStopsViewModel.stops.filter(stopMatchesSelectedVehicleType)
    }

    var filteredNearbyStops: [ApiStop] {
        guard let nearbyStops else { return [] }
        return nearbyStops.filter(stopMatchesSelectedVehicleType)
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                contentView
            }
            .navigationTitle("Search")
            .navigationBarTitleDisplayMode(.inline)
            .searchable(
                text: $searchText,
                placement: .navigationBarDrawer(displayMode: .always)
            )
            .toolbar { toolbarContent }
            .onChange(of: searchText) { _, newValue in
                otherStopsViewModel.updateSearch(
                    query: newValue,
                    coordinate: locationModel.location?.coordinate
                )
            }
            .task(id: locationModel.location?.coordinate.latitude) {
                await fetchNearbyStops()
            }
        }
    }
}

#Preview {
    SearchPageView()
        .environmentObject(AppNavigationViewModel())
        .environmentObject(
            LocationViewModel(previewLocation: CLLocation(
                latitude: 50.079056991752765,
                longitude: 14.430325878718339
            ))
        )
        .environmentObject(StopsViewModel())
}

#Preview {
    SearchPageView()
        .environmentObject(AppNavigationViewModel())
        .environmentObject(LocationViewModel(previewLocation: nil))
        .environmentObject(StopsViewModel())
}
