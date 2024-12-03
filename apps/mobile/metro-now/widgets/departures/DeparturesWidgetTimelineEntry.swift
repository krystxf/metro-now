// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
import WidgetKit

struct DeparturesWidgetTimelineEntry: TimelineEntry {
    let date: Date
    let closestStop: String
    let departures: [String]
    let location: CLLocation?
}
