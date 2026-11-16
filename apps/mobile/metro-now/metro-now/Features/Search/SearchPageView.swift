// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
import Foundation
import SwiftUI

private enum SearchPageTab: String, CaseIterable, Identifiable {
    case metro
    case other

    var id: Self {
        self
    }

    var title: String {
        switch self {
        case .metro:
            "Metro"
        case .other:
            "Other"
        }
    }
}

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
    @EnvironmentObject private var appNavigation: AppNavigationViewModel
    @EnvironmentObject var stopsViewModel: StopsViewModel

    @State private var searchText = ""
    @StateObject private var otherStopsViewModel = SearchPageOtherStopsViewModel()

    @State private var selectedTab: SearchPageTab = .metro
    @State private var sorting: SearchPageSorting = .alphabetical

    var metroStops: [ApiStop]? {
        stopsViewModel.stops?.map {
            stop in
            ApiStop(
                id: stop.id,
                name: stop.name,
                avgLatitude: stop.avgLatitude,
                avgLongitude: stop.avgLongitude,
                entrances: stop.entrances,
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

    private var normalizedSearchText: String {
        searchText.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var filteredMetroStops: [ApiStop] {
        guard let metroStops else {
            return []
        }

        let normalizedQuery = normalizeForSearch(searchText)

        guard !normalizedQuery.isEmpty else {
            return metroStops
        }

        let scoredStops: [(stop: ApiStop, score: SearchMatchScore)] = metroStops
            .compactMap { stop -> (stop: ApiStop, score: SearchMatchScore)? in
                guard let score = searchScore(query: searchText, stop: stop) else {
                    return nil
                }

                return (stop: stop, score: score)
            }
            .sorted { left, right in
                if left.score != right.score {
                    return left.score < right.score
                }

                return left.stop.name.localizedCaseInsensitiveCompare(right.stop.name) == .orderedAscending
            }

        return scoredStops.map(\.stop)
    }

    private var otherStops: [ApiStop] {
        guard !normalizedSearchText.isEmpty else {
            return []
        }

        return otherStopsViewModel.stops.filter { stop in
            stop.platforms.contains { platform in
                !platform.isMetro
            }
        }
    }

    private func openStopOnMap(_ stop: ApiStop) {
        appNavigation.openMap(for: stop)
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("Network", selection: $selectedTab) {
                    ForEach(SearchPageTab.allCases) { tab in
                        Text(tab.title).tag(tab)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)
                .padding(.top, 8)
                .padding(.bottom, 4)

                switch selectedTab {
                case .metro:
                    if let metroStops {
                        List {
                            if searchText.isEmpty {
                                if sorting == .distance, let location {
                                    let sortedStops = filteredMetroStops.sorted(by: {
                                        getStopDistance(location, $0) < getStopDistance(location, $1)
                                    })

                                    SearchPageResults(
                                        stops: sortedStops,
                                        onSelect: openStopOnMap
                                    )
                                } else {
                                    SearchPageAllStopsListView(
                                        stops: metroStops,
                                        onSelect: openStopOnMap
                                    )
                                }
                            } else {
                                Section(header: Text("Search results")) {
                                    SearchPageResults(
                                        stops: filteredMetroStops,
                                        onSelect: openStopOnMap
                                    )
                                }
                            }
                        }
                    } else {
                        ProgressView()
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    }
                case .other:
                    if normalizedSearchText.isEmpty {
                        ContentUnavailableView(
                            "Search Other Stops",
                            systemImage: "tram.fill",
                            description: Text("Type a stop name to search tram, bus, train, and ferry stops.")
                        )
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else if otherStopsViewModel.isLoading, otherStops.isEmpty {
                        ProgressView("Searching stops")
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else if let errorMessage = otherStopsViewModel.errorMessage,
                              otherStops.isEmpty
                    {
                        ContentUnavailableView(
                            "Couldn’t Load Stops",
                            systemImage: "wifi.exclamationmark",
                            description: Text(errorMessage)
                        )
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else if otherStops.isEmpty {
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
                                    stops: otherStops,
                                    onSelect: openStopOnMap
                                )
                            }
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
                if selectedTab == .metro, location != nil {
                    ToolbarItem(placement: .topBarLeading) {
                        SearchPageSortingMenuView(
                            sorting: $sorting
                        )
                    }
                }
            }
            .onChange(of: selectedTab) { _, newTab in
                guard newTab == .other else {
                    return
                }

                otherStopsViewModel.updateSearch(query: searchText)
            }
            .onChange(of: searchText) { _, newValue in
                guard selectedTab == .other else {
                    return
                }

                otherStopsViewModel.updateSearch(query: newValue)
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
