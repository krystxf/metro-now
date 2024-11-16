// metro-now
// https://github.com/krystxf/metro-now

import Alamofire
import CoreLocation
import SwiftUI

private let REFETCH_INTERVAL: TimeInterval = 3 // seconds
private let SECONDS_BEFORE: TimeInterval = 3 // how many seconds after departure will it still be visible

class DepartureViewModel: NSObject, ObservableObject, CLLocationManagerDelegate {
    private let locationManager = CLLocationManager()
    @Published var location: CLLocation?

    @Published var metroStops: [ApiStop]?
    @Published var allStops: [ApiStop]?

    @Published var closestMetroStop: ApiStop?
    @Published var closestStop: ApiStop?

    @Published var departures: [ApiDeparture]?

    private var refreshTimer: Timer?

    override init() {
        super.init()
        locationManager.delegate = self
        locationManager.requestWhenInUseAuthorization()
        locationManager.startUpdatingLocation()

        getStops(metroOnly: true)
        getStops()

        startPeriodicRefresh()
    }

    deinit {
        stopPeriodicRefresh()
    }

    private func startPeriodicRefresh() {
        stopPeriodicRefresh() // Stop any existing timer to avoid duplication.
        refreshTimer = Timer.scheduledTimer(
            withTimeInterval: REFETCH_INTERVAL,
            repeats: true
        ) { [weak self] _ in

            guard
                let self,
                let closestMetroStop,
                let closestStop
            else {
                return
            }

            getDepartures(
                stopsIds: [closestMetroStop.id, closestStop.id],
                platformsIds: []
            )
        }
    }

    private func stopPeriodicRefresh() {
        refreshTimer?.invalidate()
        refreshTimer = nil
    }

    func locationManager(_: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else {
            return
        }
        self.location = location

        updateClosestStop()
    }

    func updateClosestStop() {
        guard let location else {
            return
        }

        if
            let metroStops,
            let nextValue = findClosestStop(to: location, stops: metroStops),
            nextValue.id != self.closestMetroStop?.id
        {
            closestMetroStop = nextValue
            getDepartures(stopsIds: [nextValue.id], platformsIds: [])
        }

        if
            let allStops,
            let nextValue = findClosestStop(to: location, stops: allStops),
            nextValue.id != self.closestStop?.id
        {
            closestStop = nextValue
            getDepartures(stopsIds: [nextValue.id], platformsIds: [])
        }
    }

    private func getStops(metroOnly: Bool = false) {
        let request = AF.request(
            "\(ENDPOINT)/v1/stop/all",
            method: .get,
            parameters: ["metroOnly": String(metroOnly)]
        )

        request
            .validate()
            .responseDecodable(of: [ApiStop].self) { response in
                switch response.result {
                case let .success(fetchedStops):
                    DispatchQueue.main.async {
                        if metroOnly {
                            self.metroStops = fetchedStops
                            print("Fetched \(fetchedStops.count) metro stops")
                        } else {
                            self.allStops = fetchedStops
                            print("Fetched \(fetchedStops.count) stops")
                        }

                        self.updateClosestStop()
                    }
                case let .failure(error):
                    print(
                        metroOnly ? "Error fetching metroStops: \(error)"
                            : "Error fetching stops: \(error)"
                    )
                }
            }
    }

    private func getDepartures(
        stopsIds: [String],
        platformsIds: [String]
    ) {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        let request = AF.request(
            "\(ENDPOINT)/v2/departure",
            method: .get,
            parameters: [
                "stop": stopsIds,
                "platform": platformsIds,
                "limit": 4,
                "totalLimit": 200,
            ]
        )

        request
            .validate()
            .responseDecodable(of: [ApiDeparture].self, decoder: decoder) { response in
                switch response.result {
                case let .success(fetchedDepartures):
                    DispatchQueue.main.async {
                        if let oldDepartures = self.departures {
                            self.departures = uniqueBy(
                                array: oldDepartures + fetchedDepartures,
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
