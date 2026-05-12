import Foundation
@testable import metro_now
import Testing

@Suite(.tags(.api))
struct SearchPageDetailViewModelTests {
    private func makeDeparture(
        id: String?,
        scheduledOffset: TimeInterval,
        predictedOffset: TimeInterval? = nil,
        now: Date,
        platformId: String = "P1"
    ) -> ApiDeparture {
        ApiDeparture(
            id: id,
            platformId: platformId,
            platformCode: nil,
            headsign: "Test",
            departure: ApiDepartureDate(
                predicted: now.addingTimeInterval(predictedOffset ?? scheduledOffset),
                scheduled: now.addingTimeInterval(scheduledOffset)
            ),
            delay: 0,
            route: "A",
            routeId: "991",
            routeColor: nil,
            isRealtime: true
        )
    }

    @Test("refresh loads departures for the configured platforms")
    func refreshLoadsDepartures() async {
        let now = Date(timeIntervalSince1970: 1000)
        var capturedStopIds: [String]?
        var capturedPlatformIds: [String]?
        let expected = makeDeparture(id: "dep-1", scheduledOffset: 60, now: now)
        let viewModel = SearchPageDetailViewModel(
            platformIds: ["P1"],
            shouldRefresh: false,
            departuresFetcher: { stopIds, platformIds in
                capturedStopIds = stopIds
                capturedPlatformIds = platformIds
                return [expected]
            },
            now: { now }
        )

        await viewModel.refresh()

        #expect(capturedStopIds == [])
        #expect(capturedPlatformIds == ["P1"])
        #expect(viewModel.departures?.count == 1)
        #expect(viewModel.departures?.first?.id == expected.id)
    }

    @Test("refresh merges retained departures, removes expired ones, and sorts by schedule")
    func refreshMergesAndSortsDepartures() async {
        let now = Date(timeIntervalSince1970: 1000)
        let retained = makeDeparture(id: "old", scheduledOffset: 120, predictedOffset: 120, now: now)
        let expired = makeDeparture(id: "expired", scheduledOffset: -30, predictedOffset: -5, now: now)
        let fetchedLater = makeDeparture(id: "new-later", scheduledOffset: 300, now: now)
        let fetchedSooner = makeDeparture(id: "new-sooner", scheduledOffset: 30, now: now)
        let viewModel = SearchPageDetailViewModel(
            platformIds: ["P1"],
            initialDepartures: [retained, expired],
            shouldRefresh: false,
            departuresFetcher: { _, _ in [fetchedLater, fetchedSooner] },
            now: { now }
        )

        await viewModel.refresh()

        let ids = viewModel.departures?.compactMap(\.id) ?? []
        #expect(ids == ["new-sooner", "old", "new-later"])
    }

    @Test("refresh keeps current departures when fetching fails")
    func refreshKeepsCurrentDeparturesOnFailure() async {
        struct FetchFailure: Error {}
        let now = Date(timeIntervalSince1970: 1000)
        let existing = makeDeparture(id: "existing", scheduledOffset: 60, now: now)
        let viewModel = SearchPageDetailViewModel(
            platformIds: ["P1"],
            initialDepartures: [existing],
            shouldRefresh: false,
            departuresFetcher: { _, _ in throw FetchFailure() },
            now: { now }
        )

        await viewModel.refresh()

        #expect(viewModel.departures?.count == 1)
        #expect(viewModel.departures?.first?.id == existing.id)
    }
}
