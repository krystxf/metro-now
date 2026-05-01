// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct MetroDeparturesListView: View {
    let closestStop: ApiStop
    let departures: [ApiDeparture]?
    let onRoutePreviewRequested: ((SheetIdItem) -> Void)?
    var onShowAllDeparturesRequested: ((AllDeparturesRequest) -> Void)?

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
                if departureRows.isEmpty {
                    Label {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("No upcoming metro departures")
                            Text("Prague metro runs roughly 04:30 to midnight.")
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }
                    } icon: {
                        Image(systemName: "moon.zzz")
                            .foregroundStyle(.secondary)
                    }
                }
                ForEach(departureRows) { departureRow in
                    let routeColor = getRouteColor(
                        routeName: departureRow.routeLabel,
                        routeId: departureRow.previewRouteId,
                        availableRoutes: closestStop.platforms
                            .filter(\.isMetro)
                            .flatMap(\.routes)
                    )
                    ClosestStopPageListItemView(
                        routeLabel: departureRow.routeLabel,
                        routeLabelBackground: routeColor,
                        headsign: departureRow.headsign,
                        departure: departureRow.departure,
                        nextHeadsign: nil,
                        nextDeparture: nil
                    )
                    .contextMenu {
                        if let previewRouteId = departureRow.previewRouteId {
                            Button {
                                onRoutePreviewRequested?(
                                    SheetIdItem(
                                        id: previewRouteId,
                                        headsign: departureRow.headsign,
                                        currentPlatformId: departureRow.platformId,
                                        currentPlatformName: departureRow.platformName
                                    )
                                )
                            } label: {
                                Label("Show route", systemImage: "map")
                            }

                            if let platform = closestStop.platforms.first(
                                where: { $0.id == departureRow.platformId }
                            ) {
                                Button {
                                    onShowAllDeparturesRequested?(
                                        AllDeparturesRequest(
                                            platform: platform,
                                            routeFilter: AllDeparturesRequest.RouteFilter(
                                                routeId: previewRouteId,
                                                headsign: departureRow.headsign
                                            )
                                        )
                                    )
                                } label: {
                                    Label("Show all departures", systemImage: "list.bullet.clipboard")
                                }
                            }

                            #if !targetEnvironment(macCatalyst)
                                if #available(iOS 16.2, *) {
                                    Button {
                                        let row = departureRow
                                        let stop = closestStop
                                        Task { @MainActor in
                                            await DeparturesLiveActivityManager.shared.start(
                                                stopName: stop.name,
                                                stopId: stop.id,
                                                platformId: row.platformId,
                                                platformName: row.platformName,
                                                platformCode: nil,
                                                routeId: previewRouteId,
                                                routeName: row.routeLabel,
                                                headsign: row.headsign,
                                                initialDeparture: row.departure,
                                                initialNextHeadsign: nil,
                                                initialNextDeparture: nil,
                                                initialDelaySeconds: 0,
                                                initialIsRealtime: true
                                            )
                                        }
                                    } label: {
                                        Label("Show live activity", systemImage: "bolt.badge.clock")
                                    }
                                }
                            #endif
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
                    .contextMenu {
                        Button {
                            onRoutePreviewRequested?(
                                SheetIdItem(
                                    id: route.backendRouteId,
                                    currentPlatformId: platform.id,
                                    currentPlatformName: platform.name
                                )
                            )
                        } label: {
                            Label("Show route", systemImage: "map")
                        }
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
                onRoutePreviewRequested: nil,
                onShowAllDeparturesRequested: nil
            )
        }
    }
}
