//
//  Author: Kryštof Krátký
//

import WidgetKit

struct WidgetEntryDeparture {
    var departureDate: Date
    var direction: String
    var metroLine: String
}

struct WidgetEntry: TimelineEntry {
    var date: Date

    let stationName: String
    let departures: [WidgetEntryDeparture]
}
