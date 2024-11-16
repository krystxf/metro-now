// metro-now
// https://github.com/krystxf/metro-now

import Alamofire
import CoreLocation
import Foundation
import SwiftUI

private let REFETCH_INTERVAL: TimeInterval = 3 // seconds
private let SECONDS_BEFORE: TimeInterval = 3 // how many seconds after departure will it still be visible

class ClosestStopPageViewModel: NSObject, ObservableObject, CLLocationManagerDelegate {
    private let locationManager = CLLocationManager()
    @Published var location: CLLocation?

    @Published var stops: [ApiStop]?
    @Published var closestStop: ApiStop?
    @Published var departures: [ApiDeparture]?

    private var refreshTimer: Timer?

    override init() {
        super.init()
        locationManager.delegate = self
        locationManager.requestWhenInUseAuthorization()
        locationManager.startUpdatingLocation()

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

            guard let self, let closestStop else {
                return
            }

            getDepartures(stopsIds: [closestStop.id])
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
            let stops,
            let nextValue = findClosestStop(to: location, stops: stops),
            nextValue.id != self.closestStop?.id
        {
            closestStop = nextValue
            getDepartures(stopsIds: [nextValue.id])
        }
    }

    private func getStops() {
        let request = AF.request(
            "\(ENDPOINT)/v1/stop/all",
            method: .get,
            parameters: ["metroOnly": String(true)]
        )

        request
            .validate()
            .responseDecodable(of: [ApiStop].self) { response in
                switch response.result {
                case let .success(fetchedStops):
                    DispatchQueue.main.async {
                        self.stops = fetchedStops
                        print("Fetched \(fetchedStops.count) metro stops")

                        self.updateClosestStop()
                    }
                case let .failure(error):
                    print("Error fetching metroStops: \(error)")
                }
            }
    }

    private func getDepartures(stopsIds: [String]) {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        let request = AF.request(
            "\(ENDPOINT)/v2/departure",
            method: .get,
            parameters: [
                "stop": stopsIds,
                "limit": 20,
                "totalLimit": 80,
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

struct ContentView: View {
    @StateObject private var viewModel = ClosestStopPageViewModel()

    var body: some View {
        VStack {
            if
                let closestStop = viewModel.closestStop
            {
                let platforms = closestStop.platforms.filter { $0.routes.count > 0 }

                StopDeparturesView(
                    title: closestStop.name,
                    platforms: platforms.map { platform in
                        MainPagePlatform(
                            id: platform.id,
                            metroLine: MetroLine(rawValue: platform.routes[0].name),
                            departures: viewModel.departures?.filter { departure in
                                departure.platformId == platform.id
                            }
                        )
                    }
                )
            } else {
                ProgressView()
            }
        }
    }
}

#Preview {
    ContentView()
}
