// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct MetroDeparturesListView: View {
    let closestStop: ApiStop
    let departures: [ApiDeparture]?

    @State private var routeIdPreview: SheetIdItem?

    var body: some View {
        ForEach(closestStop.platforms, id: \.id) { platform in
            let platformDepartures: [ApiDeparture]? = departures?.filter {
                $0.platformId == platform.id
            }

            if platform.routes.count == 0 {
                EmptyView()
            } else if let platformDepartures, platformDepartures.count > 0 {
                let route = platform.routes[0]
                let nextDeparture = platformDepartures.count > 1 ? platformDepartures[1] : nil

                ClosestStopPageListItemView(
                    routeLabel: route.name,
                    routeLabelBackground: getRouteColor(route.name),
                    headsign: platformDepartures[0].headsign,
                    departure: platformDepartures[0].departure.predicted,
                    nextHeadsign: nextDeparture?.headsign,
                    nextDeparture: nextDeparture?.departure.scheduled
                ).onLongPressGesture {
                    routeIdPreview = SheetIdItem(id: "L\(route.id)")
                }
            } else {
                let route = platform.routes[0]

                ClosestStopPageListItemPlaceholderView(
                    routeLabel: route.name,
                    routeLabelBackground: getRouteColor(route.name)
                )
                .onLongPressGesture {
                    routeIdPreview = SheetIdItem(id: "L\(route.id)")
                }
            }
        }
        .sheet(item: $routeIdPreview) { item in
            RoutePreviewView(routeId: item.id)
                .presentationDetents([.medium, .large])
        }
    }
}
