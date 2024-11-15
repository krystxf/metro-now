// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
import SwiftUI

struct ClosestMetroStopSectionView: View {
    let closestStop: ApiStop
    let departures: [ApiDeparture]?

    var body: some View {
        ForEach(closestStop.platforms, id: \.id) { platform in
            let platformDepartures: [ApiDeparture]? = departures?.filter {
                $0.platformId == platform.id
            }

            if platform.routes.count == 0 {
                EmptyView()
            } else if let platformDepartures, platformDepartures.count > 0 {
                let routeLabel: String = platform.routes[0].name
                let nextDeparture = platformDepartures.count > 1 ? platformDepartures[1] : nil

                ClosestStopPageListItemView(
                    routeLabel: routeLabel,
                    routeLabelBackground: getColorByRouteName(routeLabel),
                    headsign: platformDepartures[0].headsign,
                    departure: platformDepartures[0].departure.predicted,
                    nextHeadsign: nextDeparture?.headsign,
                    nextDeparture: nextDeparture?.departure.scheduled
                )
            } else {
                let routeLabel: String = platform.routes[0].name

                ClosestStopPageListItemPlaceholderView(
                    routeLabel: routeLabel,
                    routeLabelBackground: getColorByRouteName(routeLabel)
                )
            }
        }
    }
}

struct PlatformDeparturesView: View {
    private let departures: [ApiDeparture]

    init(departures: [ApiDeparture]) {
        self.departures = departures
    }

    var body: some View {
        ForEach(departures, id: \.headsign) { departure in
            ClosestStopPageListItemView(
                routeLabel: departure.route,
                routeLabelBackground: getColorByRouteName(departure.route),
                headsign: departure.headsign,
                departure: departure.departure.predicted,
                nextHeadsign: nil,
                nextDeparture: nil
            )
        }
    }
}

struct MetroDeparturesView: View {
    @StateObject private var locationManager = LocationManager()
    let stops: [ApiStop]

    init(stops: [ApiStop]) {
        self.stops = stops
    }

    @State var departures: [ApiDeparture]? = nil
    private let timer = Timer.publish(every: 5, on: .main, in: .common).autoconnect()

    var body: some View {
        if let location = locationManager.location {
            if let closestMetroStop = findClosestStop(to: location, stops: stops) {
                ClosestMetroStopSectionView(
                    closestStop: closestMetroStop,
                    departures: departures
                )
                .navigationTitle(closestMetroStop.name)
            } else {
                ProgressView()
            }
            
            EmptyView()
                .onAppear {
                    getStopDepartures()
                }
                .onReceive(timer) { _ in
                    getStopDepartures()
                }
        }
        else {
            EmptyView()
        }
    }

    func getStopDepartures() {
        guard let location = locationManager.location else {
            return
        }
        
        guard let closestStop = findClosestStop(to: location, stops: stops) else {
            return
        }

        NetworkManager.shared
            .getDepartures(
                includeVehicle: .METRO,
                excludeMetro: false,
                stopIds: [closestStop.id],
                platformIds: []
            ) { result in
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
