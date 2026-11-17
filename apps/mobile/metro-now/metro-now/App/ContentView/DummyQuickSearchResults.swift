// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct DummyQuickSearchResults: View {
    let query: String
    let nearestStops: [ApiStop]
    @ObservedObject var searchViewModel: SearchStopsViewModel
    let onSelect: (ApiStop) -> Void

    private var normalizedQuery: String {
        query.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    var body: some View {
        if normalizedQuery.isEmpty {
            emptyQueryContent
        } else if searchViewModel.isLoading, searchViewModel.stops.isEmpty {
            ProgressView("Searching stops")
                .frame(maxWidth: .infinity)
                .frame(height: 140)
        } else if let errorMessage = searchViewModel.errorMessage,
                  searchViewModel.stops.isEmpty
        {
            ContentUnavailableView(
                "Couldn’t Load Stops",
                systemImage: "wifi.exclamationmark",
                description: Text(errorMessage)
            )
            .frame(maxWidth: .infinity)
            .frame(height: 180)
        } else if searchViewModel.stops.isEmpty {
            ContentUnavailableView(
                "No Stops Found",
                systemImage: "magnifyingglass",
                description: Text("Try a different stop name.")
            )
            .frame(maxWidth: .infinity)
            .frame(height: 180)
        } else {
            ScrollView {
                LazyVStack(spacing: 0) {
                    ForEach(searchViewModel.stops, id: \.id) { stop in
                        DummyQuickSearchResultRow(
                            stop: stop,
                            isLast: stop.id == searchViewModel.stops.last?.id,
                            onSelect: onSelect
                        )
                    }
                }
            }
            .frame(maxHeight: 320)
        }
    }

    @ViewBuilder
    private var emptyQueryContent: some View {
        if nearestStops.isEmpty {
            ContentUnavailableView(
                "Search Stops",
                systemImage: "magnifyingglass",
                description: Text("Type a stop name to search.")
            )
            .frame(maxWidth: .infinity)
            .frame(height: 180)
        } else {
            LazyVStack(spacing: 0) {
                ForEach(nearestStops, id: \.id) { stop in
                    DummyQuickSearchResultRow(
                        stop: stop,
                        isLast: stop.id == nearestStops.last?.id,
                        onSelect: onSelect
                    )
                }
            }
        }
    }
}
