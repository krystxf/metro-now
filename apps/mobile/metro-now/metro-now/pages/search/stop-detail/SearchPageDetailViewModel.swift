// metro-now
// https://github.com/krystxf/metro-now

import Alamofire
import SwiftUI

private let REFETCH_INTERVAL: TimeInterval = 10 // seconds
private let SECONDS_BEFORE: TimeInterval = 3 // how many seconds after departure will it still be visible

class SearchPageDetailViewModel: NSObject, ObservableObject {
    let stopId: String

    @Published var departures: [ApiDeparture]?

    private var refreshTimer: Timer?

    init(stopId: String) {
        self.stopId = stopId
        super.init()

        refresh()
        startPeriodicRefresh()
    }

    deinit {
        stopPeriodicRefresh()
    }

    func refresh() {
        getDepartures(
            stopsIds: [stopId],
            platformsIds: []
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
                stopsIds: [stopId],
                platformsIds: []
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
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        let request = AF.request(
            "\(API_URL)/v2/departure",
            method: .get,
            parameters: [
                "vehicleType": "metro",
                "stop": stopsIds,
                "platform": platformsIds,
                "limit": 100,
                "minutesBefore": 1,
            ]
        )

        request
            .validate()
            .responseDecodable(of: [ApiDeparture].self, decoder: decoder) { response in
                switch response.result {
                case let .success(fetchedDepartures):
                    DispatchQueue.main.async {
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
                case let .failure(error):
                    print("Error fetching stops: \(error)")
                }
            }
    }
}
