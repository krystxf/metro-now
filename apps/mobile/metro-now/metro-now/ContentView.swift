// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
import SwiftUI

struct ContentView: View {
    @StateObject private var locationManager = LocationManager()
    @State var stops: [ApiStop]? = nil
    @State var departures: [ApiDeparture]? = nil
    private let timer = Timer.publish(every: 2, on: .main, in: .common).autoconnect()

    var body: some View {
        NavigationStack {
            if let location = locationManager.location,
               let stops,
               let closestStop = findClosestStop(to: location, stops: stops)
            {
                ClosestStopPageView(
                    closestStop: closestStop,
                    departures: departures
                )
                .navigationTitle(closestStop.name)
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
