// metro-now
// https://github.com/krystxf/metro-now

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
                routeLabel: nil,
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
