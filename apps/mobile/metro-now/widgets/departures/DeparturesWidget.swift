// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI
import WidgetKit

struct DeparturesWidget: Widget {
    let kind: String = "MetroDepartures"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: kind,
            intent: DeparturesWidgetConfigIntent.self,
            provider: DeparturesWidgetTimelineProvider()
        ) { entry in
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
        .description("Departures from the nearest metro station.")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}

#Preview("medium", as: .systemMedium) {
    DeparturesWidget()
} timeline: {
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

#Preview("large", as: .systemLarge) {
    DeparturesWidget()
} timeline: {
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
