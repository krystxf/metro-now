// metro-now
// https://github.com/krystxf/metro-now

import Alamofire
import CoreLocation
import SwiftUI
import WidgetKit

private let REFETCH_INTERVAL: TimeInterval = 3 // seconds
private let SECONDS_BEFORE: TimeInterval = 3 // how many seconds after departure will it still be visible

class ClosestStopPageViewModel: NSObject, ObservableObject, CLLocationManagerDelegate {
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

    func refresh() {
        let stopIds = [closestMetroStop?.id ?? "", closestStop?.id ?? ""]

        getDepartures(
            stopsIds: stopIds.filter { !$0.isEmpty },
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

        if let metroStops,
           let nextValue = findClosestStop(to: location, stops: metroStops),
           nextValue.id != self.closestMetroStop?.id
        {
            closestMetroStop = nextValue
            getDepartures(stopsIds: [nextValue.id], platformsIds: [])
            WidgetCenter.shared.reloadAllTimelines()
        }

        if let allStops,
           let nextValue = findClosestStop(to: location, stops: allStops),
           nextValue.id != self.closestStop?.id
        {
            closestStop = nextValue
            getDepartures(stopsIds: [nextValue.id], platformsIds: [])
        }
    }

    private func getStops(metroOnly: Bool = false) {
        let request = AF.request(
            "\(API_URL)/v1/stop/all",
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
                        metroOnly
                            ? "Error fetching metroStops: \(error)"
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
            "\(API_URL)/v2/departure",
            method: .get,
            parameters: [
                "stop": stopsIds,
                "platform": platformsIds,
                "limit": 4,
                "minutesBefore": 1,
                "minutesAfter": String(3 * 60),
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
