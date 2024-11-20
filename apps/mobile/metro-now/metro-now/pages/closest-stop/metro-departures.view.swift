// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct MetroDeparturesListView: View {
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
                    routeLabelBackground: getRouteColor(routeLabel),
                    headsign: platformDepartures[0].headsign,
                    departure: platformDepartures[0].departure.predicted,
                    nextHeadsign: nextDeparture?.headsign,
                    nextDeparture: nextDeparture?.departure.scheduled
                )
            } else {
                let routeLabel: String = platform.routes[0].name

                ClosestStopPageListItemPlaceholderView(
                    routeLabel: routeLabel,
                    routeLabelBackground: getRouteColor(routeLabel)
                )
            }
        }
    }
}
