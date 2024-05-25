//
//  Author: Kryštof Krátký
//

import MapKit
import SwiftUI
import WidgetKit

struct metro_now_widgets: Widget {
    let kind: String = "metro_now_widgets"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) {
            entry in
            SmallWidgetView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Departures")
        .description("Metro departures from nearest station")
    }
}

#Preview(as: .systemSmall) {
    metro_now_widgets()
} timeline: {
    WidgetEntry(date: .now, stationName: "Dejvicka", departures: [])
}
