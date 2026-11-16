// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

private let REFETCH_INTERVAL: TimeInterval = 10 // seconds
private let SECONDS_BEFORE: TimeInterval = 3 // how many seconds after departure will it still be visible

class SearchPageDetailViewModel: NSObject, ObservableObject {
    let platformIds: [String]

    @Published var departures: [ApiDeparture]?

    private var refreshTimer: Timer?

    init(
        platformIds: [String],
        initialDepartures: [ApiDeparture]? = nil,
        shouldRefresh: Bool = true
    ) {
        self.platformIds = platformIds
        departures = initialDepartures
        super.init()

        guard shouldRefresh else {
            return
        }

        refresh()
        startPeriodicRefresh()
    }

    deinit {
        stopPeriodicRefresh()
    }

    func refresh() {
        getDepartures(
            stopsIds: [],
            platformsIds: platformIds
        )
    }

    private func startPeriodicRefresh() {
        stopPeriodicRefresh() // Stop any existing timer to avoid duplication.
        refreshTimer = Timer.scheduledTimer(
            withTimeInterval: REFETCH_INTERVAL,
            repeats: true
        ) { [weak self] _ in
            guard
                let self
            else {
                return
            }

            getDepartures(
                stopsIds: [],
                platformsIds: platformIds
            )
        }
    }

    private func stopPeriodicRefresh() {
        refreshTimer?.invalidate()
        refreshTimer = nil
    }

    private func getDepartures(
        stopsIds: [String],
        platformsIds: [String]
    ) {
        Task {
            do {
                let response = try await fetchGraphQLQuery(
                    MetroNowAPI.DeparturesQuery(
                        stopIds: .some(stopsIds),
                        platformIds: .some(platformsIds),
                        limit: .some(10),
                        metroOnly: .none,
                        minutesBefore: .some(1),
                        minutesAfter: .some(Int32(6 * 60))
                    )
                )

                let fetchedDepartures = response.departures.compactMap {
                    mapGraphQLDeparture($0)
                }

                await MainActor.run {
                    if let oldDepartures = self.departures {
                        let oldStuff = oldDepartures.filter { oldDeparture in
                            !fetchedDepartures.contains(where: { fetchedDeparture in
                                fetchedDeparture.id == oldDeparture.id
                            })
                        }
                        self.departures = uniqueBy(
                            array: oldStuff + fetchedDepartures,
                            by: \.id
                        )
                        .filter {
                            $0.departure.predicted > Date.now - SECONDS_BEFORE
                        }
                        .sorted(by: {
                            $0.departure.scheduled < $1.departure.scheduled
                        })
                    } else {
                        self.departures = fetchedDepartures
                    }

                    print("Fetched \(fetchedDepartures.count) departures")
                }
            } catch {
                print("Error fetching departures: \(error)")
            }
        }
    }
}
