// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
import SwiftUI

struct ContentView: View {
    @StateObject private var locationManager = LocationManager()
    @State var metroStops: [ApiStop]? = nil
    @State var allStops: [ApiStop]? = nil
    @State var departures: [ApiDeparture]? = nil
    private let timer = Timer.publish(every: 2, on: .main, in: .common).autoconnect()

    var body: some View {
        NavigationStack {
            List {
                if let location = locationManager.location,
                   let metroStops,
                   let closestMetroStop = findClosestStop(to: location, stops: metroStops)
                {
                    Section(header: Text("Metro")) {
                        ClosestMetroStopSectionView(
                            closestStop: closestMetroStop,
                            departures: departures
                        )
                        .navigationTitle(closestMetroStop.name)
                    }
                } else {
                    ProgressView()
                }
            }
        }
        .onAppear {
            getAllMetroStops()
            getAllStops()
        }
        .onReceive(timer) { _ in
            getAllMetroStops()
            getAllStops()
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

                    metroStops = stops

                case let .failure(error):
                    print(error.localizedDescription)
                }
            }
        }
    }

    func getAllStops() {
        NetworkManager.shared.getAllStops { result in
            DispatchQueue.main.async {
                switch result {
                case let .success(stops):

                    allStops = stops

                case let .failure(error):
                    print(error.localizedDescription)
                }
            }
        }
    }

    func getStopDepartures() {
        guard
            let location = locationManager.location,
            let metroStops,
            let closestStop = findClosestStop(to: location, stops: metroStops)
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
