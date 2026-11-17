// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

private let REFETCH_INTERVAL: TimeInterval = 10 // seconds
private let SECONDS_BEFORE: TimeInterval = 3 // how many seconds after departure will it still be visible

class SearchPageDetailViewModel: NSObject, ObservableObject {
    typealias DeparturesFetcher = @Sendable (
        _ stopIds: [String],
        _ platformIds: [String]
    ) async throws -> [ApiDeparture]

    let platformIds: [String]

    @Published var departures: [ApiDeparture]?

    private var refreshTask: Task<Void, Never>?
    private let departuresFetcher: DeparturesFetcher
    private let now: @Sendable () -> Date

    init(
        platformIds: [String],
        initialDepartures: [ApiDeparture]? = nil,
        shouldRefresh: Bool = true,
        departuresFetcher: @escaping DeparturesFetcher = defaultDeparturesFetcher,
        now: @escaping @Sendable () -> Date = { .now }
    ) {
        self.platformIds = platformIds
        departures = initialDepartures
        self.departuresFetcher = departuresFetcher
        self.now = now
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
            let fetchedDepartures = try await departuresFetcher(
                stopsIds,
                platformsIds
            )

            let oldDepartures = await MainActor.run { self.departures }

            let newDepartures: [ApiDeparture]
            if let oldDepartures {
                let fetchedIds = Set(fetchedDepartures.compactMap(\.id))
                let retainedOld = oldDepartures.filter { old in
                    guard let id = old.id else { return true }
                    return !fetchedIds.contains(id)
                }
                newDepartures = uniqueBy(
                    array: retainedOld + fetchedDepartures,
                    by: \.id
                )
                .filter {
                    $0.departure.predicted > now() - SECONDS_BEFORE
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

    private static func defaultDeparturesFetcher(
        stopIds: [String],
        platformIds: [String]
    ) async throws -> [ApiDeparture] {
        let response = try await fetchGraphQLQuery(
            MetroNowAPI.DeparturesQuery(
                stopIds: .some(stopIds),
                platformIds: .some(platformIds),
                limit: .some(10),
                metroOnly: .none,
                minutesBefore: .some(1),
                minutesAfter: .some(Int32(6 * 60))
            )
        )

        return response.departures.compactMap {
            mapGraphQLDeparture($0)
        }
    }
}
