// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
import SwiftUI
import WidgetKit

struct DeparturesWidget: Widget {
    let kind: String = "Widgets"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DeparturesWidgetTimelineProvider()) { entry in
            if #available(iOS 17.0, *) {
                DeparturesWidgetView(entry: entry)
                    .containerBackground(.fill.tertiary, for: .widget)
            } else {
                DeparturesWidgetView(entry: entry)
                    .padding()
                    .background()
            }
        }
        .configurationDisplayName("Metro Departures")
        .description("Show the closest metro stop dynamically.")
        .supportedFamilies([.systemLarge])
    }
}

#Preview("large", as: .systemLarge) {
    DeparturesWidget()
} timeline: {
    DeparturesWidgetTimelineEntry(
        date: .now,
        closestStop: "Muzeum",
        departures: [
            "Route A to Station 1 at 12:45 PM",
            "Route B to Station 2 at 12:50 PM",
        ],
        location: CLLocation(latitude: 50.08, longitude: 14.43)
    )
}
