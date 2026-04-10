// metro-now
// https://github.com/krystxf/metro-now

import WidgetKit

struct WidgetDepartureGroup: Hashable {
    let routeLabel: String
    let headsign: String
    let departureTime: Date
    let nextDepartureTime: Date?
}

struct DeparturesWidgetTimelineEntry: TimelineEntry {
    let date: Date
    let stopName: String
    let departures: [WidgetDepartureGroup]
}
