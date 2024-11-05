// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct ClosestStopPageView: View {
    let closestStop: ApiStop
    let departures: [ApiDeparture]?

    var body: some View {
        List(closestStop.platforms, id: \.id) { platform in
            let routeLabel: String = platform.routes[0].name
            let routeLabelBackground: Color = getMetroLineColor(routeLabel) ?? .black
            let platformDepartures: [ApiDeparture]? = departures?.filter { departure in
                departure.platformId == platform.id
            }

            if let platformDepartures, platformDepartures.count > 0 {
                ClosestStopPageListItemView(
                    routeLabel: routeLabel,
                    routeLabelBackground: routeLabelBackground,
                    headsign: platformDepartures[0].headsign,
                    departure: platformDepartures[0].departure.predicted,
                    nextHeadsign: platformDepartures[1].headsign,
                    nextDeparture: platformDepartures[1].departure.scheduled
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
