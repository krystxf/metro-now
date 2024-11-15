// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
import SwiftUI

struct PlatformSectionListView: View {
    let departures: [[ApiDeparture]]

    var body: some View {
        ForEach(departures, id: \.first?.id) { deps in
            let departure = deps.count > 0 ? deps[0] : nil
            let nextDeparture = deps.count > 1 ? deps[1] : nil

            if let departure {
                ClosestStopPageListItemView(
                    routeLabel: departure.route,
                    routeLabelBackground: getColorByRouteName(departure.route),
                    headsign: departure.headsign,
                    departure: departure.departure.predicted,
                    nextHeadsign: nextDeparture?.headsign,
                    nextDeparture: nextDeparture?.departure.predicted
                )
            } else {
                Text("Loading")
            }
        }
    }
}

struct PlatformSectionListPlaceholderView: View {
    let routes: [ApiRoute]
    let maxItems: Int = 3

    var body: some View {
        ForEach(routes.prefix(maxItems), id: \.id) { route in
            ClosestStopPageListItemPlaceholderView(
                routeLabel: route.name,
                routeLabelBackground: getColorByRouteName(route.name)
            )
        }
    }
}

struct PlatformSectionView: View {
    let platform: ApiPlatform
    let departures: [[ApiDeparture]]?

    init(platform: ApiPlatform, departures: [ApiDeparture]?) {
        self.platform = platform

        guard let departures else {
            self.departures = nil
            return
        }

        let filteredDepartures = departures
            .filter {
                platform.id == $0.platformId
            }

        let departuresByRoute = Dictionary(
            grouping: filteredDepartures,
            by: { $0.route }
        )

        self.departures = Array(
            departuresByRoute
                .map(\.value)
                .sorted(by: {
                    $0.first!.departure.predicted < $1.first!.departure.predicted
                }
                )
        )
    }

    var body: some View {
        if departures == nil || departures!.count > 0 {
            Section(header: Text(getPlatformLabel(platform))) {
                if let departures {
                    PlatformSectionListView(departures: departures)
                } else {
                    PlatformSectionListPlaceholderView(routes: platform.routes)
                        .redacted(reason: .placeholder)
                }
            }
        } else {
            EmptyView()
        }
    }
}

struct NonMetroDeparturesView: View {
    @StateObject private var locationManager = LocationManager()
    let stops: [ApiStop]

    @State var departures: [ApiDeparture]? = nil
    private let timer = Timer.publish(every: 5, on: .main, in: .common).autoconnect()

    var body: some View {
        if let location = locationManager.location, let closestStop = findClosestStop(
            to: location,
            stops: stops
        ) {
            let platforms = closestStop.platforms.filter { !$0.isMetro }.sorted(
                by: { getPlatformLabel($0) < getPlatformLabel($1) }
            )

            ForEach(platforms, id: \.id) { platform in
                PlatformSectionView(
                    platform: platform,
                    departures: departures
                )
            }

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

    func getStopDepartures() {
        guard let location = locationManager.location else {
            return
        }
        
        
        let closestStop = findClosestStop(to: location, stops: stops)!

        NetworkManager.shared
            .getDepartures(
                includeVehicle: .ALL,
                excludeMetro: true,
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
