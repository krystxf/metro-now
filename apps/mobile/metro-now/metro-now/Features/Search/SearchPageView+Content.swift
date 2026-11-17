// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

extension SearchPageView {
    @ViewBuilder
    var contentView: some View {
        if normalizedSearchText.isEmpty {
            emptySearchContent
        } else if otherStopsViewModel.isLoading, searchResults.isEmpty {
            ProgressView("Searching stops")
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if let errorMessage = otherStopsViewModel.errorMessage,
                  searchResults.isEmpty
        {
            ContentUnavailableView(
                "Couldn’t Load Stops",
                systemImage: "wifi.exclamationmark",
                description: Text(errorMessage)
            )
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if searchResults.isEmpty {
            ContentUnavailableView(
                "No Stops Found",
                systemImage: "magnifyingglass",
                description: Text("Try a different stop name.")
            )
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else {
            List {
                Section(header: Text("Search results")) {
                    SearchPageResults(
                        stops: searchResults,
                        onSelect: openStopOnMap,
                        visibleRoutesForStop: filteredRoutes(for:)
                    )
                }
            }
        }
    }

    @ViewBuilder
    private var emptySearchContent: some View {
        if nearbyStops != nil, !filteredNearbyStops.isEmpty {
            List {
                Section(header: Text("Nearby")) {
                    SearchPageResults(
                        stops: filteredNearbyStops,
                        onSelect: openStopOnMap,
                        visibleRoutesForStop: filteredRoutes(for:)
                    )
                }
            }
        } else if !hasFetchedNearby, locationModel.location != nil {
            ProgressView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else {
            SearchPageEmptyStateView(vehicleTypeFilter: vehicleTypeFilter)
        }
    }

    @ToolbarContentBuilder
    var toolbarContent: some ToolbarContent {
        ToolbarItem(placement: .topBarLeading) {
            SearchPageFilterMenuView(vehicleTypeFilter: $vehicleTypeFilter)
        }

        if showsCloseButton {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    dismiss()
                } label: {
                    Label("Close", systemImage: "xmark")
                }
                .accessibilityIdentifier("button.close-search")
            }
        }
    }
}
