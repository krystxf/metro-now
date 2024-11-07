// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct ClosestMetroStopSectionView: View {
    let closestStop: ApiStop
    let departures: [ApiDeparture]?

    var body: some View {
        ForEach(closestStop.platforms, id: \.id) { platform in
            let routeLabel: String = platform.routes[0].name
            let routeLabelBackground: Color = getColorByRouteName(routeLabel)
            let platformDepartures: [ApiDeparture]? = departures?.filter { departure in
                departure.platformId == platform.id
            }

            if let platformDepartures, platformDepartures.count > 0 {
                let nextDeparture = platformDepartures.count > 1 ? platformDepartures[1] : nil

                ClosestStopPageListItemView(
                    routeLabel: routeLabel,
                    routeLabelBackground: routeLabelBackground,
                    headsign: platformDepartures[0].headsign,
                    departure: platformDepartures[0].departure.predicted,
                    nextHeadsign: nextDeparture?.headsign,
                    nextDeparture: nextDeparture?.departure.scheduled
                )
            } else {
                ClosestStopPageListItemPlaceholderView(
                    routeLabel: routeLabel,
                    routeLabelBackground: routeLabelBackground
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
