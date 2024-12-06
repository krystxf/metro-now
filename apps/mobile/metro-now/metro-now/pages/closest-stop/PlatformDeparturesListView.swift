// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct PlatformDeparturesListView: View {
    let platform: ApiPlatform
    let departures: [[ApiDeparture]]?

    @State private var routeIdPreview: SheetIdItem?

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
                    ForEach(departures, id: \.first?.id) { deps in
                        let departure = deps.count > 0 ? deps[0] : nil
                        let nextDeparture = deps.count > 1 ? deps[1] : nil

                        if let departure {
                            ClosestStopPageListItemView(
                                routeLabel: departure.route,
                                routeLabelBackground: getRouteColor(departure.route),
                                headsign: departure.headsign,
                                departure: departure.departure.predicted,
                                nextHeadsign: nextDeparture?.headsign,
                                nextDeparture: nextDeparture?.departure.predicted
                            )
                            .onLongPressGesture {
                                if let routeId = departure.routeId {
                                    routeIdPreview = SheetIdItem(id: routeId)
                                }
                            }
                        } else {
                            Text("Loading")
                        }
                    }
                } else {
                    ForEach(platform.routes.prefix(3), id: \.id) { route in
                        ClosestStopPageListItemPlaceholderView(
                            routeLabel: nil,
                            routeLabelBackground: getRouteColor(route.name)
                        )
                    }
                }
            }
            .sheet(item: $routeIdPreview) { item in
                RoutePreviewView(routeId: item.id)
                    .presentationDetents([.medium, .large])
            }
        } else {
            EmptyView()
        }
    }
}
