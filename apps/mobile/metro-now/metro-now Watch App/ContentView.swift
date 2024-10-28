// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
import Foundation
import SwiftUI

struct ContentView: View {
    @StateObject private var locationManager = LocationManager()
    @State var stops: [ApiStop]? = nil
    @State var departures: [ApiDeparture]? = nil
    private let timer = Timer.publish(every: 2, on: .main, in: .common).autoconnect()

    var body: some View {
        VStack {
            if
                let location = locationManager.location,
                let stops,
                let closestStop = findClosestStop(to: location, stops: stops)
            {
                MainPage(
                    title: closestStop.name,
                    platforms: closestStop.platforms.map {
                        platform in
                        MainPagePlatform(
                            id: platform.id,
                            metroLine: MetroLine(rawValue: platform.routes[0].name),
                            departures: departures?.filter { departure in
                                departure.platformId == platform.id
                            }
                        )
                    }
                )

            } else {
                ProgressView()
            }
        }
        .onAppear {
            getAllMetroStops()
        }
        .onReceive(timer) { _ in
            getStopDepartures()
        }
    }

    func findClosestStop(to location: CLLocation, stops: [ApiStop]) -> ApiStop? {
        var closestStop: ApiStop?
        var closestDistance: CLLocationDistance?

        for stop in stops {
            let stopLocation = CLLocation(latitude: stop.avgLatitude, longitude: stop.avgLongitude)

            let distance = location.distance(from: stopLocation)

            guard closestDistance != nil else {
                closestStop = stop
                closestDistance = distance
                continue
            }

            if distance < closestDistance! {
                closestStop = stop
                closestDistance = distance
            }
        }

        return closestStop
    }

    func getAllMetroStops() {
        NetworkManager.shared.getMetroStops { result in
            DispatchQueue.main.async {
                switch result {
                case let .success(stops):

                    self.stops = stops

                case let .failure(error):
                    print(error.localizedDescription)
                }
            }
        }
    }

    func getStopDepartures() {
        guard
            let location = locationManager.location,
            let stops,
            let closestStop = findClosestStop(to: location, stops: stops)
        else {
            return
        }

        NetworkManager.shared
            .getDepartures(stopIds: [closestStop.id], platformIds: []) { result in
                DispatchQueue.main.async {
                    switch result {
                    case let .success(departures):

                        self.departures = departures

                    case let .failure(error):
                        print(error.localizedDescription)
                    }
                }
            }
    }
}

#Preview {
    ContentView()
}
