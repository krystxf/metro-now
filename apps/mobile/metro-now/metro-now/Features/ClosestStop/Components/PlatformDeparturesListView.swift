// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct PlatformDeparturesListView: View {
    let platform: ApiPlatform
    let departures: [[ApiDeparture]]?
    let primaryLabel: String?
    let onRoutePreviewRequested: ((SheetIdItem) -> Void)?
    let onShowAllDeparturesRequested: ((AllDeparturesRequest) -> Void)?

    init(
        platform: ApiPlatform,
        departures: [ApiDeparture]?,
        primaryLabel: String? = nil,
        onRoutePreviewRequested: ((SheetIdItem) -> Void)? = nil,
        onShowAllDeparturesRequested: ((AllDeparturesRequest) -> Void)? = nil
    ) {
        self.platform = platform
        self.primaryLabel = primaryLabel
        self.onRoutePreviewRequested = onRoutePreviewRequested
        self.onShowAllDeparturesRequested = onShowAllDeparturesRequested

        guard let departures else {
            self.departures = nil
            return
        }

        self.departures = buildPlatformDepartureGroups(
            for: platform,
            departures: departures
        )
    }

    @ViewBuilder
    private var sectionHeader: some View {
        let firstLine = primaryLabel ?? defaultFirstLine
        let hasDirection = !(platform.direction?.isEmpty ?? true)

        VStack(alignment: .leading, spacing: 2) {
            Text(firstLine)

            if hasDirection, let direction = platform.direction {
                Label(direction, systemImage: "arrow.turn.down.right")
                    .labelStyle(.titleAndIcon)
                    .imageScale(.small)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var defaultFirstLine: String {
        if let code = platform.code, !code.isEmpty {
            return "\(platform.name) \(code)"
        }
        return platform.name
    }

    var body: some View {
        if departures == nil || departures!.count > 0 {
            Section(header: sectionHeader) {
                if let departures {
                    ForEach(departures, id: \.first?.id) { deps in
                        let departure = deps.count > 0 ? deps[0] : nil
                        let nextDeparture = deps.count > 1 ? deps[1] : nil

                        if let departure {
                            let routeColor = getRouteColor(
                                routeName: departure.route,
                                routeId: departure.routeId,
                                routeColor: departure.routeColor,
                                availableRoutes: platform.routes
                            )
                            ClosestStopPageListItemView(
                                routeLabel: departure.route,
                                routeLabelBackground: routeColor,
                                headsign: departure.headsign,
                                departure: departure.departure.predicted,
                                nextHeadsign: nextDeparture?.headsign,
                                nextDeparture: nextDeparture?.departure.predicted
                            )
                            .contextMenu {
                                if let routeId = departure.routeId {
                                    Button {
                                        onRoutePreviewRequested?(
                                            SheetIdItem(
                                                id: routeId,
                                                headsign: departure.headsign,
                                                currentPlatformId: platform.id,
                                                currentPlatformName: platform.name
                                            )
                                        )
                                    } label: {
                                        Label("Show route", systemImage: "map")
                                    }

                                    Button {
                                        onShowAllDeparturesRequested?(
                                            AllDeparturesRequest(
                                                platform: platform,
                                                routeFilter: AllDeparturesRequest.RouteFilter(
                                                    routeId: routeId,
                                                    headsign: departure.headsign
                                                )
                                            )
                                        )
                                    } label: {
                                        Label("Show all departures", systemImage: "list.bullet.clipboard")
                                    }

                                    #if !targetEnvironment(macCatalyst)
                                        if #available(iOS 16.2, *) {
                                            Button {
                                                let dep = departure
                                                let next = nextDeparture
                                                let plat = platform
                                                Task { @MainActor in
                                                    await DeparturesLiveActivityManager.shared.start(
                                                        stopName: plat.name,
                                                        stopId: nil,
                                                        platformId: plat.id,
                                                        platformName: plat.name,
                                                        platformCode: plat.code,
                                                        routeId: routeId,
                                                        routeName: dep.route,
                                                        headsign: dep.headsign,
                                                        initialDeparture: dep.departure.predicted,
                                                        initialNextHeadsign: next?.headsign,
                                                        initialNextDeparture: next?.departure.predicted,
                                                        initialDelaySeconds: dep.delay,
                                                        initialIsRealtime: dep.isRealtime ?? false
                                                    )
                                                }
                                            } label: {
                                                Label("Show live activity", systemImage: "bolt.badge.clock")
                                            }
                                        }
                                    #endif
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
                            routeLabelBackground: getRouteColor(route)
                        )
                    }
                }
            }
        }
    }
}

#Preview {
    List {
        PlatformDeparturesListView(
            platform: PreviewData.cityStop.platforms[0],
            departures: PreviewData.departures,
            onRoutePreviewRequested: nil
        )
    }
}
