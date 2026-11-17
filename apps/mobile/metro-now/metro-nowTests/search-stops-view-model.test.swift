import CoreLocation
import Foundation
@testable import metro_now
import Testing

@Suite(.tags(.api))
@MainActor
struct SearchStopsViewModelTests {
    actor SearchRequestProbe {
        private(set) var query: String?
        private(set) var coordinate: CLLocationCoordinate2D?
        private(set) var limit: Int?

        func record(
            query: String,
            coordinate: CLLocationCoordinate2D?,
            limit: Int
        ) {
            self.query = query
            self.coordinate = coordinate
            self.limit = limit
        }
    }

    actor ContinuationStore {
        private var continuation: CheckedContinuation<[ApiStop], Error>?

        func set(_ continuation: CheckedContinuation<[ApiStop], Error>) {
            self.continuation = continuation
        }

        func resume(returning stops: [ApiStop]) {
            continuation?.resume(returning: stops)
            continuation = nil
        }
    }

    private func makeStop(id: String, name: String) -> ApiStop {
        ApiStop(
            id: id,
            name: name,
            avgLatitude: 50,
            avgLongitude: 14,
            entrances: [],
            platforms: []
        )
    }

    @Test("clears state when the search query becomes empty")
    func clearsStateForEmptyQuery() {
        let viewModel = SearchStopsViewModel(
            searchDelay: .zero,
            searchStopsFetcher: { _, _, _ in [] }
        )

        viewModel.updateSearch(query: "Můstek")
        viewModel.updateSearch(query: "   ")

        #expect(viewModel.stops.isEmpty)
        #expect(viewModel.isLoading == false)
        #expect(viewModel.errorMessage == nil)
    }

    @Test("loads search results with the provided coordinate")
    func loadsSearchResults() async {
        let probe = SearchRequestProbe()
        let expectedStop = makeStop(id: "U1", name: "Můstek")
        let viewModel = SearchStopsViewModel(
            searchDelay: .zero,
            searchStopsFetcher: { query, coordinate, limit in
                await probe.record(
                    query: query,
                    coordinate: coordinate,
                    limit: limit
                )
                return [expectedStop]
            }
        )

        viewModel.updateSearch(
            query: " Můstek ",
            coordinate: CLLocationCoordinate2D(latitude: 50.1, longitude: 14.4)
        )
        await eventually {
            viewModel.stops.first?.id == expectedStop.id && viewModel.isLoading == false
        }

        let capturedQuery = await probe.query
        let capturedCoordinate = await probe.coordinate
        let capturedLimit = await probe.limit

        #expect(capturedQuery == "Můstek")
        #expect(capturedCoordinate?.latitude == 50.1)
        #expect(capturedCoordinate?.longitude == 14.4)
        #expect(capturedLimit == 50)
        #expect(viewModel.errorMessage == nil)
    }

    @Test("ignores stale search responses once a newer query wins")
    func ignoresStaleResponses() async {
        let firstStop = makeStop(id: "old", name: "Old")
        let secondStop = makeStop(id: "new", name: "New")
        let continuationStore = ContinuationStore()
        let viewModel = SearchStopsViewModel(
            searchDelay: .zero,
            searchStopsFetcher: { query, _, _ in
                if query == "first" {
                    return try await withCheckedThrowingContinuation { continuation in
                        Task {
                            await continuationStore.set(continuation)
                        }
                    }
                }

                return [secondStop]
            }
        )

        viewModel.updateSearch(query: "first")
        await Task.yield()
        viewModel.updateSearch(query: "second")

        await eventually {
            viewModel.stops.first?.id == secondStop.id && viewModel.isLoading == false
        }

        await continuationStore.resume(returning: [firstStop])
        await Task.yield()

        #expect(viewModel.stops.count == 1)
        #expect(viewModel.stops.first?.id == secondStop.id)
    }

    @Test("surfaces search errors for the active query")
    func surfacesErrors() async {
        struct SearchFailure: LocalizedError {
            var errorDescription: String? {
                "Search failed"
            }
        }

        let viewModel = SearchStopsViewModel(
            searchDelay: .zero,
            searchStopsFetcher: { _, _, _ in throw SearchFailure() }
        )

        viewModel.updateSearch(query: "error")
        await eventually {
            viewModel.errorMessage == "Search failed" && viewModel.isLoading == false
        }

        #expect(viewModel.stops.isEmpty)
    }
}
