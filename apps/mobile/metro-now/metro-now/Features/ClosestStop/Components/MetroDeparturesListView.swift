// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct MetroDeparturesListView: View {
    let closestStop: ApiStop
    let departures: [ApiDeparture]?
    let onRoutePreviewRequested: ((SheetIdItem) -> Void)?

    private var placeholderPlatforms: [ApiPlatform] {
        closestStop.platforms.filter { platform in
            platform.isMetro && !platform.routes.isEmpty
        }
    }

    var body: some View {
        Group {
            if let departureRows = buildMetroDepartureRows(
                for: closestStop,
                departures: departures
            ) {
                ForEach(departureRows) { departureRow in
                    ClosestStopPageListItemView(
                        routeLabel: departureRow.routeLabel,
                        routeLabelBackground: getRouteColor(
                            routeName: departureRow.routeLabel,
                            routeId: departureRow.previewRouteId,
                            availableRoutes: closestStop.platforms
                                .filter(\.isMetro)
                                .flatMap(\.routes)
                        ),
                        headsign: departureRow.headsign,
                        departure: departureRow.departure,
                        nextHeadsign: departureRow.nextHeadsign,
                        nextDeparture: departureRow.nextDeparture
                    )
                    .onLongPressGesture {
                        if let previewRouteId = departureRow.previewRouteId {
                            onRoutePreviewRequested?(
                                SheetIdItem(
                                    id: previewRouteId,
                                    headsign: departureRow.headsign,
                                    currentPlatformId: departureRow.platformId,
                                    currentPlatformName: departureRow.platformName
                                )
                            )
                        }
                    }
                }
            } else {
                ForEach(placeholderPlatforms, id: \.id) { platform in
                    let route = platform.routes[0]

                    ClosestStopPageListItemPlaceholderView(
                        routeLabel: route.name,
                        routeLabelBackground: getRouteColor(route)
                    )
                    .onLongPressGesture {
                        onRoutePreviewRequested?(
                            SheetIdItem(
                                id: route.backendRouteId,
                                currentPlatformId: platform.id,
                                currentPlatformName: platform.name
                            )
                        )
                    }
                }
            }
        }
    }
}

#Preview {
    List {
        Section(header: Text(PreviewData.metroStop.name)) {
            MetroDeparturesListView(
                closestStop: PreviewData.metroStop,
                departures: PreviewData.departures,
                onRoutePreviewRequested: nil
            )
        }
    }
}
