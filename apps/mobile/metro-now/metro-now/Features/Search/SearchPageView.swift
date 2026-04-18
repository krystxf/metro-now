// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
import Foundation
import SwiftUI

@MainActor
private final class SearchPageOtherStopsViewModel: ObservableObject {
    @Published private(set) var stops: [ApiStop] = []
    @Published private(set) var isLoading = false
    @Published private(set) var errorMessage: String?

    private var searchTask: Task<Void, Never>?
    private var currentQuery = ""

    private let resultLimit = 50

    deinit {
        searchTask?.cancel()
    }

    func updateSearch(query: String) {
        let normalizedQuery = query.trimmingCharacters(in: .whitespacesAndNewlines)
        let resultLimit = resultLimit

        currentQuery = normalizedQuery
        searchTask?.cancel()

        guard !normalizedQuery.isEmpty else {
            stops = []
            isLoading = false
            errorMessage = nil
            return
        }

        searchTask = Task { [weak self] in
            do {
                try await Task.sleep(nanoseconds: 300_000_000)

                guard let self, !Task.isCancelled else {
                    return
                }

                await setLoadingState()

                let response = try await fetchGraphQLQuery(
                    MetroNowAPI.SearchOtherStopsQuery(
                        query: normalizedQuery,
                        limit: Int32(resultLimit)
                    )
                )

                guard !Task.isCancelled else {
                    return
                }

                await applyResponse(
                    response.searchStops.map { stop in
                        ApiStop(
                            id: stop.id,
                            name: stop.name,
                            avgLatitude: stop.avgLatitude,
                            avgLongitude: stop.avgLongitude,
                            entrances: stop.entrances.map { entrance in
                                ApiStopEntrance(
                                    id: entrance.id,
                                    name: entrance.name,
                                    latitude: entrance.latitude,
                                    longitude: entrance.longitude
                                )
                            },
                            platforms: stop.platforms.map { platform in
                                ApiPlatform(
                                    id: platform.id,
                                    latitude: platform.latitude,
                                    longitude: platform.longitude,
                                    name: platform.name,
                                    code: platform.code,
                                    isMetro: platform.isMetro,
                                    routes: platform.routes.map { route in
                                        ApiRoute(
                                            id: route.id,
                                            name: route.name ?? route.id
                                        )
                                    }
                                )
                            }
                        )
                    },
                    for: normalizedQuery
                )
            } catch is CancellationError {
                return
            } catch {
                guard let self, !Task.isCancelled else {
                    return
                }

                await applyError(error, for: normalizedQuery)
            }
        }
    }

    private func setLoadingState() {
        isLoading = true
        errorMessage = nil
    }

    private func applyResponse(_ stops: [ApiStop], for query: String) {
        guard currentQuery == query else {
            return
        }

        self.stops = stops
        isLoading = false
        errorMessage = nil
    }

    private func applyError(_ error: Error, for query: String) {
        guard currentQuery == query else {
            return
        }

        stops = []
        isLoading = false
        errorMessage = error.localizedDescription
    }
}

struct SearchPageView: View {
    let location: CLLocation?
    let showsCloseButton: Bool
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appNavigation: AppNavigationViewModel
    @EnvironmentObject var stopsViewModel: StopsViewModel

    @State private var searchText = ""
    @StateObject private var otherStopsViewModel = SearchPageOtherStopsViewModel()

    @State private var vehicleTypeFilter: SearchPageVehicleTypeFilter = .all

    @State private var metroStopsCache: [ApiStop]?

    init(location: CLLocation?, showsCloseButton: Bool = false) {
        self.location = location
        self.showsCloseButton = showsCloseButton
    }

    private var isMetroFilterSelected: Bool {
        vehicleTypeFilter == .metro
    }

    private var isAllFilterSelected: Bool {
        vehicleTypeFilter == .all
    }

    private var normalizedSearchText: String {
        searchText.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var searchResults: [ApiStop] {
        guard !normalizedSearchText.isEmpty else { return [] }
        return otherStopsViewModel.stops.filter(stopMatchesSelectedVehicleType)
    }

    private var searchPromptTitle: String {
        "Search \(vehicleTypeFilter.title) Stops"
    }

    private var searchPromptDescription: String {
        if isAllFilterSelected {
            return "Type a stop name to search metro, tram, bus, train, ferry, and funicular stops."
        }

        return "Type a stop name to search \(vehicleTypeFilter.title.lowercased()) stops."
    }

    private func stopMatchesSelectedVehicleType(_ stop: ApiStop) -> Bool {
        guard !isAllFilterSelected else {
            return true
        }

        return stop.platforms.contains { platform in
            if vehicleTypeFilter == .metro, platform.isMetro {
                return true
            }

            return platform.routes.contains { route in
                vehicleTypeFilter.matches(routeName: route.name)
            }
        }
    }

    private func filteredRoutes(for stop: ApiStop) -> [ApiRoute] {
        let routes = stop.platforms.flatMap(\.routes)

        guard !isAllFilterSelected else {
            return routes
        }

        let filteredRoutes = routes.filter { route in
            vehicleTypeFilter.matches(routeName: route.name)
        }

        return filteredRoutes.isEmpty ? routes : filteredRoutes
    }

    private func openStopOnMap(_ stop: ApiStop) {
        appNavigation.openMap(for: stop)
    }

    private func computeMetroStops(from stops: [ApiStop]?) async -> [ApiStop]? {
        guard let stops else { return nil }
        return await Task.detached(priority: .userInitiated) {
            stops.map { stop in
                ApiStop(
                    id: stop.id,
                    name: stop.name,
                    avgLatitude: stop.avgLatitude,
                    avgLongitude: stop.avgLongitude,
                    entrances: stop.entrances,
                    platforms: stop.platforms.map { platform in
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
        }.value
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if normalizedSearchText.isEmpty {
                    if isMetroFilterSelected || isAllFilterSelected {
                        if let metroStops = metroStopsCache {
                            List {
                                SearchPageAllStopsListView(
                                    stops: metroStops,
                                    onSelect: openStopOnMap
                                )
                            }
                        } else {
                            ProgressView()
                                .frame(maxWidth: .infinity, maxHeight: .infinity)
                        }
                    } else {
                        ContentUnavailableView(
                            searchPromptTitle,
                            systemImage: vehicleTypeFilter.systemImage,
                            description: Text(searchPromptDescription)
                        )
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                    }
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
            .navigationTitle("Search")
            .navigationBarTitleDisplayMode(.inline)
            .searchable(
                text: $searchText,
                placement: .navigationBarDrawer(displayMode: .always)
            )
            .toolbar {
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
            .onChange(of: searchText) { _, newValue in
                otherStopsViewModel.updateSearch(query: newValue)
            }
            .task(id: stopsViewModel.stops?.count) {
                metroStopsCache = await computeMetroStops(from: stopsViewModel.stops)
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
    .environmentObject(AppNavigationViewModel())
    .environmentObject(stopsViewModel)
}

#Preview {
    let stopsViewModel = StopsViewModel()

    SearchPageView(
        location: nil
    )
    .environmentObject(AppNavigationViewModel())
    .environmentObject(stopsViewModel)
}
