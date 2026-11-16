// metro-now
// https://github.com/krystxf/metro-now

import Foundation
import WidgetKit

private let departuresWidgetReloadInterval: TimeInterval = 45

/// One-second timeline entries so countdown / “Xs ago” advance without relying on `TimelineView` (animation
/// schedules are often idle on the home screen; periodic timelines are throttled).
private func secondStaggeredEntries(
    base: Date,
    stopName: String,
    departures: [WidgetDepartureGroup],
    seconds: Int = 60
) -> [DeparturesWidgetTimelineEntry] {
    (0 ..< seconds).map { i in
        DeparturesWidgetTimelineEntry(
            date: base.addingTimeInterval(TimeInterval(i)),
            stopName: stopName,
            departures: departures
        )
    }
}

struct DeparturesWidgetTimelineProvider: AppIntentTimelineProvider {
    func placeholder(in _: Context) -> DeparturesWidgetTimelineEntry {
        DeparturesWidgetTimelineEntry(
            date: .now,
            stopName: "Muzeum",
            departures: [
                WidgetDepartureGroup(routeLabel: "A", headsign: "Dejvická", departureTime: .now.addingTimeInterval(120), nextDepartureTime: .now.addingTimeInterval(480)),
                WidgetDepartureGroup(routeLabel: "A", headsign: "Depo Hostivař", departureTime: .now.addingTimeInterval(180), nextDepartureTime: .now.addingTimeInterval(540)),
                WidgetDepartureGroup(routeLabel: "C", headsign: "Háje", departureTime: .now.addingTimeInterval(240), nextDepartureTime: .now.addingTimeInterval(600)),
                WidgetDepartureGroup(routeLabel: "C", headsign: "Letňany", departureTime: .now.addingTimeInterval(300), nextDepartureTime: .now.addingTimeInterval(660)),
            ]
        )
    }

    func snapshot(
        for configuration: DeparturesWidgetConfigIntent,
        in _: Context
    ) async -> DeparturesWidgetTimelineEntry {
        DeparturesWidgetTimelineEntry(
            date: .now,
            stopName: configuration.station?.name ?? "Muzeum",
            departures: [
                WidgetDepartureGroup(routeLabel: "A", headsign: "Dejvická", departureTime: .now.addingTimeInterval(120), nextDepartureTime: .now.addingTimeInterval(480)),
                WidgetDepartureGroup(routeLabel: "C", headsign: "Háje", departureTime: .now.addingTimeInterval(180), nextDepartureTime: .now.addingTimeInterval(540)),
            ]
        )
    }

    func timeline(
        for configuration: DeparturesWidgetConfigIntent,
        in _: Context
    ) async -> Timeline<DeparturesWidgetTimelineEntry> {
        guard let metroStops = await DeparturesWidgetManager.fetchMetroStops() else {
            let at = Date()
            let entry = DeparturesWidgetTimelineEntry(date: at, stopName: "Error", departures: [])
            return Timeline(entries: [entry], policy: .after(at.addingTimeInterval(departuresWidgetReloadInterval)))
        }

        let targetStop: ApiStop? = if let selectedStation = configuration.station {
            metroStops.first { $0.id == selectedStation.id }
        } else if let location = DeparturesWidgetManager.currentLocation() {
            metroStops.min(by: {
                $0.distance(to: location) < $1.distance(to: location)
            })
        } else {
            nil
        }

        guard let stop = targetStop else {
            let at = Date()
            let entry = DeparturesWidgetTimelineEntry(date: at, stopName: "Unknown", departures: [])
            return Timeline(entries: [entry], policy: .after(at.addingTimeInterval(departuresWidgetReloadInterval)))
        }

        let platformIds = stop.platforms.filter(\.isMetro).map(\.id)
        let apiDepartures = await DeparturesWidgetManager.fetchDepartures(platformIds: platformIds)

        let metroLineOrder = ["A", "B", "C"]

        let rows = buildMetroDepartureRows(for: stop, departures: apiDepartures) ?? []
        let departures = rows
            .map { row in
                WidgetDepartureGroup(
                    routeLabel: row.routeLabel,
                    headsign: row.headsign,
                    departureTime: row.departure,
                    nextDepartureTime: row.nextDeparture
                )
            }
            .sorted { lhs, rhs in
                let lhsIndex = metroLineOrder.firstIndex(of: lhs.routeLabel.uppercased()) ?? metroLineOrder.count
                let rhsIndex = metroLineOrder.firstIndex(of: rhs.routeLabel.uppercased()) ?? metroLineOrder.count
                if lhsIndex != rhsIndex { return lhsIndex < rhsIndex }
                return lhs.headsign.localizedCompare(rhs.headsign) == .orderedAscending
            }

        let at = Date()
        let entries = secondStaggeredEntries(base: at, stopName: stop.name, departures: departures)
        // Reload when the last staggered second elapses so we fetch fresh departures and emit a new fan-out.
        return Timeline(entries: entries, policy: .after(at.addingTimeInterval(60)))
    }
}
