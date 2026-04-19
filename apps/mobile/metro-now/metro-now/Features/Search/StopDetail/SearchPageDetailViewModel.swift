// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

private let REFETCH_INTERVAL: TimeInterval = 10 // seconds
private let SECONDS_BEFORE: TimeInterval = 3 // how many seconds after departure will it still be visible

class SearchPageDetailViewModel: NSObject, ObservableObject {
    let platformIds: [String]

    @Published var departures: [ApiDeparture]?

    private var refreshTask: Task<Void, Never>?

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

        Task { await self.refresh() }
        startPeriodicRefresh()
    }

    deinit {
        stopPeriodicRefresh()
    }

    func refresh() async {
        await fetchAndApplyDepartures(
            stopsIds: [],
            platformsIds: platformIds
        )
    }

    private func startPeriodicRefresh() {
        stopPeriodicRefresh()
        refreshTask = Task(priority: .utility) { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(REFETCH_INTERVAL))
                guard !Task.isCancelled, let self else { return }

                await fetchAndApplyDepartures(
                    stopsIds: [],
                    platformsIds: platformIds
                )
            }
        }
    }

    private func stopPeriodicRefresh() {
        refreshTask?.cancel()
        refreshTask = nil
    }

    private func fetchAndApplyDepartures(
        stopsIds: [String],
        platformsIds: [String]
    ) async {
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

            let oldDepartures = await MainActor.run { self.departures }

            let newDepartures: [ApiDeparture]
            if let oldDepartures {
                let oldStuff = oldDepartures.filter { oldDeparture in
                    !fetchedDepartures.contains(where: { fetchedDeparture in
                        fetchedDeparture.id == oldDeparture.id
                    })
                }
                newDepartures = uniqueBy(
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
                newDepartures = fetchedDepartures
            }

            await MainActor.run {
                self.departures = newDepartures
            }

            print("Fetched \(fetchedDepartures.count) departures")
        } catch {
            print("Error fetching departures: \(error)")
        }
    }
}
