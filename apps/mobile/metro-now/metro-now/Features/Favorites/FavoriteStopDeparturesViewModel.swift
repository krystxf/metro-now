// metro-now
// https://github.com/krystxf/metro-now

import Foundation

private let REFETCH_INTERVAL: TimeInterval = 10

class FavoriteStopDeparturesViewModel: ObservableObject {
    @Published var soonestDeparture: ApiDeparture?

    private let platformIds: [String]
    private var refreshTask: Task<Void, Never>?

    init(platformIds: [String]) {
        self.platformIds = platformIds
        Task { await self.fetch() }
        startPeriodicRefresh()
    }

    deinit {
        refreshTask?.cancel()
    }

    private func startPeriodicRefresh() {
        refreshTask = Task(priority: .utility) { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(REFETCH_INTERVAL))
                guard !Task.isCancelled, let self else { return }
                await fetch()
            }
        }
    }

    func fetch() async {
        do {
            let response = try await fetchGraphQLQuery(
                MetroNowAPI.DeparturesQuery(
                    stopIds: .some([]),
                    platformIds: .some(platformIds),
                    limit: .some(5),
                    metroOnly: .none,
                    minutesBefore: .some(0),
                    minutesAfter: .some(Int32(6 * 60))
                )
            )

            let departures = response.departures
                .compactMap { mapGraphQLDeparture($0) }
                .sorted { $0.departure.predicted < $1.departure.predicted }

            await MainActor.run {
                self.soonestDeparture = departures.first
            }
        } catch {
            print("FavoriteStopDeparturesViewModel fetch error: \(error)")
        }
    }
}
